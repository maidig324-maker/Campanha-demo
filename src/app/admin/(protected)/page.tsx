import { createClient } from '@/lib/supabase/server';
import { StatsCards } from '@/components/admin/StatsCards';
import { ParticipantsTable } from '@/components/admin/ParticipantsTable';
import { AdminAutoRefresh } from '@/components/admin/AdminAutoRefresh';
import type { Campaign, PurchaseRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Campaign>();

  if (!campaign) {
    return (
      <p className="text-ink/60">
        Nenhuma campanha encontrada. Rode o script <code>supabase/schema.sql</code> para criar a primeira campanha.
      </p>
    );
  }

  await supabase.rpc('release_expired_purchases', { p_campaign_id: campaign.id });

  const { data: numbers } = await supabase
    .from('numbers')
    .select('status')
    .eq('campaign_id', campaign.id);

  const total = numbers?.length ?? 0;
  const available = numbers?.filter((n) => n.status === 'available').length ?? 0;
  const reserved = numbers?.filter((n) => n.status === 'reserved').length ?? 0;
  const sold = numbers?.filter((n) => n.status === 'confirmed').length ?? 0;

  const { data: purchaseRows } = await supabase
    .from('purchases')
    .select(
      'id, status, payment_method, total_amount, notes, created_at, confirmed_at, expires_at, participant_id, participants(name, whatsapp), purchase_numbers(number_id, numbers(id, number))'
    )
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false });

  const rows: PurchaseRow[] = (purchaseRows ?? []).map((p: any) => {
    const items = (p.purchase_numbers ?? [])
      .map((item: any) => ({ id: item.numbers?.id ?? item.number_id, number: item.numbers?.number }))
      .filter((item: any) => typeof item.number === 'number')
      .sort((a: any, b: any) => a.number - b.number);

    return {
      purchase_id: p.id,
      participant_id: p.participant_id,
      name: p.participants?.name ?? '',
      whatsapp: p.participants?.whatsapp ?? '',
      numbers: items.map((item: any) => item.number),
      number_ids: items.map((item: any) => item.id),
      quantity: items.length,
      payment_method: p.payment_method,
      status: p.status,
      total_amount: Number(p.total_amount ?? 0),
      notes: p.notes ?? '',
      expires_at: p.expires_at ?? null,
      created_at: p.created_at,
      confirmed_at: p.confirmed_at,
    };
  });

  const activeRows = rows.filter((row) => !['canceled', 'expired'].includes(row.status));
  const buyers = new Set(activeRows.map((row) => row.participant_id)).size;
  const revenue = rows
    .filter((row) => row.status === 'confirmed')
    .reduce((sum, row) => sum + row.total_amount, 0);

  return (
    <div className="space-y-6">
      <AdminAutoRefresh />
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">{campaign.title}</h1>
        <p className="text-sm text-ink/50">Painel único do responsável</p>
      </div>

      <StatsCards
        total={total}
        available={available}
        reserved={reserved}
        sold={sold}
        buyers={buyers}
        revenue={revenue}
      />

      <ParticipantsTable rows={rows} />
    </div>
  );
}
