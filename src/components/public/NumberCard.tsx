'use client';

import { cn, formatNumber } from '@/lib/utils';
import type { NumberStatus } from '@/lib/types';

const statusClasses: Record<NumberStatus, string> = {
  available: 'bg-status-available/15 text-green-800 hover:bg-status-available/25 active:scale-95',
  reserved: 'bg-status-reserved/20 text-amber-800 cursor-not-allowed',
  confirmed: 'bg-status-confirmed/20 text-red-800 cursor-not-allowed',
};

export function NumberCard({
  number,
  status,
  selected,
  disabled,
  onToggle,
}: {
  number: number;
  status: NumberStatus;
  selected: boolean;
  disabled?: boolean;
  onToggle: (n: number) => void;
}) {
  const isAvailable = status === 'available' && !disabled;

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => isAvailable && onToggle(number)}
      aria-pressed={selected}
      aria-label={`Número ${formatNumber(number)} — ${status}`}
      className={cn(
        'aspect-square w-full rounded-lg text-[12px] sm:text-sm font-semibold font-display transition-all border',
        selected
          ? 'bg-gold text-ink border-gold shadow-sm ring-2 ring-gold/30 scale-[1.03]'
          : `${statusClasses[status]} border-transparent`,
        disabled && status === 'available' && 'opacity-45 cursor-not-allowed'
      )}
    >
      {formatNumber(number)}
    </button>
  );
}
