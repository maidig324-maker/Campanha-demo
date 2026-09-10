'use client';

import Image from 'next/image';
import { useState } from 'react';
import { formatCurrencyBR } from '@/lib/utils';
import type { PixInfo } from '@/lib/types';

/**
 * Recebe os dados de Pix já resolvidos pelo servidor na resposta de uma
 * reserva bem-sucedida — nunca busca nem recebe esses dados antes disso.
 */
export function PixPanel({ pix, amount }: { pix: PixInfo | null; amount: number }) {
  const [copied, setCopied] = useState<'pix' | 'amount' | null>(null);

  const copy = async (value: string, kind: 'pix' | 'amount') => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  };

  if (!pix || (!pix.pix_key && !pix.pix_qr_code_url)) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        <p className="font-semibold">Valor da reserva: {formatCurrencyBR(amount)}</p>
        <p className="mt-1">Os dados do Pix ainda não foram configurados. Combine o pagamento pelo WhatsApp após reservar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 p-4 space-y-3">
      <div className="rounded-xl bg-gold/10 border border-gold/25 p-3">
        <p className="text-[11px] uppercase tracking-wide text-ink/50">Pague exatamente</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <strong className="font-display text-2xl text-ink">{formatCurrencyBR(amount)}</strong>
          <button
            type="button"
            onClick={() => copy(amount.toFixed(2).replace('.', ','), 'amount')}
            className="shrink-0 text-xs font-medium text-ink bg-white rounded-full px-3 py-1 border border-black/10 hover:bg-black/5"
          >
            {copied === 'amount' ? 'Copiado!' : 'Copiar valor'}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink/55">O responsável confirmará os números somente após conferir este valor recebido.</p>
      </div>

      {pix.pix_qr_code_url && (
        <div className="relative mx-auto h-40 w-40">
          <Image
            src={pix.pix_qr_code_url}
            alt="QR Code Pix"
            fill
            className="object-contain rounded-lg"
            sizes="160px"
          />
        </div>
      )}

      {pix.pix_receiver_name && (
        <p className="text-sm text-ink/70">
          Recebedor: <span className="font-medium text-ink">{pix.pix_receiver_name}</span>
        </p>
      )}

      {pix.pix_key && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-black/5 px-3 py-2">
          <span className="text-sm font-mono text-ink truncate">{pix.pix_key}</span>
          <button
            type="button"
            onClick={() => copy(pix.pix_key!, 'pix')}
            className="shrink-0 text-xs font-medium text-ink bg-white rounded-full px-3 py-1 border border-black/10 hover:bg-black/5"
          >
            {copied === 'pix' ? 'Copiado!' : 'Copiar Pix'}
          </button>
        </div>
      )}

      {pix.payment_instructions && (
        <p className="text-sm text-ink/70 whitespace-pre-line">{pix.payment_instructions}</p>
      )}
    </div>
  );
}
