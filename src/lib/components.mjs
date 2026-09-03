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
 * The five-pointed star that sits between TRU and MEN.
 * Drawn rather than typed so it never depends on a font shipping a glyph.
 */
export function star({ size = 16, fill = 'currentColor', className = 'star' } = {}) {
  return `<svg class="${esc(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.6l2.9 7.1 7.7.5-5.9 4.9 1.9 7.4-6.6-4.1-6.6 4.1 1.9-7.4L1.4 9.2l7.7-.5z" fill="${esc(fill)}"/></svg>`;
}

/**
 * The TRU★MEN wordmark.
 *
 * @param {object}  o
 * @param {'sm'|'md'|'lg'|'xl'} o.size    visual scale
 * @param {boolean} o.productions         show the letterspaced PRODUCTIONS line
 * @param {boolean} o.motto               show "Viri Veri" beneath
 * @param {boolean} o.stacked             stack PRODUCTIONS under the wordmark
 */
export function wordmark({ size = 'md', productions = true, motto = false, className = '' } = {}) {
  return `
<span class="wordmark wordmark--${esc(size)} ${esc(className)}">
  <span class="wordmark__line">
    <span class="wordmark__word">TRU</span>${star({ size: 100, className: 'wordmark__star' })}<span class="wordmark__word">MEN</span>
  </span>
  ${when(productions, `<span class="wordmark__sub">Productions</span>`)}
  ${when(motto, `<span class="wordmark__motto">Viri Veri</span>`)}
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
