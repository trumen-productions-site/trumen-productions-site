/**
 * The investor page, section by section (HANDOFF.md § 9).
 *
 * Every section is a function of the loaded config. Copy that varies with a
 * decision reads the config value through `val()`, so an undecided term
 * renders as a visible [[PENDING]] token rather than a guess. The footnote
 * engine threads through the sections that cite a term.
 */

import { esc, each, when, mailto } from '../lib/html.mjs';
import { wordmark, btn } from '../lib/components.mjs';
import { val, isPending, renderPending, text as pendingText } from './lib/pending.mjs';
import { createFootnotes } from './lib/footnotes.mjs';
import { money, moneyCompact, pct, multiple, amountRanges } from './lib/format.mjs';
import { keyArt } from './keyart.mjs';
import { icon } from './icons.mjs';
import { INTERESTS } from '../assets/js/invest/machine.js';

/* ─────────────────────────────────────────────────────────────────────────
   Chrome: ribbon, header, footer, sticky bar
   ───────────────────────────────────────────────────────────────────────── */

/** The red staging ribbon. Never rendered in a production build. */
export function ribbon(cfg) {
  if (cfg.isProduction) return '';
  return `<div class="inv-ribbon" role="status">Staging — not an offering · build ${esc(cfg.pageVersion)} · ${cfg.gateState.unsigned.length} of ${cfg.gateState.required.length} launch gates unsigned</div>`;
}

export function header(cfg, { questionnaire = false } = {}) {
  return `
<a class="skip-link" href="#main">Skip to content</a>
${when(questionnaire, '<a class="skip-link" href="#start">Skip to the questionnaire</a>')}
<header class="inv-header">
  <div class="inv-container inv-header__inner">
    <span class="inv-header__brand">${wordmark({ size: 'sm', productions: true })}<span class="visually-hidden">TruMen Productions</span></span>
    <p class="inv-header__qualifier">${esc(cfg.legal.qualifier.replace(/\.$/, ''))}</p>
  </div>
</header>`.trim();
}

/** The legal footer (§ 9.15): structure, not-an-offer, story notice, entity. */
export function footer(cfg, { includeStructure = true } = {}) {
  const { legal, offering, investSite, features } = cfg;
  const year = new Date().getFullYear();
  const structure = [
    offering.exemption === '506(c)' ? legal.structure.exemption506c : null,
    offering.exemption === '506(c)' ? legal.structure.verification : null,
    offering.escrow === true ? legal.structure.escrow : null,
    offering.collectionAccount === true ? legal.structure.collectionAccount : null,
  ].filter(Boolean);
  const structurePending = [offering.exemption, offering.escrow, offering.collectionAccount].filter(isPending);

  return `
<footer class="inv-footer on-ink">
  <div class="inv-container inv-footer__grid">
    ${when(
      includeStructure,
      `<section class="inv-footer__block" aria-labelledby="f-structure">
      <h2 class="inv-footer__heading" id="f-structure">The offering structure</h2>
      ${when(structure.length, `<p>${structure.map(esc).join(' ')}</p>`)}
      ${when(structurePending.length, `<p>${structurePending.map(renderPending).join(' ')}</p>`)}
    </section>`,
    )}
    <section class="inv-footer__block" aria-labelledby="f-offer">
      <h2 class="inv-footer__heading" id="f-offer">Not an offer</h2>
      ${each(legal.notAnOffer, (p) => `<p>${esc(p)}</p>`)}
    </section>
    <section class="inv-footer__block" aria-labelledby="f-story">
      <h2 class="inv-footer__heading" id="f-story">The story</h2>
      <p>${esc(legal.storyNotice)}</p>
    </section>
    <div class="inv-footer__entity">
      ${wordmark({ size: 'md', productions: true, motto: true })}
      <p class="inv-footer__legal">© ${year} ${esc(offering.sponsor.legalName)}${when(cfg.derived.showBrandInFooter, ` d/b/a ${esc(offering.sponsor.brand)}`)}</p>
      <p class="inv-footer__legal">${esc(investSite.entity.address)}</p>
      <p class="inv-footer__legal"><a href="${esc(mailto(investSite.contact.email, investSite.contact.subject))}">${esc(investSite.contact.email)}</a></p>
      <nav class="inv-footer__links" aria-label="Legal">
        <a href="/privacy/">Privacy</a>
        ${when(features.sms, `<a href="/terms/">SMS Terms</a>`)}
      </nav>
    </div>
  </div>
</footer>`.trim();
}

