/**
 * Shared page components.
 *
 * Every one is a plain function returning an HTML string. They exist so a
 * heading, a rule, or the wordmark is defined once and looks identical on
 * every page.
 */

import { esc, each, when, attrs, raw } from './html.mjs';

/* ─────────────────────────────────────────────────────────────────────────
   The mark
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The faceted five-pointed star that sits between VIRI and VERI, in the three
 * golds of the supplied lockup (VIRI VERI Productions Logo, Option C,
 * October 7, 2026). The geometry is the logo's, normalised to a 24-unit box.
 * Drawn rather than typed so it never depends on a font shipping a glyph.
 */
export const STAR_FACETS = [
  { points: '11.76,11.29 12.11,0.0 14.82,7.79', fill: '#E9C24A' },
  { points: '11.76,11.29 14.82,7.79 22.73,8.06', fill: '#C9A03A' },
  { points: '11.76,11.29 22.73,8.06 16.49,12.94', fill: '#C9A03A' },
  { points: '11.76,11.29 16.49,12.94 21.18,24.0', fill: '#8A6A22' },
  { points: '11.76,11.29 21.18,24.0 12.11,16.12', fill: '#E9C24A' },
  { points: '11.76,11.29 12.11,16.12 5.68,20.37', fill: '#8A6A22' },
  { points: '11.76,11.29 5.68,20.37 7.73,12.94', fill: '#C9A03A' },
  { points: '11.76,11.29 7.73,12.94 1.27,7.99', fill: '#8A6A22' },
  { points: '11.76,11.29 1.27,7.99 9.4,7.79', fill: '#E9C24A' },
  { points: '11.76,11.29 9.4,7.79 12.11,0.0', fill: '#C9A03A' },
];

/** The star's outline, for a single-colour rendering. */
export const STAR_OUTLINE = '12.11,0.0 14.82,7.79 22.73,8.06 16.49,12.94 21.18,24.0 12.11,16.12 5.68,20.37 7.73,12.94 1.27,7.99 9.4,7.79';

/**
 * The star. Faceted by default; pass `fill` for one colour (an icon, a
 * monochrome field).
 */
