import { formatCurrencyBR } from '@/lib/utils';

export function DemoPixPanel({ amount }: { amount: number }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 space-y-3">
      <div className="rounded-xl bg-gold/10 border border-gold/25 p-3">
        <p className="text-[11px] uppercase tracking-wide text-ink/50">Pix de demonstração</p>
        <p className="mt-1 font-display text-2xl text-ink">Valor a pagar: {formatCurrencyBR(amount)}</p>
      </div>
      <div className="rounded-lg bg-black/5 px-3 py-2">
        <p className="text-[11px] text-ink/50">Chave Pix (fictícia)</p>
        <p className="text-sm font-mono text-ink">DEMONSTRACAO</p>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
        Pagamento fictício — ambiente de demonstração. Nenhuma cobrança real é gerada.
      </p>
    </div>
  );
}
