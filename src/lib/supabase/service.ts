import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './env';

/**
 * Cliente com a chave SECRETA do Supabase (equivalente a service_role):
 * ignora RLS e é o único capaz de chamar `create_purchase` depois do
 * REVOKE aplicado no schema.sql. Não depende de cookies/sessão — é o
 * mesmo cliente privilegiado para qualquer chamada do servidor.
 *
 * O import `server-only` no topo faz o build FALHAR caso este arquivo seja
 * importado, direta ou indiretamente, por um Client Component — é a proteção
 * contra a chave secreta vazar para o bundle do navegador por engano.
 */
export function createServiceClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      'Defina SUPABASE_SECRET_KEY (ou, em projetos legados, SUPABASE_SERVICE_ROLE_KEY) nas variáveis de ambiente do servidor.'
    );
  }

  return createSupabaseClient(getSupabaseUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
