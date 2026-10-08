/**
 * Cloudflare Turnstile verification.
 *
 * Modes (env.TURNSTILE_MODE):
 *   'live' (default)  POST the token to siteverify with TURNSTILE_SECRET.
 *   'mock'            Local development and tests: any non-empty token passes,
 *                     the literal 'invalid' fails, a missing token fails. The
 *                     production build refuses the test site key, and
 *                     wrangler.toml does not set this variable in production.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile({ token, ip, env, fetchImpl = fetch }) {
  if (!token) return { ok: false, reason: 'missing' };
  if (env.TURNSTILE_MODE === 'mock') {
    return token === 'invalid' ? { ok: false, reason: 'invalid' } : { ok: true };
  }
  if (!env.TURNSTILE_SECRET) return { ok: false, reason: 'unconfigured' };
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token) });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetchImpl(VERIFY_URL, { method: 'POST', body });
    const data = await res.json();
    return data.success ? { ok: true } : { ok: false, reason: (data['error-codes'] || ['invalid']).join(',') };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}
