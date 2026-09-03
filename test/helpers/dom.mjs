/**
 * Test helpers: a small, deliberate HTML reader.
 *
 * These tests deliberately avoid a parser dependency. The site emits its own
 * markup from template literals, so what the tests need is not a full DOM —
 * it is a way to ask precise questions about the bytes that were written:
 * which links exist, which ids exist, whether the tags balance, whether every
 * page carries the head it must carry.
 */

import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIST = path.join(ROOT, 'dist');
export const SRC = path.join(ROOT, 'src');

/** Every built HTML file, as { file, sitePath, html }. */
export async function builtPages() {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.html')) {
        const rel = path.relative(DIST, full);
        const sitePath =
          rel === 'index.html'
            ? '/'
            : rel.endsWith('/index.html')
              ? `/${rel.slice(0, -'index.html'.length)}`
              : `/${rel}`;
        out.push({ file: rel, sitePath, html: await readFile(full, 'utf8') });
      }
    }
  }
  await walk(DIST);
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/** All values of an attribute across a document, e.g. attrValues(html, 'href'). */
export function attrValues(html, attr) {
  const re = new RegExp(`${attr}="([^"]*)"`, 'g');
  return [...html.matchAll(re)].map((m) => m[1]);
}

/** Every <a href> in document order. */
export function links(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);
}

/** Every element id in the document. */
export function ids(html) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
}

/** Headings as [{ level, text }] in document order. */
export function headings(html) {
  return [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({
    level: Number(m[1]),
    text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));
}

/** Every <img> tag, whole. */
export function imgTags(html) {
  return [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
}

/** The contents of every <script type="application/ld+json">. */
export function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** The value of a <meta name|property="..."> content attribute. */
export function meta(html, key) {
  const re = new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`);
  const m = html.match(re);
  return m ? m[1] : null;
}

/** The document <title>. */
export function title(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  return m ? m[1] : null;
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Tag-balance check. Returns an array of problems; empty means balanced.
 * Content inside <script> and <style> is skipped, since it may contain
 * characters that look like markup.
 */
export function unbalancedTags(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!doctype[^>]*>/gi, '');

  const stack = [];
  const problems = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(body))) {
    const [, closing, rawName, rest] = m;
    const name = rawName.toLowerCase();
    if (VOID_ELEMENTS.has(name) || rest.trimEnd().endsWith('/')) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) problems.push(`</${name}> closed while <${open ?? 'nothing'}> was open`);
    } else {
      stack.push(name);
    }
  }
  if (stack.length) problems.push(`unclosed: ${stack.join(', ')}`);
  return problems;
}

/* ── Colour contrast (WCAG 2.1) ───────────────────────────────────────── */

export function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, 1–21. */
export function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Read a custom property's value out of a CSS file, from a given selector block. */
export function cssVar(css, name, selector = ':root') {
  const blockRe = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\}`);
  const block = css.match(blockRe);
  if (!block) return null;
  const varRe = new RegExp(`--${name}:\\s*([^;]+);`);
  const m = block[1].match(varRe);
  return m ? m[1].trim() : null;
}
