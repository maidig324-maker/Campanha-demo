import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoAdminPanel } from '@/components/demo/DemoAdminPanel';

export const metadata = {
  title: 'Demonstração — Painel administrativo',
  robots: { index: false, follow: false },
};

export default function DemoAdminPage() {
  return (
    <div className="min-h-screen bg-black/[0.02]">
      <DemoBanner />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <DemoAdminPanel />
      </main>
    </div>
  );
}
