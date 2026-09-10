'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyTurnstileToken } from '@/lib/turnstile';
import type { PaymentMethod, PixInfo } from '@/lib/types';

interface CreatePurchaseInput {
  campaignId: string;
  numbers: number[];
  name: string;
  whatsapp: string;
  paymentMethod: PaymentMethod;
  turnstileToken: string | null;
}

interface ActionResult {
  ok: boolean;
  error?: string;
  purchaseId?: string;
  quantity?: number;
  totalAmount?: number;
  expiresAt?: string;
  /** Só vem preenchido aqui — nunca é buscado antes de a reserva existir. */
  pix?: PixInfo;
}

/**
 * Cria a reserva. A partir desta versão, `create_purchase` não tem mais
 * EXECUTE para anon/authenticated no banco — só quem tem a chave secreta
 * (service_role) consegue chamá-la. Por isso esta Server Action usa
 * createServiceClient() em vez do cliente comum baseado em cookies, e só
 * chega a chamar o RPC depois que o Turnstile validar o pedido no servidor.
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<ActionResult> {
  const { campaignId, numbers, name, whatsapp, paymentMethod, turnstileToken } = input;
  const uniqueNumbers = Array.from(new Set(numbers)).sort((a, b) => a - b);

  if (!name.trim() || !whatsapp.trim()) {
    return { ok: false, error: 'Preencha nome e WhatsApp.' };
  }
  if (whatsapp.replace(/\D/g, '').length < 10) {
    return { ok: false, error: 'Informe um WhatsApp válido com DDD.' };
  }
  if (uniqueNumbers.length === 0) {
    return { ok: false, error: 'Escolha pelo menos um número.' };
  }
  if (!['pix', 'dinheiro'].includes(paymentMethod)) {
    return { ok: false, error: 'Forma de pagamento inválida.' };
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get('x-forwarded-for');
  const remoteIp = forwardedFor?.split(',')[0]?.trim();

  const verification = await verifyTurnstileToken(turnstileToken, remoteIp);
  if (!verification.success) {
    return {
      ok: false,
      error: 'Não foi possível confirmar a verificação de segurança. Atualize a página e tente novamente.',
    };
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('create_purchase', {
    p_campaign_id: campaignId,
    p_numbers: uniqueNumbers,
    p_name: name,
    p_whatsapp: whatsapp,
    p_payment_method: paymentMethod,
  });

  if (error) {
    if (error.code === '23505' || /indisponível|indisponivel|escolhido|reservado/i.test(error.message)) {
      return {
        ok: false,
        error: 'Um dos números selecionados acabou de ser reservado por outra pessoa. Atualize a página e escolha novamente.',
      };
    }
    if (/prova|bloqueio|sorteio/i.test(error.message)) {
      return { ok: false, error: 'As reservas ainda não foram liberadas pelo responsável.' };
    }
    if (/encerrada|fora do período|fora do periodo/i.test(error.message)) {
      return { ok: false, error: 'Esta campanha não está mais aceitando novas reservas.' };
    }
    return { ok: false, error: 'Não foi possível concluir a reserva. Tente novamente.' };
  }

  const row = Array.isArray(data) ? data[0] : data;

  revalidatePath('/');
  revalidatePath('/admin');

  return {
    ok: true,
    purchaseId: row?.purchase_id,
    quantity: Number(row?.quantity ?? uniqueNumbers.length),
    totalAmount: Number(row?.total_amount ?? 0),
    expiresAt: row?.expires_at ?? undefined,
    pix: {
      pix_receiver_name: row?.pix_receiver_name ?? null,
      pix_key: row?.pix_key ?? null,
      pix_qr_code_url: row?.pix_qr_code_url ?? null,
      payment_instructions: row?.payment_instructions ?? null,
    },
  };
}
