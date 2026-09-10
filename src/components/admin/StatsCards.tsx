import { formatCurrencyBR } from '@/lib/utils';

const CARD_STYLES: Record<string, string> = {
  total: 'bg-ink text-white',
  available: 'bg-status-available-soft text-green-900',
  reserved: 'bg-status-reserved-soft text-amber-900',
  sold: 'bg-gold/20 text-amber-950',
  buyers: 'bg-blue-50 text-blue-900',
  revenue: 'bg-status-confirmed-soft text-red-900',
};

export function StatsCards({
  total,
  available,
  reserved,
  sold,
  buyers,
  revenue,
}: {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  buyers: number;
  revenue: number;
}) {
  const items = [
    { key: 'total', label: 'Total de números', value: String(total) },
    { key: 'available', label: 'Disponíveis', value: String(available) },
    { key: 'reserved', label: 'Reservados / aguardando', value: String(reserved) },
    { key: 'sold', label: 'Vendidos / confirmados', value: String(sold) },
    { key: 'buyers', label: 'Compradores ativos', value: String(buyers) },
    { key: 'revenue', label: 'Arrecadado confirmado', value: formatCurrencyBR(revenue) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.key} className={`rounded-2xl p-4 ${CARD_STYLES[item.key]}`}>
          <p className="text-xl sm:text-2xl font-display font-semibold">{item.value}</p>
          <p className="text-xs mt-1 opacity-80">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
