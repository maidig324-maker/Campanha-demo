'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label, Input, FieldGroup } from '@/components/ui/Field';
import { DemoPixPanel } from './DemoPixPanel';
import { formatCurrencyBR, formatDateTimeBR, formatNumber } from '@/lib/utils';
import { DEMO_RESERVATION_HOLD_HOURS, DEMO_TICKET_PRICE } from '@/lib/demo/data';
import type { PaymentMethod } from '@/lib/types';

type Step = 'form' | 'success';

export function DemoReservationModal({
  open,
  onClose,
  numbers,
  onReserved,
}: {
  open: boolean;
  onClose: () => void;
  numbers: number[];
  onReserved: (numbers: number[]) => void;
}) {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const sortedNumbers = useMemo(() => numbers.slice().sort((a, b) => a - b), [numbers]);
  const totalAmount = sortedNumbers.length * DEMO_TICKET_PRICE;
  const formattedNumbers = sortedNumbers.map((n) => formatNumber(n)).join(', ');

  const reset = () => {
    setStep('form');
    setName('');
    setWhatsapp('');
    setPaymentMethod('pix');
    setIsSubmitting(false);
    setExpiresAt(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sortedNumbers.length === 0 || !name.trim() || whatsapp.replace(/\D/g, '').length < 10) return;

    setIsSubmitting(true);
    // Simula o tempo de uma chamada ao servidor real, sem chamar nada de verdade.
    setTimeout(() => {
      setExpiresAt(new Date(Date.now() + DEMO_RESERVATION_HOLD_HOURS * 60 * 60 * 1000).toISOString());
      onReserved(sortedNumbers);
      setIsSubmitting(false);
      setStep('success');
    }, 700);
  };

  return (
    <Modal
      open={open && sortedNumbers.length > 0}
      onClose={handleClose}
      title={step === 'form' ? 'Confirmar reserva (demo)' : 'Reserva simulada'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit}>
          <div className="rounded-xl bg-black/[0.035] p-3 mb-4">
            <p className="text-xs text-ink/50 mb-1">Números selecionados</p>
            <p className="font-display font-semibold text-sm leading-relaxed">{formattedNumbers}</p>
            <div className="mt-2 pt-2 border-t border-black/5 flex justify-between text-sm">
              <span>{sortedNumbers.length} {sortedNumbers.length === 1 ? 'número' : 'números'}</span>
              <strong>{formatCurrencyBR(totalAmount)}</strong>
            </div>
            <p className="mt-2 text-[11px] text-ink/45">
              Reserva válida por até {DEMO_RESERVATION_HOLD_HOURS} horas nesta demonstração.
            </p>
          </div>

          <FieldGroup>
            <Label htmlFor="demo-name">Nome</Label>
            <Input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome de teste" required />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="demo-whatsapp">WhatsApp</Label>
            <Input id="demo-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(31) 99999-9999" inputMode="tel" required />
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
              Os dados do Pix de demonstração aparecem depois de simular a reserva.
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
            {isSubmitting ? 'Simulando reserva...' : `Reservar ${sortedNumbers.length} por ${formatCurrencyBR(totalAmount)} (demo)`}
          </Button>
          <p className="mt-3 text-xs text-center text-ink/50">
            Nenhum dado desta demonstração é enviado a qualquer servidor.
          </p>
        </form>
      ) : (
        <div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
            <p className="text-sm font-semibold text-amber-900">Aguardando confirmação (simulado)</p>
            <p className="mt-1 text-sm text-amber-800/80">Números: <strong>{formattedNumbers}</strong></p>
            <p className="mt-1 text-sm text-amber-800/80">Valor: <strong>{formatCurrencyBR(totalAmount)}</strong></p>
            {expiresAt && (
              <p className="mt-1 text-xs text-amber-800/70">Reservado até: {formatDateTimeBR(expiresAt)} (fictício)</p>
            )}
          </div>

          {paymentMethod === 'pix' && <div className="mb-4"><DemoPixPanel amount={totalAmount} /></div>}

          {paymentMethod === 'dinheiro' && (
            <p className="mb-4 rounded-xl border border-black/10 bg-black/[0.03] p-3 text-sm text-ink/65">
              Pagamento em dinheiro simulado — combine a entrega com o responsável (fictício, nesta demo).
            </p>
          )}

          <Button variant="ghost" className="w-full mt-2" onClick={handleClose}>Fechar</Button>
        </div>
      )}
    </Modal>
  );
}
