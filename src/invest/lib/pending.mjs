/**
 * Pending values.
 *
 * The investor page's one unbreakable rule is "no invented numbers". Any
 * term, figure or name that has not been decided is a `Pending` — an object
 * carrying the reason it is unset. On staging it renders as a visible
 * `[[PENDING: reason]]` token in a brass outline, so a reviewer sees exactly
 * what is missing. `scripts/check-pending.mjs` fails the production build if
 * a single one survives.
 */

import { esc } from '../../lib/html.mjs';

/** Mark a value as not yet decided. */
export const pending = (reason) => Object.freeze({ pending: String(reason) });

/** Is this a Pending marker? */
export const isPending = (v) => Boolean(v) && typeof v === 'object' && typeof v.pending === 'string';

/** The literal token as it appears in the HTML — tests and scripts grep for it. */
export const TOKEN_OPEN = '[[PENDING: ';
export const TOKEN_CLOSE = ']]';

/** Render a Pending marker. */
export function renderPending(v) {
  return `<span class="pending" data-pending="${esc(v.pending)}">${TOKEN_OPEN}${esc(v.pending)}${TOKEN_CLOSE}</span>`;
}

/**
 * Resolve a value: a Pending renders as its token; anything else goes
 * through `fn` (which receives the decided value and returns HTML).
 */
export function val(v, fn = (x) => esc(x)) {
  return isPending(v) ? renderPending(v) : fn(v);
}

/** Resolve a value as a plain-text string (for meta descriptions, the counsel packet). */
export function text(v, fn = (x) => String(x)) {
  return isPending(v) ? `${TOKEN_OPEN}${v.pending}${TOKEN_CLOSE}` : fn(v);
}

/**
 * Walk any config object and list every Pending inside it as
 * `{ path, reason }`. Used by the production gate and the counsel packet.
 */
export function collectPending(obj, path = '') {
  const out = [];
  const seen = new Set();
  (function walk(node, at) {
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    if (isPending(node)) {
      out.push({ path: at || '(root)', reason: node.pending });
      return;
    }
    const entries = Array.isArray(node) ? node.map((v, i) => [i, v]) : Object.entries(node);
    for (const [k, v] of entries) walk(v, at ? `${at}.${k}` : String(k));
  })(obj, path);
  return out;
}

/** Find every rendered token in a built HTML string. */
export function findTokens(html) {
  const re = /\[\[PENDING: ([^\]]*)\]\]/g;
  return [...html.matchAll(re)].map((m) => m[1]);
}
