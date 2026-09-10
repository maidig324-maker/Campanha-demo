'use client';

import { useMemo, useState } from 'react';
import { CampaignHeader } from '@/components/public/CampaignHeader';
import { AvailabilityBar } from '@/components/public/AvailabilityBar';
import { Legend } from '@/components/public/Legend';
import { NumberGrid } from '@/components/public/NumberGrid';
import { SelectionBar } from '@/components/public/SelectionBar';
import { DemoReservationModal } from './DemoReservationModal';
import { DemoDrawSection } from './DemoDrawSection';
import { buildDemoCampaign, buildDemoNumbers, DEMO_TICKET_PRICE } from '@/lib/demo/data';

/**
 * Mesma experiência visual da página pública real (mesmos componentes,
 * mesmas cores, mesma grade responsiva) — só que todo o estado vive em
 * memória neste componente, sem nenhuma chamada ao Supabase.
 */
export function DemoCampaignPublic() {
  const campaign = useMemo(() => buildDemoCampaign(true, false), []);
  const [numbers, setNumbers] = useState(() => buildDemoNumbers());
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const availableCount = useMemo(
    () => numbers.filter((n) => n.status === 'available').length,
    [numbers]
  );

  const handleToggle = (number: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
    );
  };

  const handleReserved = (reservedNumbers: number[]) => {
    const set = new Set(reservedNumbers);
    setNumbers((prev) => prev.map((n) => (set.has(n.number) ? { ...n, status: 'reserved' } : n)));
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedNumbers([]);
  };

  return (
    <>
      <CampaignHeader campaign={campaign} />
      <DemoDrawSection />

      <AvailabilityBar available={availableCount} total={campaign.total_numbers} />
      <Legend />

      <NumberGrid
        numbers={numbers}
        selectedNumbers={selectedNumbers}
        onToggle={handleToggle}
        disabled={false}
      />

      {selectedNumbers.length > 0 && (
        <SelectionBar
          quantity={selectedNumbers.length}
          ticketPrice={DEMO_TICKET_PRICE}
          onContinue={() => setModalOpen(true)}
        />
      )}

      <DemoReservationModal
        open={modalOpen}
        onClose={handleCloseModal}
        numbers={selectedNumbers}
        onReserved={handleReserved}
      />

      <footer className="px-5 mt-10 pb-6">
        <p className="text-xs text-ink/40">
          Esta é uma demonstração. O regulamento completo aparecerá aqui na versão oficial.
        </p>
      </footer>
    </>
  );
}
