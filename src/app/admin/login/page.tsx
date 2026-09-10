import { LoginForm } from '@/components/admin/LoginForm';

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-ink">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-white mb-1">Painel administrativo</h1>
        <p className="text-sm text-white/50 mb-6">Entre com sua conta de administrador.</p>
        <div className="bg-white rounded-2xl p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