/** The persistent mobile call to action (§ 9.16). Hidden until the hero scrolls out. */
export function stickyCta() {
  return `
<div class="inv-sticky" data-sticky hidden>
  <a class="btn btn--primary inv-sticky__btn" href="#start">See if you qualify<span class="btn__arrow" aria-hidden="true">→</span></a>
</div>`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared pieces
   ───────────────────────────────────────────────────────────────────────── */

function sectionHead({ id, eyebrow, title, lede }) {
  return `
<header class="inv-section__head">
  <div class="inv-rule" aria-hidden="true"><span></span></div>
  ${when(eyebrow, `<p class="eyebrow">${esc(eyebrow)}</p>`)}
  <h2 class="inv-section__title" id="${esc(id)}">${title}</h2>
  ${when(lede, `<p class="inv-section__lede">${lede}</p>`)}
</header>`.trim();
}

function ctaBand({ id, text, label = 'See if you qualify', tone = 'ink' }) {
  return `
<section class="inv-band ${tone === 'ink' ? 'on-ink inv-band--ink' : 'inv-band--brass'}" aria-label="${esc(text)}" id="${esc(id)}">
  <div class="inv-container inv-band__inner">
    <p class="inv-band__text">${esc(text)}</p>
    ${btn({ href: '#start', label, variant: 'primary' })}
  </div>
</section>`.trim();
}

/** Resolve the value a stat tile shows. */
function tileValue(tile, cfg) {
  const { offering, legal } = cfg;
  switch (tile.value) {
    case 'minimum':
      return val(offering.minimum, (n) => esc(moneyCompact(n)));
    case 'waterfall':
      return val(offering.waterfall, (w) => esc(pct(w.investorFirstPct)));
    case 'totalRaise':
      return val(offering.totalRaise, (n) => esc(moneyCompact(n)));
    case 'targetReturn':
      return esc(multiple(offering.targetReturn.multiple));
    case 'tax':
      return esc(legal.tax.tile);
    case 'format':
      return val(offering.production, (p) => esc(p.formatLabel));
    default:
      return '';
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Sections
   ───────────────────────────────────────────────────────────────────────── */

export function hero(cfg) {
  const { offering, legal } = cfg;
  const p = offering.production;
  return `
<section class="inv-hero on-ink" id="top" aria-labelledby="hero-title">
  <div class="inv-container inv-hero__grid">
    <div class="inv-hero__copy">
      <p class="eyebrow">Private offering</p>
      <h1 class="inv-hero__title" id="hero-title">Own a piece of <em>the record</em>.</h1>
      <p class="inv-hero__body">
        CLEARLY ESTABLISHED is ${val(p, (x) => esc(x.descriptor))}, drawn from State v. Martin, the case in which a
        unanimous South Carolina Supreme Court reversed a wrongful conviction on March 27, 2000. The man it happened
        to is writing and producing it. ${val(p, (x) => val(x.shootWindow, (w) => esc(w)))}, ${val(p, (x) => esc(x.shootLocation))}.
      </p>
      <div class="btn-row">
        ${btn({ href: '#start', label: 'See if you qualify', variant: 'primary' })}
        ${btn({ href: '#why', label: 'How this offering works', variant: 'secondary' })}
      </div>
      <p class="inv-hero__qualifier">${esc(legal.qualifierLong)}</p>
    </div>
    <div class="inv-hero__art">${keyArt({ decorative: true })}</div>
  </div>
</section>`.trim();
}

export function statStrip(cfg, fn) {
  const tiles = cfg.derived.tilesShown;
  return `
<section class="inv-stats" id="terms" aria-label="Key terms">
  <div class="inv-container">
    <dl class="inv-stats__grid inv-stats__grid--${tiles.length}">
      ${each(
        tiles,
        (t) => `
      <div class="inv-stat">
        <dt class="inv-stat__label">${esc(t.label)}</dt>
        <dd class="inv-stat__value">${tileValue(t, cfg)}${when(t.footnoteId, () => fn.mark(t.footnoteId))}</dd>
      </div>`,
      )}
    </dl>
    ${fn.flush({ heading: 'Notes on the terms' })}
  </div>
</section>`.trim();
}

export function storySection(cfg) {
  const { story, derived } = cfg;
  const bullets = story.bullets.filter((b) => !b.onlyFor || (b.onlyFor === 'vertical-series' && derived.isVertical));
  return `
<section class="inv-section" aria-labelledby="the-case">
  <div class="inv-container inv-measure">
    ${sectionHead({ id: 'the-case', eyebrow: 'The story', title: esc(story.heading) })}
    <p class="inv-logline">${esc(derived.storyVariant.logline)}</p>
    <ol class="inv-timeline" aria-label="Timeline">
      ${each(story.timeline, (t) => `<li><span class="inv-timeline__date">${esc(t.date)}</span><span class="inv-timeline__label">${esc(t.label)}</span></li>`)}
    </ol>
    <h3 class="inv-subhead">Why this travels</h3>
    <ul class="inv-bullets">
      ${each(bullets, (b) => `<li><strong>${esc(b.title)}</strong> ${esc(b.body)}</li>`)}
    </ul>
  </div>
</section>`.trim();
}

export function whySection(cfg, fn) {
  const { offering, legal, features, perks, gateState } = cfg;
  const cards = [];

  if (features.taxSection && legal.tax) {
    cards.push({ eyebrow: 'Tax', title: 'Tax treatment', body: `<p>${esc(legal.tax.card)}${fn.mark('tax')}</p>` });
  }

  const structureLines = [
    offering.escrow === true ? 'Subscription funds are held in escrow until closing.' : null,
    offering.collectionAccount === true ? 'Revenues flow through a third-party collection account.' : null,
  ].filter(Boolean);
  cards.push({
    eyebrow: 'Structure',
    title: 'First-position payback',
    body: `<p>${val(offering.waterfall, (w) => `${esc(pct(w.investorFirstPct))} returned to investors before producers share in profit`)}${fn.mark('waterfall')}.</p>${when(
      structureLines.length,
      `<ul>${each(structureLines, (l) => `<li>${esc(l)}</li>`)}</ul>`,
    )}`,
  });

  const work = [
    'A completed memoir manuscript.',
    'A locked feature screenplay.',
    'Episodes 1–11 of the series, scripted.',
    'Rights held by Revelatory Productions, LLC under a written agreement.',
  ];
  if (gateState.signed.includes('G_COPYRIGHT')) work.push('Copyright applications filed for the works.');
  if (gateState.signed.includes('G_TRADEMARK')) work.push('Trademark application filed for the mark.');
  cards.push({ eyebrow: 'The work', title: 'Material that exists', body: `<ul>${each(work, (w) => `<li>${esc(w)}</li>`)}</ul>` });

  cards.push({
    eyebrow: 'The experience',
    title: 'Inside the production',
    body: `<p>${esc(perks.map((p) => p.title).join(' · '))}. <a href="#perks">The perks in full.</a></p>`,
  });

  return `
<section class="inv-section inv-section--dim" aria-labelledby="why">
  <div class="inv-container">
    ${sectionHead({ id: 'why', eyebrow: 'How it works', title: 'Why investors participate', lede: 'Head, wallet, heart — in that order.' })}
    <div class="inv-cards inv-cards--3">
      ${each(
        cards,
        (c, i) => `
      <article class="inv-card">
        <p class="inv-card__num">0${i + 1} · ${esc(c.eyebrow)}</p>
        <h3 class="inv-card__title">${esc(c.title)}</h3>
        <div class="inv-card__body">${c.body}</div>
      </article>`,
      )}
    </div>
    ${fn.flush({ heading: 'Notes on the structure' })}
  </div>
</section>`.trim();
}

/** The flow's server-side scaffold. flow.js takes over; without it, the form posts. */
export function flowSection(cfg) {
  const { legal, features, investSite, pageVersion } = cfg;
  return `
<section class="inv-section inv-flow" aria-labelledby="start-title" id="start-section">
  <div class="inv-container inv-measure">
    ${sectionHead({ id: 'start-title', eyebrow: 'Start here', title: 'See if you qualify, then pick a time.', lede: `Six short steps. The last two book ${esc(String(investSite.booking.durationMinutes))} minutes with ${esc(investSite.booking.hostTitle)}.` })}
    <div id="start" class="inv-flow__stage" tabindex="-1">
      <p class="inv-flow__progress" data-flow-progress aria-live="polite">Step 1 of 6 · About 30 seconds</p>
      <div class="inv-flow__root" data-flow-root hidden></div>
      <form class="inv-flow__fallback" data-flow-fallback method="post" action="/api/lead" novalidate>
        <input type="hidden" name="fallback" value="1">
        <input type="hidden" name="page_version" value="${esc(pageVersion)}">
        <fieldset class="inv-field">
          <legend>Are you an accredited investor?</legend>
          <label class="inv-choice" for="fb-acc-yes"><input type="radio" id="fb-acc-yes" name="accredited" value="yes" required> Yes</label>
          <label class="inv-choice" for="fb-acc-no"><input type="radio" id="fb-acc-no" name="accredited" value="no_or_unsure" required> No, or I’m not sure</label>
          <details class="inv-help"><summary>What counts as accredited?</summary>
            <ul>${each(legal.accreditedHelp, (h) => `<li>${esc(h)}</li>`)}</ul>
            <p>${esc(legal.accreditedHelpNote)}</p>
          </details>
        </fieldset>
        <div class="inv-field"><label for="fb-name">Your name</label><input id="fb-name" name="name" type="text" autocomplete="name" required></div>
        <div class="inv-field"><label for="fb-email">Email</label><input id="fb-email" name="email" type="email" autocomplete="email" required></div>
        <div class="inv-field"><label for="fb-phone">Phone</label><input id="fb-phone" name="phone" type="tel" autocomplete="tel" required></div>
        ${when(
          features.sms,
          `<div class="inv-field inv-field--consent"><label class="inv-choice" for="fb-sms"><input type="checkbox" id="fb-sms" name="smsConsent" value="on"> ${esc(legal.consents.sms)}</label></div>`,
        )}
        <div class="inv-honeypot" aria-hidden="true"><label for="fb-website">Leave this field empty</label><input id="fb-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        <p class="inv-flow__note">Without JavaScript we can’t show the calendar here. Send your details and we will reply by email within one business day with times to choose from.</p>
        <button class="btn btn--primary" type="submit">Send my details<span class="btn__arrow" aria-hidden="true">→</span></button>
      </form>
      <p class="inv-flow__standing" data-flow-standing hidden>${esc(legal.flowLines.notConfirmed)}</p>
      <p class="inv-flow__standing">${esc(legal.flowLines.notSubscription)}</p>
    </div>
  </div>
</section>`.trim();
}

/** The configuration the browser island reads. Escaped so it cannot break out of its script tag. */
export function flowConfig(cfg) {
  const { offering, legal, features, investSite, pageVersion } = cfg;
  const ranges = isPending(offering.minimum)
    ? { pending: offering.minimum.pending, options: [{ id: 'r0', label: 'I’d rather discuss the amount on the call' }] }
    : { pending: null, options: [...amountRanges(offering.minimum), { id: 'r9', label: 'I’d rather discuss the amount on the call' }] };
  const data = {
    apiBase: '/api',
    totalSteps: 6,
    durationMinutes: investSite.booking.durationMinutes,
    hostTitle: investSite.booking.hostTitle,
    ranges,
    interests: INTERESTS,
    accreditedHelp: legal.accreditedHelp,
    accreditedHelpNote: legal.accreditedHelpNote,
    lines: legal.flowLines,
    sms: features.sms,
    smsConsentText: legal.consents.sms,
    followList: features.followList,
    followListText: legal.consents.followList,
    turnstileSiteKey: investSite.turnstile.siteKey,
    pageVersion,
    confirmedPath: '/invest/confirmed/',
    utmKeys: investSite.utmKeys,
    minimumLabel: pendingText(offering.minimum, money),
    contactEmail: investSite.contact.email,
  };
  return `<script type="application/json" id="invest-flow-config">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function compsSection(cfg) {
  const { features, comps, compsCaption } = cfg;
  if (!features.comps || comps.length < 3) return '';
  return `
<section class="inv-section" aria-labelledby="comparables">
  <div class="inv-container">
    ${sectionHead({ id: 'comparables', eyebrow: 'Comparables', title: 'True stories, modest budgets' })}
    <ul class="inv-comps" role="list">
      ${each(
        comps,
        (c) => `
      <li class="inv-comp">
        <h3 class="inv-comp__title">${esc(c.title)} <span class="inv-comp__year">${esc(String(c.year))}</span></h3>
        <p class="inv-comp__figures"><span>${esc(c.budget)}</span><span class="inv-comp__arrow" aria-hidden="true">→</span><span>${esc(c.gross)}</span></p>
        <p class="inv-comp__label">${esc(c.grossLabel)} · <a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source: ${esc(c.sourceName)}</a></p>
      </li>`,
      )}
    </ul>
    <p class="inv-caption">${esc(compsCaption)}</p>
  </div>
</section>`.trim();
}

export function teamSection(cfg) {
  const { team, counsel, features } = cfg;
  return `
<section class="inv-section inv-section--dim" aria-labelledby="team">
  <div class="inv-container">
    ${sectionHead({ id: 'team', eyebrow: 'The people', title: 'Written by the people who lived it' })}
    <div class="inv-cards inv-cards--2">
      ${each(
        team,
        (m) => `
      <article class="inv-card inv-person">
        <h3 class="inv-card__title">${esc(m.name)}</h3>
        <p class="inv-person__credits">${esc(m.credits)}</p>
        <ul class="inv-card__body">${each(m.bullets, (b) => `<li>${esc(b)}</li>`)}</ul>
      </article>`,
      )}
    </div>
    ${when(features.counselDisplay, `<p class="inv-caption">${esc(counsel.role)}: ${esc(counsel.name)}, ${esc(counsel.firm)}.</p>`)}
  </div>
</section>`.trim();
}

export function marketingSection(cfg) {
  const { features, marketing } = cfg;
  if (!features.marketing) return '';
  return `
<section class="inv-section" aria-labelledby="marketing">
  <div class="inv-container">
    ${sectionHead({ id: 'marketing', eyebrow: 'The plan', title: esc(marketing.heading), lede: esc(marketing.lede) })}
    <div class="inv-cards inv-cards--3">
      ${each(
        marketing.cards,
        (c) => `
      <article class="inv-card inv-card--icon">
        ${icon(c.icon)}
        <h3 class="inv-card__title">${esc(c.title)}</h3>
        <p class="inv-card__body">${esc(c.body)}</p>
      </article>`,
      )}
    </div>
  </div>
</section>`.trim();
}

export function perksSection(cfg) {
  const { perks, perksCaption } = cfg;
  return `
<section class="inv-section inv-section--dim" aria-labelledby="perks">
  <div class="inv-container">
    ${sectionHead({ id: 'perks', eyebrow: 'Perks', title: 'What investors are part of' })}
    <div class="inv-cards inv-cards--3">
      ${each(
        perks,
        (p) => `
      <article class="inv-card inv-card--icon">
        ${icon(p.icon)}
        <h3 class="inv-card__title">${esc(p.title)}</h3>
        <p class="inv-card__body">${esc(p.body)}</p>
        <p class="inv-card__meta">${val(p.level, (l) => esc(l))}</p>
      </article>`,
      )}
    </div>
    <p class="inv-caption">${esc(perksCaption)}</p>
  </div>
</section>`.trim();
}

export function useOfFundsSection(cfg) {
  const { offering } = cfg;
  const u = offering.useOfFunds;
  return `
<section class="inv-section" aria-labelledby="use-of-funds">
  <div class="inv-container inv-measure">
    ${sectionHead({ id: 'use-of-funds', eyebrow: 'Where the money goes', title: 'Use of funds' })}
    ${
      isPending(u)
        ? `<p class="inv-logline">${renderPending(u)}</p>`
        : `<div class="inv-funds__bar" role="img" aria-label="${esc(u.map((x) => `${x.label} ${pct(x.pct)}`).join(', '))}">
      ${each(u, (x, i) => `<span class="inv-funds__seg inv-funds__seg--${i % 5}" style="flex-basis:${x.pct}%"></span>`)}
    </div>
    <dl class="inv-funds__list">
      ${each(u, (x, i) => `<div class="inv-funds__row"><dt><span class="inv-funds__dot inv-funds__seg--${i % 5}" aria-hidden="true"></span>${esc(x.label)}</dt><dd>${esc(pct(x.pct))}</dd></div>`)}
    </dl>`
    }
    <p class="inv-caption">Allocations are approximate and subject to the final budget.</p>
  </div>
</section>`.trim();
}

export function faqSection(cfg) {
  const { faq, offering, legal } = cfg;
  const ctx = {
    issuer: (f) => val(offering.issuer, (i) => esc(f(i))),
    production: val(offering.production, (p) => esc(p.title)),
    minimum: val(offering.minimum, (n) => esc(money(n))),
    waterfall: val(
      offering.waterfall,
      (w) => `${esc(pct(w.investorFirstPct))} of distributable receipts go to investors first, until that amount has been returned. After that, ${esc(w.thenSplit)}.`,
    ),
    verification: val(legal.verification, (v) => esc(v)),
  };
  return `
<section class="inv-section inv-section--dim" aria-labelledby="faq">
  <div class="inv-container inv-measure">
    ${sectionHead({ id: 'faq', eyebrow: 'Questions', title: 'Asked, answered' })}
    <div class="faq-list">
      ${each(
        faq,
        (item) => `
      <details class="faq-item" id="faq-${esc(item.id)}">
        <summary><span>${esc(item.q)}</span><span class="faq-item__icon" aria-hidden="true"></span></summary>
        <div class="faq-item__answer"><p>${typeof item.a === 'function' ? item.a(ctx) : esc(item.a)}</p></div>
      </details>`,
      )}
    </div>
  </div>
</section>`.trim();
}

export function finalCta(cfg) {
  return `
<section class="inv-final on-ink" aria-labelledby="final-title">
  <div class="inv-container inv-final__inner">
    <h2 class="inv-final__title" id="final-title">Questions answered? Let’s talk.</h2>
    <p class="inv-final__lede">${esc(String(cfg.investSite.booking.durationMinutes))} minutes with ${esc(cfg.investSite.booking.hostTitle)}. Pick your time.</p>
    ${btn({ href: '#start', label: 'See if you qualify', variant: 'primary' })}
    <p class="inv-final__note">No commitment. No pressure. Just answers.</p>
  </div>
</section>`.trim();
}

/* ─────────────────────────────────────────────────────────────────────────
   The page
   ───────────────────────────────────────────────────────────────────────── */

export function investBody(cfg) {
  const fn = createFootnotes(cfg.legal.footnotes);
  const html = [
    hero(cfg),
    statStrip(cfg, fn),
    storySection(cfg),
    whySection(cfg, fn),
    flowSection(cfg),
    flowConfig(cfg),
    compsSection(cfg),
    teamSection(cfg),
    ctaBand({ id: 'cta-mid', text: `Still reading? The fastest way through is ${cfg.investSite.booking.durationMinutes} minutes with ${cfg.investSite.booking.hostTitle}.` }),
    marketingSection(cfg),
    perksSection(cfg),
    useOfFundsSection(cfg),
    ctaBand({ id: 'cta-late', text: 'Seen enough?', tone: 'brass' }),
    faqSection(cfg),
    finalCta(cfg),
  ].join('\n\n');

  fn.assertFlushed();
  // Footnotes attached to tiles that are hidden by their condition are allowed to go unused.
  fn.assertAllUsed(cfg.derived.tilesHidden.map((t) => t.footnoteId).filter(Boolean));
  return html;
}
