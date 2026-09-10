'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Label, Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { updateCampaignSettings, lockDraw } from '@/app/actions/admin';
import { createClient } from '@/lib/supabase/client';
import { formatDateTimeBR } from '@/lib/utils';
import type { Campaign, Settings } from '@/lib/types';

export function SettingsForm({ campaign, settings }: { campaign: Campaign; settings: Settings | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: campaign.title,
    description: campaign.description,
    imageUrl: campaign.image_url ?? '',
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    ticketPrice: String(campaign.ticket_price ?? 10),
    regulationText: campaign.regulation_text,
    authorizationNumber: campaign.authorization_number ?? '',
    pixReceiverName: settings?.pix_receiver_name ?? '',
    pixKey: settings?.pix_key ?? '',
    pixQrCodeUrl: settings?.pix_qr_code_url ?? '',
    paymentInstructions: settings?.payment_instructions ?? '',
    whatsappNumber: settings?.whatsapp_number ?? '',
    reservationHoldHours: String(settings?.reservation_hold_hours ?? 6),
  });
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<'prize' | 'qr' | null>(null);
  const [locking, setLocking] = useState(false);

  const drawLocked = !!campaign.draw_commitment && !!campaign.draw_locked_at;
  const commitmentShort = useMemo(
    () => campaign.draw_commitment ? `${campaign.draw_commitment.slice(0, 16)}…${campaign.draw_commitment.slice(-12)}` : '',
    [campaign.draw_commitment]
  );

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const uploadAsset = async (file: File, kind: 'prize' | 'qr') => {
    setUploading(kind);
    setStatus('idle');
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${campaign.id}/${kind}-${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from('campaign-assets').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('campaign-assets').getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === 'prize' ? 'imageUrl' : 'pixQrCodeUrl']: data.publicUrl }));
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    startTransition(async () => {
      const result = await updateCampaignSettings({ campaignId: campaign.id, ...form });
      if (result.ok) {
        setStatus('saved');
        router.refresh();
      } else {
        setStatus('error');
        setErrorMsg(result.error || 'Erro ao salvar.');
      }
    });
  };

  const handleLockDraw = async () => {
    if (!window.confirm('Depois de criar a prova, datas, valor por número e quantidade ficam vinculados ao sorteio e não poderão ser alterados pelo painel. Continuar?')) return;
    setLocking(true);
    setStatus('idle');
    const result = await lockDraw(campaign.id);
    setLocking(false);
    if (!result.ok) {
      setStatus('error');
      setErrorMsg(result.error || 'Não foi possível criar a prova.');
      return;
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <section>
        <h2 className="font-display font-semibold text-ink mb-4">Campanha</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-black/[0.035] p-3">
            <p className="text-xs text-ink/50">Quantidade</p>
            <p className="font-display text-xl font-semibold">{campaign.total_numbers}</p>
            <p className="text-[11px] text-ink/40">Números de 001 a 200</p>
          </div>
          <div className="rounded-xl bg-black/[0.035] p-3">
            <p className="text-xs text-ink/50">Valor padrão</p>
            <p className="font-display text-xl font-semibold">R$ {Number(campaign.ticket_price).toFixed(2).replace('.', ',')}</p>
            <p className="text-[11px] text-ink/40">por número</p>
          </div>
        </div>
        <FieldGroup>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={form.title} onChange={set('title')} required />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="description">Descrição curta</Label>
          <Textarea id="description" value={form.description} onChange={set('description')} rows={2} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="ticketPrice">Valor por número (R$)</Label>
          <Input id="ticketPrice" value={form.ticketPrice} onChange={set('ticketPrice')} inputMode="decimal" required disabled={drawLocked} />
        </FieldGroup>
        <FieldGroup>
          <Label>Imagem do prêmio</Label>
          <Input value={form.imageUrl} onChange={set('imageUrl')} placeholder="URL da imagem" />
          <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-ink/70 hover:bg-black/[0.03]">
            {uploading === 'prize' ? 'Enviando...' : 'Enviar imagem do prêmio'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!!uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAsset(file, 'prize');
              }}
            />
          </label>
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label htmlFor="startDate">Data inicial</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={set('startDate')} required disabled={drawLocked} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="endDate">Data final</Label>
            <Input id="endDate" type="date" value={form.endDate} onChange={set('endDate')} required disabled={drawLocked} />
            {drawLocked && <p className="mt-1 text-[11px] text-ink/45">Bloqueada pela prova do sorteio.</p>}
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label htmlFor="authorizationNumber">Número/certificado de autorização (se aplicável)</Label>
          <Input
            id="authorizationNumber"
            value={form.authorizationNumber}
            onChange={set('authorizationNumber')}
            placeholder="Número oficial da autorização"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="regulationText">Texto do regulamento</Label>
          <Textarea id="regulationText" value={form.regulationText} onChange={set('regulationText')} rows={6} />
        </FieldGroup>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-4">
        <h2 className="font-display font-semibold text-ink">Integridade do sorteio</h2>
        {drawLocked ? (
          <div className="mt-3">
            <p className="text-sm font-medium text-green-700">✓ Sorteio bloqueado</p>
            <p className="mt-1 text-xs text-ink/55">Bloqueado em {formatDateTimeBR(campaign.draw_locked_at!)}</p>
            <div className="mt-3 rounded-xl bg-black/[0.035] p-3">
              <p className="text-[11px] uppercase tracking-wide text-ink/45">Código público</p>
              <code className="mt-1 block break-all text-xs text-ink/70" title={campaign.draw_commitment ?? ''}>{commitmentShort}</code>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink/50">
              A ordem secreta dos 200 números permanece oculta até o encerramento. Depois, vence o primeiro número confirmado encontrado nessa ordem. O painel não permite trocar a prova nem alterar a data final após o bloqueio.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-ink/60">
              Gere a prova antes de divulgar a campanha. O sistema cria uma ordem secreta dos 200 números, publica apenas o hash SHA-256 e só então libera as reservas.
            </p>
            <Button type="button" variant="secondary" className="mt-3" disabled={locking} onClick={handleLockDraw}>
              {locking ? 'Criando prova...' : 'Criar e bloquear prova do sorteio'}
            </Button>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-semibold text-ink mb-4">Prazo das reservas</h2>
        <FieldGroup>
          <Label htmlFor="reservationHoldHours">Tempo de bloqueio dos números (horas)</Label>
          <Input
            id="reservationHoldHours"
            type="number"
            min="1"
            max="168"
            value={form.reservationHoldHours}
            onChange={set('reservationHoldHours')}
            required
          />
          <p className="mt-1 text-[11px] text-ink/45">Ex.: 6 = seis horas; 24 = um dia. O prazo vale para novas reservas.</p>
        </FieldGroup>
      </section>

      <section>
        <h2 className="font-display font-semibold text-ink mb-4">Pagamento via Pix</h2>
        <FieldGroup>
          <Label htmlFor="pixReceiverName">Nome do recebedor</Label>
          <Input id="pixReceiverName" value={form.pixReceiverName} onChange={set('pixReceiverName')} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="pixKey">Chave Pix</Label>
          <Input id="pixKey" value={form.pixKey} onChange={set('pixKey')} />
        </FieldGroup>
        <FieldGroup>
          <Label>QR Code Pix</Label>
          <Input value={form.pixQrCodeUrl} onChange={set('pixQrCodeUrl')} placeholder="URL da imagem" />
          <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-ink/70 hover:bg-black/[0.03]">
            {uploading === 'qr' ? 'Enviando...' : 'Enviar imagem do QR Code'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!!uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAsset(file, 'qr');
              }}
            />
          </label>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="paymentInstructions">Instruções de pagamento</Label>
          <Textarea id="paymentInstructions" value={form.paymentInstructions} onChange={set('paymentInstructions')} rows={3} />
        </FieldGroup>
      </section>

      <section>
        <h2 className="font-display font-semibold text-ink mb-4">Contato</h2>
        <FieldGroup>
          <Label htmlFor="whatsappNumber">WhatsApp do responsável</Label>
          <Input
            id="whatsappNumber"
            value={form.whatsappNumber}
            onChange={set('whatsappNumber')}
            placeholder="31999999999"
          />
        </FieldGroup>
      </section>

      {status === 'saved' && <p className="text-sm text-status-available font-medium">Configurações salvas.</p>}
      {status === 'error' && <p className="text-sm text-status-confirmed">{errorMsg}</p>}

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? 'Salvando...' : 'Salvar configurações'}
      </Button>
    </form>
  );
}
