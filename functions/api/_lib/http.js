/**
 * HTTP helpers for the Pages Functions.
 */

export const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

export function badRequest(errors, extra = {}) {
  return json({ error: 'invalid', errors, ...extra }, 400);
}

export function methodNotAllowed(allow) {
  return json({ error: 'method_not_allowed' }, 405, { allow });
}

/**
 * Read a request body as a plain object, whether it was sent as JSON (the
 * island) or as a form post (the no-JavaScript fallback).
 */
export async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      const data = await request.json();
      return { data: data && typeof data === 'object' ? data : {}, form: false };
    } catch {
      return { data: null, form: false };
    }
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    try {
      const fd = await request.formData();
      const data = {};
      for (const [k, v] of fd.entries()) data[k] = typeof v === 'string' ? v : '';
      return { data, form: true };
    } catch {
      return { data: null, form: true };
    }
  }
  // An empty body is fine for routes that need none.
  return { data: {}, form: false };
}

/** The client address Cloudflare saw. */
export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

export function wantsHtml(request) {
  return (request.headers.get('accept') || '').includes('text/html');
}

export function redirect(location, status = 303) {
  return new Response(null, { status, headers: { location, 'cache-control': 'no-store' } });
}

export function nowIso() {
  return new Date().toISOString();
}

/** Serialise an unexpected error without leaking internals. */
export function serverError(err, env) {
  if (env?.DEBUG === 'true') console.error(err);
  return json({ error: 'server_error' }, 500);
}
