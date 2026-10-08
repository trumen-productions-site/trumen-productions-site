/**
 * The compliance lints, as functions — used by the test suite, the
 * production build and the counsel packet alike.
 *
 *   LINT-01  no forbidden string in the investor HTML or config
 *   CANON-01 canon facts exact wherever they appear
 *   NAMES    no proper name outside the allowlist
 *   REQ-01   required legal text and noindex on every investor page
 */

import { forbidden, allowedNames, canon } from '../config/lint/forbidden.mjs';

/** Site paths of the investor pages — the lint's scope. */
export const INVEST_PATHS = ['/invest/', '/invest/confirmed/', '/invest/received/', '/invest/not-accredited/', '/privacy/', '/terms/'];

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** Visible text of an HTML document: no scripts, styles, tags, or entities. */
const BLOCK = 'p|li|ul|ol|h[1-6]|div|section|article|header|footer|nav|dl|dt|dd|td|th|tr|summary|details|blockquote|figcaption|option|label|button|aside|fieldset|legend|form|main|sup';

export function visibleText(html) {
  return String(html)
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(new RegExp(`</?(?:${BLOCK})\\b[^>]*>`, 'gi'), '. ')
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Forbidden strings. `file` is the config filename when linting source, so
 * the legal file's permitted "guarantee" can be excepted; `features` lets a
 * gated phrase through when its gate's feature is on.
 */
export function lintForbidden(text, { file = null, features = {}, disclaimerText = null } = {}) {
  const problems = [];
  for (const rule of forbidden) {
    if (file && rule.exceptFiles?.includes(file)) continue;
    if (rule.gate === 'G_TAX' && features.taxSection) continue;
    // A rule the legal file may use is also permitted in the rendered
    // disclaimer footer; `disclaimerText` is the page text with that footer removed.
    const haystack = rule.exceptFiles && disclaimerText !== null ? disclaimerText : text;
    const m = haystack.match(rule.pattern);
    if (m) problems.push(`forbidden "${m[0]}" (${rule.reason})${file ? ` in ${file}` : ''}`);
  }
  return problems;
}

/** Canon facts: wherever a subject appears, it must be exact. */
export function lintCanon(text) {
  const problems = [];
  for (const rule of canon) {
    const re = new RegExp(rule.loose.source, rule.loose.flags.includes('g') ? rule.loose.flags : `${rule.loose.flags}g`);
    for (const m of text.matchAll(re)) {
      const found = m[1];
      if (found.toLowerCase() !== rule.exact.toLowerCase()) {
        problems.push(`canon: ${rule.subject} reads "${found}", must be "${rule.exact}" — near "${m[0].slice(0, 80)}"`);
      }
    }
  }
  return problems;
}

/**
 * Proper names. Every pair of consecutive capitalised words that is not at
 * the start of a sentence must be part of an allowed name.
 */
export function lintNames(text, { allow = allowedNames, extra = [] } = {}) {
  allow = [...allow, ...extra];
  const problems = new Set();
  const sentences = text.split(/(?<=[.!?:;—–·|])\s+|\.\s+/);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    for (let i = 1; i < words.length - 1; i++) {
      // A comma or other punctuation after the first word ends the name.
      if (/[,:;!?)”’]$/.test(words[i])) continue;
      const a = words[i].replace(/^[("“‘]+/g, '');
      const b = words[i + 1].replace(/^[("“‘]+|[)”’,:;!?.]+$/g, '');
      if (!/^[A-Z][a-z]+$/.test(a) || !/^[A-Z][a-z]+$/.test(b)) continue;
      const pair = `${a} ${b}`;
      if (allow.some((name) => name.includes(pair))) continue;
      problems.add(`name: "${pair}" is not in the allowlist (src/invest/config/lint/forbidden.mjs → allowedNames)`);
    }
  }
  return [...problems];
}

/** REQ-01: required text and noindex. */
export function lintRequired(html, sitePath) {
  const problems = [];
  const text = visibleText(html);
  if (!/<meta name="robots" content="noindex, ?nofollow">/.test(html)) problems.push(`${sitePath}: missing noindex,nofollow`);
  if (!text.includes('Accredited investors only')) problems.push(`${sitePath}: missing the accredited-only qualifier`);
  if (!text.includes('not an offer to sell')) problems.push(`${sitePath}: missing the not-an-offer block`);
  if (sitePath === '/invest/') {
    if (!text.includes('lose some or all')) problems.push(`${sitePath}: missing the risk sentence ("lose some or all")`);
    // Header and hero both carry the qualifier.
    const count = (text.match(/Accredited investors only/g) || []).length;
    if (count < 2) problems.push(`${sitePath}: the qualifier must appear in the header and in the hero (found ${count})`);
    if (!text.includes('Not an offer of securities')) problems.push(`${sitePath}: hero qualifier missing`);
  }
  return problems;
}

/** Every lint over a built investor page. */
export function lintPage(html, sitePath, { features = {}, extraNames = [] } = {}) {
  const text = visibleText(html);
  const disclaimerText = visibleText(html.replace(/<footer[\s\S]*?<\/footer>/i, ' '));
  return [
    ...lintForbidden(text, { features, disclaimerText }).map((p) => `${sitePath}: ${p}`),
    ...lintCanon(text).map((p) => `${sitePath}: ${p}`),
    ...lintNames(text, { extra: extraNames }).map((p) => `${sitePath}: ${p}`),
    ...lintRequired(html, sitePath),
  ];
}
