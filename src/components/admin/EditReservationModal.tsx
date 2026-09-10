'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label, Input, Textarea, FieldGroup } from '@/components/ui/Field';
import { updatePurchase } from '@/app/actions/admin';
import { formatNumber } from '@/lib/utils';
import type { PurchaseRow, PaymentMethod } from '@/lib/types';

export function EditReservationModal({
  row,
  onClose,
}: {
  row: PurchaseRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!row) return;
    setName(row.name);
    setWhatsapp(row.whatsapp);
    setPaymentMethod(row.payment_method);
    setNotes(row.notes);
    setError(null);
  }, [row]);

  if (!row) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updatePurchase({
        purchaseId: row.purchase_id,
        participantId: row.participant_id,
        name,
        whatsapp,
        paymentMethod,
        notes,
      });
      if (!result.ok) {
        setError(result.error || 'Erro ao salvar.');
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <Modal open={!!row} onClose={onClose} title="Editar compra">
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl bg-black/[0.035] p-3 mb-4">
          <p className="text-xs text-ink/50 mb-1">Números desta compra</p>
          <p className="text-sm font-display font-semibold leading-relaxed">
            {row.numbers.map((n) => formatNumber(n)).join(', ')}
          </p>
        </div>
        <FieldGroup>
          <Label htmlFor="edit-name">Nome</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-whatsapp">WhatsApp</Label>
          <Input id="edit-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
        </FieldGroup>
        <FieldGroup>
          <Label>Forma de pagamento</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['pix', 'dinheiro'] as PaymentMethod[]).map((method) => (
              <button
                type="button"
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize ${
                  paymentMethod === method ? 'border-gold bg-gold/10 text-ink' : 'border-black/10 text-ink/60'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-notes">Observações</Label>
          <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </FieldGroup>

        {error && <p className="mb-4 text-sm text-status-confirmed">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
