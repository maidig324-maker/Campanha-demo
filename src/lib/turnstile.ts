import 'server-only';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResult {
  success: boolean;
  errorCodes: string[];
}

/**
 * Valida um token do Cloudflare Turnstile pelo endpoint oficial siteverify.
 * Nunca confia no widget do navegador sozinho — esta chamada é o que decide
 * se a reserva pode prosseguir.
 *
 * Importante: a Cloudflare já invalida um token depois da primeira verificação
 * bem-sucedida (erro "timeout-or-duplicate" numa segunda tentativa com o mesmo
 * token) — por isso não é preciso manter uma tabela própria de tokens usados
 * só para cobrir reuso; o próprio siteverify já recusa.
 *
 * Falha fechada: se a chave secreta não estiver configurada, ou a chamada para
 * a Cloudflare falhar por qualquer motivo, o resultado é "não validado" — a
 * reserva não é criada. É proposital: preferimos bloquear reservas a abrir mão
 * da proteção contra abuso por uma falha de configuração silenciosa.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { success: false, errorCodes: ['turnstile-not-configured'] };
  }
  if (!token || !token.trim()) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return { success: false, errorCodes: ['siteverify-http-error'] };
    }

    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };

    return {
      success: data.success === true,
      errorCodes: data['error-codes'] ?? [],
    };
  } catch {
    return { success: false, errorCodes: ['siteverify-network-error'] };
  }
}
