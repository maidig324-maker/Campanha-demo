const items = [
  { color: 'bg-status-available', label: 'Disponível' },
  { color: 'bg-status-reserved', label: 'Reservado' },
  { color: 'bg-status-confirmed', label: 'Confirmado' },
];

export function Legend() {
  return (
    <div className="px-5 mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-ink/70">
          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
