'use client';

import { Button } from '@/components/ui/Button';
import { formatCurrencyBR } from '@/lib/utils';

export function SelectionBar({
  quantity,
  ticketPrice,
  onContinue,
}: {
  quantity: number;
  ticketPrice: number;
  onContinue: () => void;
}) {
  if (quantity === 0) return null;

  return (
    <div className="sticky bottom-3 z-20 px-5 mt-5">
      <div className="rounded-2xl bg-ink text-white p-3 shadow-xl border border-white/10 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/55">Sua seleção</p>
          <p className="font-display font-semibold">
            {quantity} {quantity === 1 ? 'número' : 'números'} · {formatCurrencyBR(quantity * ticketPrice)}
          </p>
        </div>
        <Button size="sm" onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
