'use client';

import { NumberCard } from './NumberCard';
import type { RaffleNumber } from '@/lib/types';

export function NumberGrid({
  numbers,
  selectedNumbers,
  onToggle,
  disabled = false,
}: {
  numbers: RaffleNumber[];
  selectedNumbers: number[];
  onToggle: (n: number) => void;
  disabled?: boolean;
}) {
  const selectedSet = new Set(selectedNumbers);

  return (
    <div className="px-5 mt-4">
      <p className="text-sm font-medium text-ink mb-3">Escolha um ou mais números</p>
      <div className="grid grid-cols-5 xs:grid-cols-8 sm:grid-cols-10 gap-2">
        {numbers
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((n) => (
            <NumberCard
              key={n.id}
              number={n.number}
              status={n.status}
              selected={selectedSet.has(n.number)}
              disabled={disabled}
              onToggle={onToggle}
            />
          ))}
      </div>
    </div>
  );
}
