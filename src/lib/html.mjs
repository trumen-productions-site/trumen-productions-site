/**
 * Tiny HTML helpers.
 *
 * Pages are plain JavaScript template literals — there is no template language
 * to learn and no parser to maintain. These helpers cover the three things
 * template literals do badly on their own: escaping, joining lists, and
 * dropping a whole block when a value is absent.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for interpolation into HTML text or a quoted attribute. */
export function esc(value) {
  if (value === null || value === undefined || value === false) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Escape for use inside a URL query component (mailto subjects, etc.). */
export function urlq(value) {
  return encodeURIComponent(String(value ?? ''));
}

/**
 * Mark a string as already-safe HTML so `join` and friends leave it alone.
 * Data files that legitimately contain markup (an <em>, a link) use this.
 */
export function raw(str) {
  return String(str ?? '');
}

/** Join an array of strings with a separator, dropping empties. */
export function join(list, sep = '\n') {
  return (list ?? []).filter((x) => x !== null && x !== undefined && x !== false && x !== '').join(sep);
}

/** Map then join — the shape almost every list in this site needs. */
export function each(list, fn, sep = '\n') {
  return join((list ?? []).map(fn), sep);
}

/** Render `block` only when `cond` is truthy. Keeps ternaries out of markup. */
export function when(cond, block) {
  if (!cond) return '';
  return typeof block === 'function' ? block() : block;
}

/** Build a class attribute from a list, dropping falsy entries. */
export function cls(...names) {
  const list = names.flat().filter(Boolean);
  return list.length ? ` class="${esc(list.join(' '))}"` : '';
}

/** Build an attribute string from an object, dropping null/undefined/false. */
export function attrs(obj = {}) {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}

/**
 * A mailto: link with a prefilled subject (and optional body).
 * The site takes no form submissions of its own — every "form" opens the
 * visitor's own mail client, so no address ever passes through a third party.
 */
export function mailto(address, subject, body) {
  const params = [];
  if (subject) params.push(`subject=${urlq(subject)}`);
  if (body) params.push(`body=${urlq(body)}`);
  return `mailto:${address}${params.length ? `?${params.join('&')}` : ''}`;
}

/** Turn a heading into a stable, URL-safe id. */
export function slug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Collapse runs of whitespace — for meta descriptions built from prose. */
export function oneLine(text) {
  return String(text ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate to a length on a word boundary, appending an ellipsis. */
export function clip(text, max = 160) {
  const s = oneLine(text);
  if (s.length <= max) return s;
  return `${s.slice(0, s.lastIndexOf(' ', max - 1))}…`;
}
