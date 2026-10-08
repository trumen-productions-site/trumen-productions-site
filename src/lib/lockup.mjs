/**
 * The VIRI★VERI Productions lockup — the supplied SVG, never rebuilt from type.
 *
 * `src/assets/img/viri-veri-lockup.svg` is the file counsel's design round
 * delivered (Option C, October 7, 2026): the letterforms are paths, so it
 * renders identically with no font installed. The build keeps two variants
 * beside it — cream letterforms for navy grounds, and the navy letterforms
 * with no background for light grounds — and this module hands the inner
 * drawing to anything that wants to nest it inside another SVG (the key art,
 * the social cards).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const IMG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'img');

/** The lockup's own coordinate space. */
export const LOCKUP_VIEWBOX = '0 0 2046.41 779.15';
export const LOCKUP_RATIO = 779.15 / 2046.41;

export const LOCKUP_FILES = {
  /** Navy letterforms on the cream ground, as supplied. */
  cream: '/assets/img/viri-veri-lockup.svg',
  /** Cream letterforms, transparent — for navy grounds. */
  navy: '/assets/img/viri-veri-lockup-navy.svg',
  /** Navy letterforms, transparent — for light grounds. */
  transparent: '/assets/img/viri-veri-lockup-transparent.svg',
};

const cache = new Map();

/** The SVG source of a variant. */
export function lockupSource(variant = 'transparent') {
  if (!cache.has(variant)) {
    cache.set(variant, readFileSync(path.join(IMG, path.basename(LOCKUP_FILES[variant])), 'utf8'));
  }
  return cache.get(variant);
}

/**
 * The drawing without its outer <svg> element, for nesting:
 *   <svg x y width height viewBox="${LOCKUP_VIEWBOX}">${lockupInner('navy')}</svg>
 * `idPrefix` keeps the glyph ids unique when a page nests it more than once.
 */
export function lockupInner(variant = 'transparent', { idPrefix = 'vv' } = {}) {
  const src = lockupSource(variant);
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return inner.replace(/id="g(\d+)"/g, `id="${idPrefix}-g$1"`).replace(/href="#g(\d+)"/g, `href="#${idPrefix}-g$1"`);
}

/** A nested lockup at (x, y) with the given width, aspect preserved. */
export function lockupNested({ variant = 'navy', x = 0, y = 0, width = 400, idPrefix = 'vv' } = {}) {
  const height = (width * LOCKUP_RATIO).toFixed(2);
  // The parent SVG carries the accessible name; the nested drawing is decoration inside it.
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${LOCKUP_VIEWBOX}" aria-hidden="true">${lockupInner(variant, { idPrefix })}</svg>`;
}
