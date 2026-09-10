'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/settings', label: 'Configurações' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-black/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                pathname === link.href ? 'bg-ink text-white' : 'text-ink/60 hover:bg-black/5'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-ink/50 hover:text-ink">
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}
