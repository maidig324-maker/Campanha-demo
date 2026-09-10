export function AvailabilityBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const soldPct = 100 - pct;

  return (
    <div className="px-5 mt-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm text-ink/70">
          <span className="font-display font-semibold text-ink text-base">{available}</span> de{' '}
          {total} disponíveis
        </p>
        <p className="text-xs text-ink/50">{soldPct}% já escolhidos</p>
      </div>
      <div className="h-2.5 w-full rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-status-reserved to-status-confirmed transition-all duration-500"
          style={{ width: `${soldPct}%` }}
        />
      </div>
    </div>
  );
}
