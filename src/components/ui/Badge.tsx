import { cn } from '@/lib/utils';
import type { NumberStatus, PurchaseStatus } from '@/lib/types';

const styles: Record<string, string> = {
  available: 'bg-status-available-soft text-green-800',
  reserved: 'bg-status-reserved-soft text-amber-800',
  confirmed: 'bg-status-confirmed-soft text-red-800',
  canceled: 'bg-black/5 text-ink/50',
  expired: 'bg-slate-100 text-slate-600',
};

const labels: Record<string, string> = {
  available: 'Disponível',
  reserved: 'Aguardando',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
  expired: 'Expirado',
};

export function Badge({ status }: { status: NumberStatus | PurchaseStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  );
}
