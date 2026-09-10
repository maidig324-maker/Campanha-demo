'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvailabilityBar } from './AvailabilityBar';
import { Legend } from './Legend';
import { NumberGrid } from './NumberGrid';
import { ReservationModal } from './ReservationModal';
import { SelectionBar } from './SelectionBar';
import type { Campaign, PublicSettings, RaffleNumber } from '@/lib/types';
import { isCampaignOpen } from '@/lib/utils';

export function CampaignExperience({
  campaign,
  initialNumbers,
  settings,
}: {
  campaign: Campaign;
  initialNumbers: RaffleNumber[];
  settings: PublicSettings | null;
}) {
  const router = useRouter();
  const [numbers, setNumbers] = useState(initialNumbers);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const availableCount = useMemo(
    () => numbers.filter((n) => n.status === 'available').length,
    [numbers]
  );

  const dateOpen = isCampaignOpen(campaign.start_date, campaign.end_date) && campaign.status === 'active';
  const drawProtected = !!campaign.draw_commitment && !!campaign.draw_locked_at;
  const campaignOpen = dateOpen && drawProtected;

  useEffect(() => {
    setNumbers(initialNumbers);
    const availableSet = new Set(initialNumbers.filter((n) => n.status === 'available').map((n) => n.number));
    setSelectedNumbers((prev) => prev.filter((n) => availableSet.has(n)));
  }, [initialNumbers]);

  useEffect(() => {
    if (!campaignOpen) return;
    const timer = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [campaignOpen, router]);

  const handleToggle = (number: number) => {
    if (!campaignOpen) return;
    setSelectedNumbers((prev) =>
      prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
    );
  };

  const handleReserved = (reservedNumbers: number[]) => {
    const selectedSet = new Set(reservedNumbers);
    setNumbers((prev) =>
      prev.map((n) => (selectedSet.has(n.number) ? { ...n, status: 'reserved' } : n))
    );
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedNumbers([]);
  };

  return (
    <>
      <AvailabilityBar available={availableCount} total={campaign.total_numbers} />
      <Legend />

      {!drawProtected && dateOpen && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          🔒 As reservas ainda não foram liberadas. O responsável precisa bloquear a prova pública do sorteio primeiro.
        </div>
      )}

      {!dateOpen && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esta campanha está encerrada ou fora do período de participação. Os números permanecem visíveis apenas para consulta.
        </div>
      )}

      <NumberGrid
        numbers={numbers}
        selectedNumbers={selectedNumbers}
        onToggle={handleToggle}
        disabled={!campaignOpen}
      />

      {campaignOpen && (
        <SelectionBar
          quantity={selectedNumbers.length}
          ticketPrice={Number(campaign.ticket_price)}
          onContinue={() => setModalOpen(true)}
        />
      )}

      <ReservationModal
        open={modalOpen}
        onClose={handleCloseModal}
        numbers={selectedNumbers}
        ticketPrice={Number(campaign.ticket_price)}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        settings={settings}
        onReserved={handleReserved}
      />
    </>
  );
}
