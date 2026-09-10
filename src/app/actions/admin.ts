'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { PaymentMethod } from '@/lib/types';

interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, isAdmin: false as const };

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, isAdmin: !!adminRow };
}

export async function signIn(prevState: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) return { ok: false, error: 'Informe e-mail e senha.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) return { ok: false, error: 'E-mail ou senha inválidos.' };

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!adminRow) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Este usuário não tem acesso administrativo.' };
  }

  redirect('/admin');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function confirmPurchase(purchaseId: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Acesso negado.' };

  const { error } = await supabase.rpc('admin_set_purchase_status', {
    p_purchase_id: purchaseId,
    p_status: 'confirmed',
  });

  if (error) {
    if (/expir|encerramento|encerrada/i.test(error.message)) return { ok: false, error: error.message };
    return { ok: false, error: 'Não foi possível confirmar o pagamento.' };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

export async function cancelPurchase(purchaseId: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Acesso negado.' };

  const { error } = await supabase.rpc('admin_set_purchase_status', {
    p_purchase_id: purchaseId,
    p_status: 'canceled',
  });

  if (error) {
    if (/encerramento|encerrada/i.test(error.message)) return { ok: false, error: error.message };
    return { ok: false, error: 'Não foi possível cancelar/liberar esta compra.' };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true };
}

interface UpdatePurchaseInput {
  purchaseId: string;
  participantId: string;
  name: string;
  whatsapp: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

export async function updatePurchase(input: UpdatePurchaseInput): Promise<ActionResult> {
  const { isAdmin, supabase } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Acesso negado.' };

  if (!input.name.trim() || input.whatsapp.replace(/\D/g, '').length < 10) {
    return { ok: false, error: 'Confira o nome e o WhatsApp.' };
  }

  const { error } = await supabase.rpc('admin_update_purchase', {
    p_purchase_id: input.purchaseId,
    p_participant_id: input.participantId,
    p_name: input.name,
    p_whatsapp: input.whatsapp,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes,
  });

  if (error) {
    if (/encerramento/i.test(error.message)) {
      return { ok: false, error: 'Não é possível editar depois do encerramento da campanha.' };
    }
    if (/expired|canceled|expirad|cancelad/i.test(error.message)) {
      return { ok: false, error: 'Esta reserva está expirada ou cancelada e não pode mais ser editada.' };
    }
    if (/não pertence/i.test(error.message)) {
      return { ok: false, error: 'Este comprador não pertence a esta compra.' };
    }
    return { ok: false, error: 'Não foi possível salvar as alterações.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

interface UpdateCampaignInput {
  campaignId: string;
  title: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  ticketPrice: string;
  regulationText: string;
  authorizationNumber: string;
  pixReceiverName: string;
  pixKey: string;
  pixQrCodeUrl: string;
  paymentInstructions: string;
  whatsappNumber: string;
  reservationHoldHours: string;
}

export async function updateCampaignSettings(input: UpdateCampaignInput): Promise<ActionResult> {
  const { isAdmin, supabase } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Acesso negado.' };

  const price = Number(String(input.ticketPrice).replace(',', '.'));
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'Informe um valor válido por número.' };
  }

  const holdHours = Number.parseInt(input.reservationHoldHours, 10);
  if (!Number.isInteger(holdHours) || holdHours < 1 || holdHours > 168) {
    return { ok: false, error: 'O prazo de reserva deve ficar entre 1 e 168 horas.' };
  }

  const { error: e1 } = await supabase
    .from('campaigns')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      image_url: input.imageUrl.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      ticket_price: price,
      regulation_text: input.regulationText,
      authorization_number: input.authorizationNumber.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.campaignId);

  if (e1) {
    if (/bloquead|sorteio/i.test(e1.message)) {
      return { ok: false, error: 'Datas, valor por número e quantidade ficam bloqueados depois que a prova do sorteio é criada.' };
    }
    return { ok: false, error: 'Não foi possível salvar os dados da campanha.' };
  }

  const { error: e2 } = await supabase.from('settings').upsert(
    {
      campaign_id: input.campaignId,
      pix_receiver_name: input.pixReceiverName.trim() || null,
      pix_key: input.pixKey.trim() || null,
      pix_qr_code_url: input.pixQrCodeUrl.trim() || null,
      payment_instructions: input.paymentInstructions.trim() || null,
      whatsapp_number: input.whatsappNumber.trim() || null,
      reservation_hold_hours: holdHours,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'campaign_id' }
  );

  if (e2) return { ok: false, error: 'Campanha salva, mas houve erro ao salvar os dados de pagamento.' };

  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { ok: true };
}

export async function lockDraw(campaignId: string): Promise<ActionResult> {
  const { isAdmin, supabase } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: 'Acesso negado.' };

  const { error } = await supabase.rpc('lock_campaign_draw', { p_campaign_id: campaignId });
  if (error) {
    return { ok: false, error: error.message || 'Não foi possível bloquear o sorteio.' };
  }

  revalidatePath('/admin/settings');
  revalidatePath('/');
  return { ok: true };
}
