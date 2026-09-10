import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoCampaignPublic } from '@/components/demo/DemoCampaignPublic';

export const metadata = {
  title: 'Demonstração — Rifa Premiada',
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <main className="min-h-screen pb-16 max-w-lg mx-auto">
      <DemoBanner />
      <DemoCampaignPublic />
    </main>
  );
}
