'use client';

import { useState } from 'react';
import { DrawIntegrityCard } from '@/components/public/DrawIntegrityCard';
import { Button } from '@/components/ui/Button';
import { buildDemoCampaign } from '@/lib/demo/data';

/**
 * Reaproveita o MESMO componente de verificação da produção
 * (src/components/public/DrawIntegrityCard.tsx) — inclusive o recálculo do
 * SHA-256 no navegador. O botão "Simular encerramento" só revela os valores
 * fictícios pré-computados; a verificação que aparece na tela é real, contra
 * esses valores, não um "sempre válido" fingido.
 */
export function DemoDrawSection() {
  const [revealed, setRevealed] = useState(false);
  const campaign = buildDemoCampaign(true, revealed);

  return (
    <div>
      <DrawIntegrityCard campaign={campaign} />
      {!revealed && (
        <div className="mx-5 mt-3">
          <Button variant="secondary" size="sm" onClick={() => setRevealed(true)}>
            Simular encerramento
          </Button>
          <p className="mt-1.5 text-[11px] text-ink/45">
            Só nesta demonstração — na versão real, a revelação só acontece de verdade após a data de encerramento.
          </p>
        </div>
      )}
    </div>
  );
}
