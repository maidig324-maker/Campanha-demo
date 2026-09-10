import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublishableKey, getSupabaseUrl } from './env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente Supabase para uso em Server Components e Server Actions.
 * `cookies()` é assíncrona a partir do Next.js 15 — por isso esta função
 * também é assíncrona; todo call site precisa de `await createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // chamado a partir de um Server Component sem permissão de escrita;
          // o middleware cuida da atualização de sessão nesse caso.
        }
      },
    },
  });
}
