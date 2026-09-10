/**
 * Resolve URL e chave pública do Supabase. Prioriza a nomenclatura nova
 * (publishable/secret, formato sb_publishable_/sb_secret_), com fallback para
 * as chaves legadas (anon/service_role) em projetos Supabase mais antigos —
 * os dois formatos funcionam simultaneamente na API do Supabase.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.');
  }
  return url;
}

/** Chave de baixo privilégio, segura para o navegador (publishable ou, em fallback, anon). */
export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou, em projetos legados, NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }
  return key;
}
