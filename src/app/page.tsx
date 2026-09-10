import { createClient } from '@/lib/supabase/server';
import { CampaignHeader } from '@/components/public/CampaignHeader';
import { CampaignExperience } from '@/components/public/CampaignExperience';
import { DrawIntegrityCard } from '@/components/public/DrawIntegrityCard';
import type { Campaign, PublicSettings, RaffleNumber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: initialCampaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Campaign>();

  if (!initialCampaign) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Nenhuma campanha ativa</h1>
          <p className="mt-2 text-sm text-ink/60">
            Configure e ative uma campanha no painel administrativo em{' '}
            <a href="/admin" className="text-gold underline">/admin</a>.
          </p>
        </div>
      </main>
    );
  }

  // Libera reservas vencidas no servidor e revela a prova somente após o encerramento.
  await supabase.rpc('release_expired_purchases', { p_campaign_id: initialCampaign.id });
  await supabase.rpc('reveal_draw_if_due', { p_campaign_id: initialCampaign.id });

  const [{ data: campaign }, { data: numbers }, { data: settings }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', initialCampaign.id).single<Campaign>(),
    supabase
      .from('numbers')
      .select('id, campaign_id, number, status, purchase_id, updated_at')
      .eq('campaign_id', initialCampaign.id)
      .returns<RaffleNumber[]>(),
    supabase
      .from('public_settings')
      .select('*')
      .eq('campaign_id', initialCampaign.id)
      .maybeSingle<PublicSettings>(),
  ]);

  const activeCampaign = campaign ?? initialCampaign;

  return (
    <main className="min-h-screen pb-16 max-w-lg mx-auto">
      <CampaignHeader campaign={activeCampaign} />
      <DrawIntegrityCard campaign={activeCampaign} />

      <CampaignExperience
        campaign={activeCampaign}
        initialNumbers={numbers ?? []}
        settings={settings ?? null}
      />

      <footer className="px-5 mt-10 space-y-3">
        {activeCampaign.authorization_number && (
          <p className="text-xs text-ink/40">
            Promoção autorizada — certificado nº {activeCampaign.authorization_number}
          </p>
        )}
        {activeCampaign.regulation_text && (
          <details className="text-xs text-ink/50">
            <summary className="cursor-pointer select-none font-medium text-ink/60">
              Regulamento da promoção
            </summary>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{activeCampaign.regulation_text}</p>
          </details>
        )}
      </footer>
    </main>
  );
}
