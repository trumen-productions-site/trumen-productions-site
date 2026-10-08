/**
 * Security headers (test SEC-01), written to dist/_headers.
 *
 * Cloudflare Pages and Netlify both read this file. The policy is strict
 * enough for a page that takes an investor's details: scripts only from this
 * origin and Turnstile, no framing, no inline script. Inline *styles* are
 * allowed because the company site sets a handful of layout attributes
 * inline; there is no inline script anywhere in the build.
 *
 * When features.metaPixel is on, the pixel's hosts are added — and only then.
 */

import { features } from './config/features.mjs';

export function csp({ metaPixel = features.metaPixel } = {}) {
  const pixelScript = metaPixel ? ' https://connect.facebook.net' : '';
  const pixelImg = metaPixel ? ' https://www.facebook.com' : '';
  const pixelConnect = metaPixel ? ' https://www.facebook.com' : '';
  return [
    "default-src 'self'",
    `script-src 'self' https://challenges.cloudflare.com${pixelScript}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data:${pixelImg}`,
    `connect-src 'self' https://challenges.cloudflare.com${pixelConnect}`,
    'frame-src https://challenges.cloudflare.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export const SECURITY_HEADERS = {
  'Content-Security-Policy': csp(),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** The paths that must never be indexed, whatever the HTML says. */
export const NOINDEX_PATHS = ['/invest/*', '/invest', '/privacy/*', '/privacy', '/terms/*', '/terms'];

export function headersFile() {
  const lines = ['/*'];
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) lines.push(`  ${k}: ${v}`);
  lines.push('');
  for (const p of NOINDEX_PATHS) {
    lines.push(p, '  X-Robots-Tag: noindex, nofollow', '  Cache-Control: no-store', '');
  }
  lines.push('/api/*', '  Cache-Control: no-store', '  X-Robots-Tag: noindex', '');
  lines.push('/assets/*', '  Cache-Control: public, max-age=31536000, immutable', '');
  return `${lines.join('\n')}\n`;
}

/** Parse a _headers file back into { path: { header: value } } — for the tests and the dev server. */
export function parseHeadersFile(text) {
  const out = {};
  let current = null;
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    if (!raw.startsWith(' ')) {
      current = raw.trim();
      out[current] = out[current] || {};
    } else if (current) {
      const i = raw.indexOf(':');
      out[current][raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
    }
  }
  return out;
}

/** The headers that apply to a path, most specific last. */
export function headersFor(pathname, parsed = parseHeadersFile(headersFile())) {
  const result = {};
  for (const [pattern, headers] of Object.entries(parsed)) {
    const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    if (re.test(pathname)) Object.assign(result, headers);
  }
  return result;
}
