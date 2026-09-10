'use client';

import { useMemo, useState, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label, Input, FieldGroup } from '@/components/ui/Field';
import { PixPanel } from './PixPanel';
import { Turnstile } from './Turnstile';
import { createPurchase } from '@/app/actions/reservations';
import { formatCurrencyBR, formatDateTimeBR, formatNumber, whatsappLink } from '@/lib/utils';
import type { PaymentMethod, PixInfo, PublicSettings } from '@/lib/types';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  numbers: number[];
  ticketPrice: number;
  campaignId: string;
  campaignTitle: string;
  settings: PublicSettings | null;
  onReserved: (numbers: number[]) => void;
}

type Step = 'form' | 'success';

export function ReservationModal({
  open,
  onClose,
  numbers,
  ticketPrice,
  campaignId,
  campaignTitle,
  settings,
  onReserved,
}: ReservationModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  // Só é preenchido com o retorno de uma reserva bem-sucedida — nunca chega
  // por props, e nunca existe no payload da página antes disso.
  const [pixInfo, setPixInfo] = useState<PixInfo | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const sortedNumbers = useMemo(() => numbers.slice().sort((a, b) => a - b), [numbers]);
  const calculatedTotal = sortedNumbers.length * ticketPrice;
  const totalAmount = serverTotal ?? calculatedTotal;

  const reset = () => {
    setStep('form');
    setName('');
    setWhatsapp('');
    setPaymentMethod('pix');
    setError(null);
    setServerTotal(null);
    setExpiresAt(null);
    setPixInfo(null);
    setTurnstileToken(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sortedNumbers.length === 0) return;
    setError(null);

    startTransition(async () => {
      const result = await createPurchase({
        campaignId,
        numbers: sortedNumbers,
        name,
        whatsapp,
        paymentMethod,
        turnstileToken,
      });

      // Um token do Turnstile só vale para uma tentativa — sucesso ou falha,
      // a próxima tentativa sempre precisa de um token novo.
      setTurnstileResetSignal((n) => n + 1);

      if (!result.ok) {
        setError(result.error || 'Não foi possível concluir a reserva.');
        return;
      }

      setServerTotal(Number(result.totalAmount ?? calculatedTotal));
      setExpiresAt(result.expiresAt ?? null);
      setPixInfo(result.pix ?? null);
      onReserved(sortedNumbers);
      setStep('success');
    });
  };

  const storeWhatsapp = settings?.whatsapp_number;
  const formattedNumbers = sortedNumbers.map((n) => formatNumber(n)).join(', ');
  const proofMessage = `Olá! Enviando o comprovante da campanha "${campaignTitle}". Nome: ${name}. Números: ${formattedNumbers}. Total da reserva: ${formatCurrencyBR(totalAmount)}.`;

  return (
    <Modal
      open={open && sortedNumbers.length > 0}
      onClose={handleClose}
      title={step === 'form' ? 'Confirmar reserva' : 'Reserva criada'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl bg-black/[0.035] p-3 mb-4">
            <p className="text-xs text-ink/50 mb-1">Números selecionados</p>
            <p className="font-display font-semibold text-sm leading-relaxed">{formattedNumbers}</p>
            <div className="mt-2 pt-2 border-t border-black/5 flex justify-between text-sm">
              <span>{sortedNumbers.length} {sortedNumbers.length === 1 ? 'número' : 'números'}</span>
              <strong>{formatCurrencyBR(calculatedTotal)}</strong>
            </div>
            <p className="mt-2 text-[11px] text-ink/45">O valor final é recalculado e gravado pelo servidor no momento da reserva.</p>
            <p className="mt-1 text-[11px] text-ink/45">
              Prazo máximo para pagamento: {settings?.reservation_hold_hours ?? 6} horas. Se a campanha
              encerrar antes disso, a reserva vence no horário de encerramento.
            </p>
          </div>

          <FieldGroup>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" required />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(31) 99999-9999" inputMode="tel" required />
          </FieldGroup>

          <FieldGroup>
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['pix', 'dinheiro'] as PaymentMethod[]).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                    paymentMethod === method ? 'border-gold bg-gold/10 text-ink' : 'border-black/10 text-ink/60'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </FieldGroup>

          {paymentMethod === 'pix' && (
            <p className="mb-4 rounded-xl border border-black/10 bg-black/[0.025] p-3 text-xs leading-relaxed text-ink/55">
              Os dados do Pix serão exibidos depois que o servidor reservar seus números, evitando pagamento de um número que já tenha sido escolhido por outra pessoa.
            </p>
          )}

          {error && <p className="mb-4 text-sm text-status-confirmed">{error}</p>}

          <FieldGroup>
            <Label>Verificação de segurança</Label>
            <Turnstile onToken={setTurnstileToken} resetSignal={turnstileResetSignal} />
          </FieldGroup>

          <Button type="submit" disabled={isPending || !turnstileToken} className="w-full" size="lg">
            {isPending ? 'Criando reserva...' : `Reservar ${sortedNumbers.length} por ${formatCurrencyBR(calculatedTotal)}`}
          </Button>
          <p className="mt-3 text-xs text-center text-ink/50">
            Os números ficam bloqueados temporariamente e só viram vendidos após a confirmação do pagamento pelo responsável.
          </p>
        </form>
      ) : (
        <div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-sm font-semibold text-amber-900">Aguardando confirmação do pagamento</p>
            <p className="mt-1 text-sm text-amber-800/80">Números: <strong>{formattedNumbers}</strong></p>
            <p className="mt-1 text-sm text-amber-800/80">Valor: <strong>{formatCurrencyBR(totalAmount)}</strong></p>
            {expiresAt && (
              <p className="mt-1 text-xs text-amber-800/70">Reserva válida até {formatDateTimeBR(expiresAt)}.</p>
            )}
          </div>

          {paymentMethod === 'pix' && <div className="mb-4"><PixPanel pix={pixInfo} amount={totalAmount} /></div>}

          {paymentMethod === 'dinheiro' && (
            <p className="mb-4 rounded-xl border border-black/10 bg-black/[0.03] p-3 text-sm text-ink/65">
              O pagamento foi marcado como dinheiro. Combine a entrega com o responsável antes do vencimento da reserva.
            </p>
          )}

          {storeWhatsapp ? (
            <a href={whatsappLink(storeWhatsapp, proofMessage)} target="_blank" rel="noreferrer">
              <Button variant="success" className="w-full" size="lg">Enviar comprovante pelo WhatsApp</Button>
            </a>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              Configure o WhatsApp no painel administrativo para habilitar o envio do comprovante.
            </p>
          )}

          <Button variant="ghost" className="w-full mt-2" onClick={handleClose}>Fechar</Button>
        </div>
      )}
    </Modal>
  );
}
