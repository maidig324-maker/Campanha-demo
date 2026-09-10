'use client';

import { useMemo, useState } from 'react';
import { StatsCards } from '@/components/admin/StatsCards';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { formatCurrencyBR, formatNumber, formatDateTimeBR } from '@/lib/utils';
import {
  buildDemoNumbers,
  buildDemoPurchases,
  DEMO_TOTAL_NUMBERS,
  type DemoPurchase,
} from '@/lib/demo/data';
import type { PurchaseStatus } from '@/lib/types';

const FILTERS: { value: PurchaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'reserved', label: 'Aguardando' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'canceled', label: 'Cancelados' },
];

/**
 * Painel administrativo de demonstração. Todas as ações (confirmar,
 * cancelar, buscar, filtrar) alteram só o estado local desta página — nada é
 * gravado em qualquer banco, e a produção nunca é tocada.
 */
export function DemoAdminPanel() {
  const [purchases, setPurchases] = useState<DemoPurchase[]>(() => buildDemoPurchases());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PurchaseStatus | 'all'>('all');

  const reservedOrConfirmedNumbers = useMemo(() => {
    const map = new Map<number, PurchaseStatus>();
    purchases.forEach((p) => {
      if (p.status === 'reserved' || p.status === 'confirmed') {
        p.numbers.forEach((n) => map.set(n, p.status));
      }
    });
    return map;
  }, [purchases]);

  const stats = useMemo(() => {
    const statusByNumber = reservedOrConfirmedNumbers;
    const reserved = Array.from(statusByNumber.values()).filter((s) => s === 'reserved').length;
    const sold = Array.from(statusByNumber.values()).filter((s) => s === 'confirmed').length;
    const available = DEMO_TOTAL_NUMBERS - reserved - sold;
    const buyers = purchases.filter((p) => p.status !== 'canceled' && p.status !== 'expired').length;
    const revenue = purchases.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + p.total_amount, 0);
    return { total: DEMO_TOTAL_NUMBERS, available, reserved, sold, buyers, revenue };
  }, [reservedOrConfirmedNumbers, purchases]);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.whatsapp.includes(q) ||
        p.numbers.some((n) => formatNumber(n).includes(q))
      );
    });
  }, [purchases, search, filter]);

  const confirm = (id: string) => {
    setPurchases((prev) => prev.map((p) => (p.purchase_id === id ? { ...p, status: 'confirmed' } : p)));
  };

  const cancel = (id: string) => {
    if (!window.confirm('Cancelar esta reserva de demonstração e liberar os números?')) return;
    setPurchases((prev) => prev.map((p) => (p.purchase_id === id ? { ...p, status: 'canceled' } : p)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Rifa Premiada — painel (demo)</h1>
        <p className="text-sm text-ink/50">
          Ações aqui alteram só esta demonstração — nada é gravado em produção.
        </p>
      </div>

      <StatsCards
        total={stats.total}
        available={stats.available}
        reserved={stats.reserved}
        sold={stats.sold}
        buyers={stats.buyers}
        revenue={stats.revenue}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome, WhatsApp ou número"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                filter === f.value ? 'bg-ink text-white border-ink' : 'border-black/10 text-ink/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-ink/60 text-left">
            <tr>
              <th className="px-3 py-2.5 font-medium">Comprador</th>
              <th className="px-3 py-2.5 font-medium">Números</th>
              <th className="px-3 py-2.5 font-medium">Qtd.</th>
              <th className="px-3 py-2.5 font-medium">Pagamento</th>
              <th className="px-3 py-2.5 font-medium">Valor</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Vencimento</th>
              <th className="px-3 py-2.5 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((p) => (
              <tr key={p.purchase_id} className="align-top">
                <td className="px-3 py-3 min-w-[170px]">
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{p.whatsapp}</p>
                </td>
                <td className="px-3 py-3 min-w-[160px] font-display text-xs leading-relaxed">
                  {p.numbers.map((n) => formatNumber(n)).join(', ')}
                </td>
                <td className="px-3 py-3 font-semibold">{p.numbers.length}</td>
                <td className="px-3 py-3 capitalize">{p.payment_method}</td>
                <td className="px-3 py-3 whitespace-nowrap font-medium">{formatCurrencyBR(p.total_amount)}</td>
                <td className="px-3 py-3"><Badge status={p.status} /></td>
                <td className="px-3 py-3 whitespace-nowrap text-ink/60 text-xs">
                  {p.status === 'reserved' && p.expires_at ? formatDateTimeBR(p.expires_at) : '—'}
                </td>
                <td className="px-3 py-3 min-w-[190px]">
                  <div className="flex flex-wrap gap-1.5">
                    {p.status === 'reserved' && (
                      <>
                        <Button size="sm" variant="success" onClick={() => confirm(p.purchase_id)}>
                          Confirmar pagamento
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancel(p.purchase_id)}>
                          Cancelar
                        </Button>
                      </>
                    )}
                    {p.status === 'confirmed' && (
                      <Button size="sm" variant="ghost" onClick={() => cancel(p.purchase_id)}>
                        Liberar (demo)
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-ink/40">Nenhum comprador encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
