'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { EditReservationModal } from './EditReservationModal';
import { confirmPurchase, cancelPurchase } from '@/app/actions/admin';
import { formatCurrencyBR, formatNumber, formatDateTimeBR } from '@/lib/utils';
import type { PurchaseRow, PurchaseStatus } from '@/lib/types';

const FILTERS: { value: PurchaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'reserved', label: 'Aguardando' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'canceled', label: 'Cancelados' },
  { value: 'expired', label: 'Expirados' },
];

export function ParticipantsTable({ rows }: { rows: PurchaseRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PurchaseStatus | 'all'>('all');
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.whatsapp.includes(q) ||
        row.numbers.some((n) => formatNumber(n).includes(q))
      );
    });
  }, [rows, search, filter]);


  const buyerSummaries = useMemo(() => {
    const map = new Map<string, {
      participantId: string;
      name: string;
      whatsapp: string;
      numbers: number[];
      reserved: number;
      confirmed: number;
      confirmedValue: number;
      methods: Set<string>;
    }>();

    rows.filter((row) => !['canceled', 'expired'].includes(row.status)).forEach((row) => {
      const current = map.get(row.participant_id) ?? {
        participantId: row.participant_id,
        name: row.name,
        whatsapp: row.whatsapp,
        numbers: [],
        reserved: 0,
        confirmed: 0,
        confirmedValue: 0,
        methods: new Set<string>(),
      };
      current.name = row.name;
      current.whatsapp = row.whatsapp;
      current.numbers.push(...row.numbers);
      if (row.status === 'reserved') current.reserved += row.quantity;
      if (row.status === 'confirmed') {
        current.confirmed += row.quantity;
        current.confirmedValue += row.total_amount;
      }
      current.methods.add(row.payment_method);
      map.set(row.participant_id, current);
    });

    return Array.from(map.values())
      .map((buyer) => ({ ...buyer, numbers: Array.from(new Set(buyer.numbers)).sort((a, b) => a - b) }))
      .sort((a, b) => b.numbers.length - a.numbers.length || a.name.localeCompare(b.name));
  }, [rows]);

  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setPendingId(id);
    startTransition(async () => {
      const result = await fn();
      setPendingId(null);
      if (!result.ok && result.error) alert(result.error);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

      {buyerSummaries.length > 0 && (
        <div className="mb-5 overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/5 px-4 py-3">
            <h2 className="font-display font-semibold text-ink">Resumo por comprador</h2>
            <p className="mt-0.5 text-xs text-ink/45">Agrupa todas as reservas ativas e confirmadas da mesma pessoa.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-ink/60">
              <tr>
                <th className="px-3 py-2.5 font-medium">Comprador</th>
                <th className="px-3 py-2.5 font-medium">Total de números</th>
                <th className="px-3 py-2.5 font-medium">Confirmados</th>
                <th className="px-3 py-2.5 font-medium">Aguardando</th>
                <th className="px-3 py-2.5 font-medium">Pagamento</th>
                <th className="px-3 py-2.5 font-medium">Valor confirmado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {buyerSummaries.map((buyer) => (
                <tr key={buyer.participantId}>
                  <td className="px-3 py-3 min-w-[170px]">
                    <p className="font-medium text-ink">{buyer.name}</p>
                    <p className="text-xs text-ink/50">{buyer.whatsapp}</p>
                    <p className="mt-1 max-w-[320px] text-[11px] leading-relaxed text-ink/45">
                      {buyer.numbers.map((n) => formatNumber(n)).join(', ')}
                    </p>
                  </td>
                  <td className="px-3 py-3 font-semibold">{buyer.numbers.length}</td>
                  <td className="px-3 py-3 text-green-700 font-medium">{buyer.confirmed}</td>
                  <td className="px-3 py-3 text-amber-700 font-medium">{buyer.reserved}</td>
                  <td className="px-3 py-3 capitalize">{buyer.methods.size > 1 ? 'Misto' : Array.from(buyer.methods)[0]}</td>
                  <td className="px-3 py-3 whitespace-nowrap font-medium">{formatCurrencyBR(buyer.confirmedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 font-display font-semibold text-ink">Compras e reservas</h2>

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
              <th className="px-3 py-2.5 font-medium">Data</th>
              <th className="px-3 py-2.5 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((row) => (
              <tr key={row.purchase_id} className="align-top">
                <td className="px-3 py-3 min-w-[170px]">
                  <p className="font-medium text-ink">{row.name}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{row.whatsapp}</p>
                  {row.notes && <p className="text-xs text-ink/45 mt-1 max-w-[220px]">{row.notes}</p>}
                </td>
                <td className="px-3 py-3 min-w-[220px] font-display text-xs leading-relaxed">
                  {row.numbers.map((n) => formatNumber(n)).join(', ')}
                </td>
                <td className="px-3 py-3 font-semibold">{row.quantity}</td>
                <td className="px-3 py-3 capitalize">{row.payment_method}</td>
                <td className="px-3 py-3 whitespace-nowrap font-medium">{formatCurrencyBR(row.total_amount)}</td>
                <td className="px-3 py-3"><Badge status={row.status} /></td>
                <td className="px-3 py-3 whitespace-nowrap text-ink/60">
                  <p>{formatDateTimeBR(row.created_at)}</p>
                  {row.status === 'reserved' && row.expires_at && (
                    <p className="mt-1 text-[11px] text-amber-700">Expira: {formatDateTimeBR(row.expires_at)}</p>
                  )}
                </td>
                <td className="px-3 py-3 min-w-[190px]">
                  <div className="flex flex-wrap gap-1.5">
                    {row.status === 'reserved' && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          disabled={isPending && pendingId === row.purchase_id}
                          onClick={() => run(row.purchase_id, () => confirmPurchase(row.purchase_id))}
                        >
                          Confirmar pagamento
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending && pendingId === row.purchase_id}
                          onClick={() => {
                            if (window.confirm('Cancelar esta compra e liberar todos os números?')) {
                              run(row.purchase_id, () => cancelPurchase(row.purchase_id));
                            }
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {row.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending && pendingId === row.purchase_id}
                        onClick={() => {
                          if (window.confirm('Esta compra está confirmada. Liberar todos os números e marcar como cancelada?')) {
                            run(row.purchase_id, () => cancelPurchase(row.purchase_id));
                          }
                        }}
                      >
                        Liberar compra
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={row.status === 'expired' || row.status === 'canceled'}
                      title={
                        row.status === 'expired' || row.status === 'canceled'
                          ? 'Reservas expiradas ou canceladas não podem mais ser editadas'
                          : undefined
                      }
                      onClick={() => setEditing(row)}
                    >
                      Editar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-ink/40">Nenhuma compra encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditReservationModal row={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