export function star({ size = 16, fill = null, className = 'star' } = {}) {
  const body = fill
    ? `<polygon points="${STAR_OUTLINE}" fill="${esc(fill)}"/>`
    : STAR_FACETS.map((f) => `<polygon points="${f.points}" fill="${f.fill}"/>`).join('');
  return `<svg class="${esc(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * The VIRI★VERI Productions lockup — the supplied SVG, never rebuilt from
 * type. The image is decorative (alt=""); callers put the spoken name
 * beside it in a .visually-hidden span, as the header and footer do.
 *
 * @param {object}  o
 * @param {'sm'|'md'|'lg'|'xl'} o.size    visual scale
 * @param {'light'|'dark'} o.tone          the ground it sits on: light → navy letterforms, dark → cream
 * @param {boolean} o.motto               show "Men of truth" beneath
 */
export function wordmark({ size = 'md', tone = 'light', motto = false, className = '' } = {}) {
  const src = tone === 'dark' ? '/assets/img/viri-veri-lockup-navy.svg' : '/assets/img/viri-veri-lockup-transparent.svg';
  return `
<span class="wordmark wordmark--${esc(size)} ${esc(className)}">
  <img class="wordmark__lockup" src="${src}" alt="" width="2046" height="779" decoding="async">
  ${when(motto, `<span class="wordmark__motto">Men of truth</span>`)}
</span>`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Structure
   ───────────────────────────────────────────────────────────────────────── */

/** A small uppercase label above a heading. */
export function eyebrow(text, { tone = '' } = {}) {
  if (!text) return '';
  return `<p class="eyebrow${tone ? ` eyebrow--${esc(tone)}` : ''}">${raw(text)}</p>`;
}

/**
 * A numbered section header with a drawn rule, as used throughout the deck.
 * `number` is optional; omit it for unnumbered sections.
 */
export function sectionHead({ number, label, title, lede, id, level = 2, align = '' } = {}) {
  const H = `h${level}`;
  return `
<header class="section-head${align ? ` section-head--${esc(align)}` : ''}"${attrs({ id })}>
  <div class="rule" aria-hidden="true"></div>
  ${when(
    number || label,
    `<p class="eyebrow">${when(number, `<span class="eyebrow__num">${esc(number)}</span>`)}${when(label, raw(label))}</p>`,
  )}
  ${when(title, `<${H} class="section-head__title">${raw(title)}</${H}>`)}
  ${when(lede, `<p class="section-head__lede">${raw(lede)}</p>`)}
</header>`.trim();
}

/** A page's opening block: eyebrow, h1, standfirst. */
export function pageHeader({ eyebrow: eb, title, lede, meta, tone = 'paper' } = {}) {
  return `
<header class="page-header page-header--${esc(tone)}">
  <div class="container">
    ${when(eb, `<p class="eyebrow">${raw(eb)}</p>`)}
    <h1 class="page-header__title">${raw(title)}</h1>
    ${when(lede, `<p class="page-header__lede">${raw(lede)}</p>`)}
    ${when(meta, `<p class="page-header__meta">${raw(meta)}</p>`)}
  </div>
</header>`.trim();
}

/** A horizontal hairline that animates in on scroll. */
export function rule() {
  return `<div class="rule" aria-hidden="true"></div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Controls
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A link styled as a button.
 * @param {'primary'|'secondary'|'ghost'} o.variant
 */
export function btn({ href, label, variant = 'primary', external = false, className = '', ...rest } = {}) {
  const target = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return `<a class="btn btn--${esc(variant)} ${esc(className)}" href="${esc(href)}"${attrs({ ...target, ...rest })}>${raw(label)}${when(
    variant !== 'ghost',
    `<span class="btn__arrow" aria-hidden="true">→</span>`,
  )}</a>`;
}

/** A row of buttons. */
export function btnRow(buttons) {
  return `<div class="btn-row">${each(buttons, (b) => btn(b))}</div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Content blocks
   ───────────────────────────────────────────────────────────────────────── */

/** The statistic band: a big figure over a small label. */
export function statBand(stats, { tone = 'ink' } = {}) {
  return `
<div class="stat-band stat-band--${esc(tone)}">
  <dl class="stat-band__list">
    ${each(
      stats,
      (s) => `
    <div class="stat">
      <dt class="stat__label">${raw(s.label)}</dt>
      <dd class="stat__value">${raw(s.value)}</dd>
      ${when(s.detail, `<p class="stat__detail">${raw(s.detail)}</p>`)}
    </div>`,
    )}
  </dl>
</div>`.trim();
}

/** A pull quote with attribution and, optionally, its source line. */
export function pullQuote({ text, attribution, source, tone = '' } = {}) {
  return `
<figure class="quote${tone ? ` quote--${esc(tone)}` : ''}">
  <blockquote class="quote__text">${raw(text)}</blockquote>
  ${when(
    attribution,
    `<figcaption class="quote__cite">${raw(attribution)}${when(source, `<span class="quote__source">${raw(source)}</span>`)}</figcaption>`,
  )}
</figure>`.trim();
}

/** A numbered card — the deck's three-up pattern. */
export function numberedCard({ number, title, body, href, linkLabel } = {}) {
  const inner = `
  ${when(number, `<p class="card__num">${esc(number)}</p>`)}
  <h3 class="card__title">${raw(title)}</h3>
  ${when(body, `<p class="card__body">${raw(body)}</p>`)}
  ${when(href && linkLabel, `<p class="card__link"><span>${raw(linkLabel)}</span> <span aria-hidden="true">→</span></p>`)}`;
  return href
    ? `<a class="card card--link" href="${esc(href)}"><div class="rule" aria-hidden="true"></div>${inner}</a>`
    : `<div class="card"><div class="rule" aria-hidden="true"></div>${inner}</div>`;
}

/** A responsive grid of cards. `cols` is the desktop column count. */
export function cardGrid(cards, { cols = 3 } = {}) {
  return `<div class="card-grid card-grid--${cols}">${each(cards, (c) => numberedCard(c))}</div>`;
}

/**
 * A definition row: title, a short middle column, and a description.
 * Used for comparables and project facts.
 */
export function ruleRow({ title, meta, body } = {}) {
  return `
<div class="rule-row">
  <div class="rule" aria-hidden="true"></div>
  <div class="rule-row__inner">
    <p class="rule-row__title">${raw(title)}</p>
    ${when(meta, `<p class="rule-row__meta">${raw(meta)}</p>`)}
    ${when(body, `<p class="rule-row__body">${raw(body)}</p>`)}
  </div>
</div>`.trim();
}

/** A tag / pill. */
export function tag(text, { tone = 'neutral' } = {}) {
  return `<span class="tag tag--${esc(tone)}">${raw(text)}</span>`;
}
