import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/admin/SettingsForm';
import type { Campaign, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Campaign>();

  if (!campaign) {
    return <p className="text-ink/60">Nenhuma campanha encontrada.</p>;
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('campaign_id', campaign.id)
    .maybeSingle<Settings>();

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink mb-6">Configurações</h1>
      <SettingsForm campaign={campaign} settings={settings} />
    </div>
  );
}
