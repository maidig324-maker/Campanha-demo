import Image from 'next/image';
import type { Campaign } from '@/lib/types';
import { formatCurrencyBR, formatDateBR, daysUntil } from '@/lib/utils';

export function CampaignHeader({ campaign }: { campaign: Campaign }) {
  const remaining = daysUntil(campaign.end_date);
  const remainingLabel =
    remaining > 1 ? `Faltam ${remaining} dias` : remaining === 1 ? 'Último dia' : 'Encerrada';

  return (
    <header className="relative overflow-hidden rounded-b-[2rem] bg-ink text-white">
      {campaign.image_url ? (
        <div className="relative h-56 w-full sm:h-72">
          <Image
            src={campaign.image_url}
            alt={campaign.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-ink via-ink-light to-ink-lighter" />
      )}

      <div className="relative px-5 pb-6 -mt-16 sm:-mt-20">
        <p className="text-xs font-medium uppercase tracking-wide text-gold mb-2">
          {remainingLabel} · encerra em {formatDateBR(campaign.end_date)}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-balance">
          {campaign.title}
        </h1>
        {campaign.description && (
          <p className="mt-2 text-sm text-white/75 leading-relaxed max-w-prose">
            {campaign.description}
          </p>
        )}
        <div className="mt-4 inline-flex items-baseline gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
          <strong className="font-display text-lg text-white">{formatCurrencyBR(campaign.ticket_price)}</strong>
          <span className="text-xs text-white/65">por número</span>
        </div>
      </div>
    </header>
  );
}
