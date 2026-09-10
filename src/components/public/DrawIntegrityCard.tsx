'use client';

import { useEffect, useState } from 'react';
import { formatDateTimeBR, formatNumber, sha256Hex } from '@/lib/utils';
import type { Campaign } from '@/lib/types';

export function DrawIntegrityCard({ campaign }: { campaign: Campaign }) {
  const [verification, setVerification] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  useEffect(() => {
    if (!campaign.draw_commitment || !campaign.draw_nonce || !campaign.draw_order?.length) return;

    setVerification('checking');
    const payload = `${campaign.id}|${campaign.total_numbers}|${campaign.end_date}|${campaign.draw_order.join(',')}|${campaign.draw_nonce}`;

    sha256Hex(payload)
      .then((hash) => setVerification(hash === campaign.draw_commitment ? 'valid' : 'invalid'))
      .catch(() => setVerification('invalid'));
  }, [campaign]);

  if (!campaign.draw_commitment || !campaign.draw_locked_at) {
    return (
      <section className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-display font-semibold text-amber-900">Prova do sorteio ainda não criada</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
          As reservas ficam bloqueadas até o responsável gerar a prova criptográfica pública.
        </p>
      </section>
    );
  }

  const revealed = !!campaign.draw_revealed_at && !!campaign.draw_nonce && !!campaign.draw_order?.length;

  return (
    <section className="mx-5 mt-5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800" aria-hidden>
          🔒
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-ink">Sorteio com prova de integridade</p>
          {!revealed ? (
            <p className="mt-1 text-sm leading-relaxed text-ink/65">
              Uma ordem secreta com todos os números foi bloqueada antes das reservas. O código público abaixo permite verificar depois que essa ordem não foi trocada.
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-xs uppercase tracking-wide text-ink/45">Resultado revelado</p>
              {campaign.winning_number !== null ? (
                <p className="mt-1 font-display text-3xl font-bold text-ink">{formatNumber(campaign.winning_number)}</p>
              ) : (
                <p className="mt-1 text-sm font-semibold text-ink/65">Nenhum número confirmado elegível.</p>
              )}
              <p className="mt-1 text-xs leading-relaxed text-ink/50">
                Vence o primeiro número confirmado encontrado na ordem secreta criada antes das vendas.
              </p>
              <p className={`mt-2 text-sm font-medium ${verification === 'valid' ? 'text-green-700' : verification === 'invalid' ? 'text-red-700' : 'text-ink/55'}`}>
                {verification === 'checking' && 'Verificando a prova criptográfica...'}
                {verification === 'valid' && '✓ Prova verificada: a ordem revelada confere com o código publicado.'}
                {verification === 'invalid' && '⚠ A ordem revelada não confere com o código publicado.'}
              </p>
            </div>
          )}

          <div className="mt-3 rounded-xl bg-black/[0.035] p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink/45">Código público de verificação (SHA-256)</p>
            <code className="mt-1 block break-all text-[11px] leading-relaxed text-ink/75">{campaign.draw_commitment}</code>
          </div>

          {revealed && campaign.draw_order && (
            <details className="mt-3 rounded-xl border border-black/5 p-3 text-xs text-ink/60">
              <summary className="cursor-pointer font-medium text-ink/70">Ver dados usados na verificação</summary>
              <p className="mt-2 break-all"><strong>Nonce:</strong> {campaign.draw_nonce}</p>
              <p className="mt-2 leading-relaxed"><strong>Ordem:</strong> {campaign.draw_order.map((n) => formatNumber(n)).join(', ')}</p>
            </details>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
            Bloqueado em {formatDateTimeBR(campaign.draw_locked_at)}. A prova torna alterações posteriores detectáveis no sistema, mas não substitui autorização ou auditoria externa quando exigida.
          </p>
        </div>
      </div>
    </section>
  );
}
