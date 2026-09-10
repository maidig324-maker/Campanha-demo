import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // "demo" fica de fora de propósito: a demonstração não faz nenhuma
    // chamada ao Supabase e precisa funcionar mesmo sem nenhuma credencial
    // configurada (ver src/app/demo). Nenhuma outra rota muda de comportamento.
    '/((?!_next/static|_next/image|favicon.ico|demo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
