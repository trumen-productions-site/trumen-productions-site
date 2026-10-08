/**
 * The investor config, loaded, validated and resolved in one place.
 *
 * Pages import `loadConfig()` and nothing else from config/. It validates
 * every file against its schema (test CFG-01), enforces the cross-file rules
 * (use of funds sums to 100, 506(b) is refused, a tile's footnote exists),
 * and returns the raw config plus the derived facts sections need.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { s } from '../lib/schema.mjs';
import { isPending, collectPending } from '../lib/pending.mjs';
import { evaluateGates } from '../lib/gates.mjs';
import { buildEnv, gitSha } from '../lib/env.mjs';

import { features } from './features.mjs';
import { offering } from './offering.mjs';
import { legal } from './legal.mjs';
import { story } from './story.mjs';
import { comps, candidates, caption as compsCaption } from './comps.mjs';
import { team, counsel } from './team.mjs';
import { perks, caption as perksCaption } from './perks.mjs';
import { faq } from './faq.mjs';
import { marketing } from './marketing.mjs';
import { investSite } from './site.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function readGates() {
  const raw = JSON.parse(readFileSync(path.join(HERE, 'gates.json'), 'utf8'));
  delete raw._comment;
  return raw;
}

/* ── Schemas ──────────────────────────────────────────────────────────── */

const Tile = s.object({
  id: s.string({ min: 1 }),
  label: s.string({ min: 1 }),
  value: s.enum(['minimum', 'waterfall', 'totalRaise', 'targetReturn', 'tax', 'format']),
  footnoteId: s.optional(s.string({ min: 1 })),
  requires: s.optional(s.enum(['G_TAX', 'targetReturnBasis'])),
  show: s.boolean(),
});

const UseOfFunds = s.refine(
  s.array(s.object({ label: s.string({ min: 1 }), pct: s.number({ min: 0, max: 100 }) }), { min: 2 }),
  (list) => Math.abs(list.reduce((sum, x) => sum + x.pct, 0) - 100) < 0.001,
  'use of funds must sum to 100 (test CFG-03)',
);

export const OfferingSchema = s.object({
  production: s.pendingOr(
    s.object({
      title: s.string({ min: 1 }),
      format: s.enum(['vertical-series', 'feature', 'limited-series']),
      descriptor: s.string({ min: 1 }),
      formatLabel: s.string({ min: 1 }),
      shootLocation: s.string({ min: 1 }),
      shootWindow: s.pendingOr(s.string({ min: 1 })),
    }),
  ),
  issuer: s.pendingOr(s.object({ legalName: s.string({ min: 1 }), state: s.string({ min: 2 }) })),
  sponsor: s.object({
    legalName: s.literal('Revelatory Productions, LLC'),
    brand: s.literal('VIRI VERI Productions'),
    brandCleared: s.boolean(),
  }),
  exemption: s.pendingOr(s.enum(['506(c)', '506(b)', 'other'])),
  totalRaise: s.pendingOr(s.number({ min: 1 })),
  minimum: s.pendingOr(s.number({ min: 1 })),
  waterfall: s.pendingOr(s.object({ investorFirstPct: s.number({ min: 0, max: 1000 }), thenSplit: s.string({ min: 1 }) })),
  targetReturn: s.optional(s.object({ multiple: s.number({ min: 0 }), basisDocOnFile: s.boolean() })),
  escrow: s.pendingOr(s.boolean()),
  collectionAccount: s.pendingOr(s.boolean()),
  useOfFunds: s.pendingOr(UseOfFunds),
  tiles: s.array(Tile, { min: 1 }),
});

export const LegalSchema = s.object({
  footnotes: s.record(s.string({ min: 10 })),
  structure: s.record(s.string({ min: 10 })),
  notAnOffer: s.array(s.string({ min: 10 }), { min: 3 }),
  risk: s.string({ pattern: /lose some or all/ }),
  storyNotice: s.string({ pattern: /Op\. No\. 25093/ }),
  qualifier: s.string({ pattern: /^Accredited investors only\./ }),
  qualifierLong: s.string({ pattern: /^Accredited investors only\. Not an offer of securities\.$/ }),
  accreditedHelp: s.array(s.string({ min: 10 }), { min: 3 }),
  accreditedHelpNote: s.string({ min: 10 }),
  verification: s.pendingOr(s.string({ min: 10 })),
  consents: s.object({ sms: s.string({ min: 10 }), analytics: s.string({ min: 10 }), followList: s.string({ min: 10 }) }),
  tax: s.nullable(s.object({ card: s.string({ min: 10 }), tile: s.string({ min: 1 }), signedBy: s.string({ min: 1 }), signedOn: s.string({ pattern: /^\d{4}-\d{2}-\d{2}$/ }) })),
  flowLines: s.object({ notConfirmed: s.string({ min: 5 }), notSubscription: s.string({ min: 5 }), endScreen: s.string({ min: 5 }) }),
  retention: s.pendingOr(s.string({ min: 10 })),
});

export const StorySchema = s.object({
  variant: s.enum(['A_conservative', 'B_canon']),
  variants: s.array(
    s.object({
      id: s.enum(['A_conservative', 'B_canon']),
      logline: s.string({ min: 50 }),
      approvedBy: s.optional(s.string({ min: 1 })),
      approvedOn: s.optional(s.string({ pattern: /^\d{4}-\d{2}-\d{2}$/ })),
    }),
    { min: 2 },
  ),
  heading: s.string({ min: 1 }),
  bullets: s.array(s.object({ title: s.string({ min: 1 }), body: s.string({ min: 1 }), onlyFor: s.optional(s.string()) }), { min: 3 }),
  timeline: s.array(s.object({ date: s.string({ min: 4 }), label: s.string({ min: 1 }) }), { min: 3 }),
});

const CompBase = {
  title: s.string({ min: 1 }),
  year: s.number({ min: 1900, max: 2100, integer: true }),
  budget: s.string({ pattern: /^\$/ }),
  gross: s.string({ pattern: /^\$/ }),
  grossLabel: s.string({ min: 1 }),
  sourceUrl: s.string({ pattern: /^https:\/\// }),
  sourceName: s.string({ min: 1 }),
};
export const CompSchema = s.object({ ...CompBase, verifiedOn: s.string({ pattern: /^\d{4}-\d{2}-\d{2}$/ }) });
export const CandidateSchema = s.object({ ...CompBase, note: s.string({ min: 1 }) });

export const TeamSchema = s.array(
  s.object({
    name: s.string({ min: 1 }),
    credits: s.string({ min: 1 }),
    bullets: s.array(s.string({ min: 1 }), { min: 3 }),
    photo: s.nullable(s.string({ min: 1 })),
  }),
  { min: 2 },
);

export const PerkSchema = s.array(
  s.object({
    id: s.string({ min: 1 }),
    title: s.string({ min: 1 }),
    body: s.string({ min: 1 }),
    level: s.pendingOr(s.string({ min: 1 })),
    icon: s.enum(['credit', 'set', 'premiere', 'festival', 'dinner', 'updates']),
  }),
  { min: 6 },
);

export const FaqSchema = s.array(
  s.object({ id: s.string({ min: 1 }), q: s.string({ min: 5 }), a: s.union(s.string({ min: 5 }), s.function()), counselNote: s.optional(s.string()) }),
  { min: 4 },
);

export const MarketingSchema = s.object({
  heading: s.string({ min: 1 }),
  lede: s.string({ min: 1 }),
  cards: s.array(s.object({ id: s.string({ min: 1 }), title: s.string({ min: 1 }), body: s.string({ min: 1 }), icon: s.enum(['document', 'premiere', 'audience']) }), { min: 3 }),
});

export const SiteSchema = s.object({
  domain: s.pendingOr(s.string({ pattern: /^https:\/\/[a-z0-9.-]+$/ })),
  contact: s.object({ email: s.string({ pattern: /^[^@\s]+@[^@\s]+\.[a-z]+$/i }), subject: s.string({ min: 1 }) }),
  entity: s.object({ legalName: s.string({ min: 1 }), brand: s.literal('VIRI VERI Productions'), address: s.string({ min: 10 }) }),
  booking: s.object({
    host: s.pendingOr(s.object({ name: s.string({ min: 1 }), calendar: s.string({ min: 1 }) })),
    hostTitle: s.string({ min: 1 }),
    durationMinutes: s.number({ min: 15, max: 120, integer: true }),
    prepare: s.array(s.string({ min: 5 }), { min: 1 }),
  }),
  turnstile: s.object({ siteKey: s.string({ min: 10 }) }),
  meta: s.object({ title: s.string({ min: 1 }), description: s.string({ min: 20 }) }),
  utmKeys: s.array(s.string({ min: 1 }), { min: 6 }),
});

export const FeaturesSchema = s.object({
  taxSection: s.boolean(),
  castingComps: s.boolean(),
  followList: s.boolean(),
  sms: s.boolean(),
  metaPixel: s.boolean(),
  counselDisplay: s.boolean(),
  comps: s.boolean(),
  marketing: s.boolean(),
});

/* ── Cross-file rules ─────────────────────────────────────────────────── */

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

/** Validate every config module. Throws on the first schema with problems. */
export function validateConfig(cfg = rawConfig()) {
  const problems = [
    ...FeaturesSchema.problems(cfg.features, 'features'),
    ...OfferingSchema.problems(cfg.offering, 'offering'),
    ...LegalSchema.problems(cfg.legal, 'legal'),
    ...StorySchema.problems(cfg.story, 'story'),
    ...s.array(CompSchema).problems(cfg.comps, 'comps'),
    ...s.array(CandidateSchema).problems(cfg.candidates, 'candidates'),
    ...TeamSchema.problems(cfg.team, 'team'),
    ...PerkSchema.problems(cfg.perks, 'perks'),
    ...FaqSchema.problems(cfg.faq, 'faq'),
    ...MarketingSchema.problems(cfg.marketing, 'marketing'),
    ...SiteSchema.problems(cfg.investSite, 'site'),
  ];

  // A tile must point at a footnote that exists (FN-02 at config level).
  for (const tile of cfg.offering.tiles) {
    if (tile.footnoteId && !(tile.footnoteId in cfg.legal.footnotes)) {
      problems.push(`offering.tiles[${tile.id}]: footnote "${tile.footnoteId}" is not defined in legal.footnotes`);
    }
  }

  // The tax tile and card read only signed wording.
  if (cfg.features.taxSection && !cfg.legal.tax) {
    problems.push('features.taxSection is on but legal.tax is null — the tax wording must be signed first');
  }

  // Variant B needs an approver.
  const chosen = cfg.story.variants.find((v) => v.id === cfg.story.variant);
  if (!chosen) problems.push(`story.variant "${cfg.story.variant}" is not one of the variants`);
  else if (chosen.id === 'B_canon' && !chosen.approvedBy) problems.push('story.variant B_canon requires approvedBy');

  // Comps on means at least three verified comps.
  if (cfg.features.comps && cfg.comps.length < 3) {
    problems.push(`features.comps is on but only ${cfg.comps.length} verified comparable(s) exist — need 3, or turn the flag off`);
  }

  if (problems.length) throw new ConfigError(`Investor config is invalid:\n  - ${problems.join('\n  - ')}`);
  return cfg;
}

/**
 * Rules that only a production build enforces (GATE-03). A staging build
 * reports them without failing so the page can be reviewed.
 */
export function productionProblems(cfg) {
  const out = [];
  if (cfg.offering.exemption === '506(b)') {
    out.push('506(b) does not permit general solicitation; this page cannot be advertised');
  }
  if (/^[123]x0000/.test(cfg.investSite.turnstile.siteKey)) {
    out.push('site.turnstile.siteKey is the Cloudflare Turnstile test key; set the real site key before a production build');
  }
  if (cfg.offering.targetReturn && !cfg.offering.targetReturn.basisDocOnFile) {
    out.push('offering.targetReturn is set but no basis document is on file; remove it or set basisDocOnFile');
  }
  return out;
}

/* ── Assemble ─────────────────────────────────────────────────────────── */

/**
 * Deep-merge an override onto the config. Objects merge recursively, arrays
 * merge by index, a Pending is replaced by whatever the override supplies.
 * Used by the test suite (INVEST_CONFIG_OVERRIDE=path.json) to prove the
 * production path with a fully decided fixture. Never used by a deploy.
 */
export function mergeConfig(base, override) {
  if (override === undefined) return base;
  if (Array.isArray(base) && Array.isArray(override)) {
    return base.map((item, i) => (i < override.length ? mergeConfig(item, override[i]) : item)).concat(override.slice(base.length));
  }
  if (isPending(base)) return override;
  if (base && typeof base === 'object' && !Array.isArray(base) && override && typeof override === 'object' && !Array.isArray(override)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) out[k] = mergeConfig(base[k], v);
    return out;
  }
  return override;
}

function readOverride() {
  const file = process.env.INVEST_CONFIG_OVERRIDE;
  if (!file) return null;
  return JSON.parse(readFileSync(path.resolve(file), 'utf8'));
}

export function rawConfig() {
  const override = readOverride();
  const base = {
    features,
    offering,
    legal,
    story,
    comps,
    candidates,
    compsCaption,
    team,
    counsel,
    perks,
    perksCaption,
    faq,
    marketing,
    investSite,
  };
  if (!override) return base;
  const merged = {};
  for (const [k, v] of Object.entries(base)) merged[k] = k in override ? mergeConfig(v, override[k]) : v;
  return merged;
}

/**
 * Everything a page needs: the validated config and the facts derived from
 * it. Memoised per process; the build's cache-busting import defeats that
 * on purpose during --watch.
 */
let cached = null;
export function loadConfig({ fresh = false } = {}) {
  if (cached && !fresh) return cached;
  const cfg = validateConfig(rawConfig());
  const override = readOverride();
  const gates = override?.gates ? mergeConfig(readGates(), override.gates) : readGates();
  const env = buildEnv();
  const gateState = evaluateGates(gates, cfg.features);

  const production = cfg.offering.production;
  const isVertical = !isPending(production) && production.format === 'vertical-series';

  const tilesShown = cfg.offering.tiles.filter((t) => {
    if (!t.show) return false;
    if (t.requires === 'G_TAX') return cfg.features.taxSection && Boolean(cfg.legal.tax);
    if (t.requires === 'targetReturnBasis') return Boolean(cfg.offering.targetReturn?.basisDocOnFile);
    return true;
  });
  const tilesHidden = cfg.offering.tiles.filter((t) => !tilesShown.includes(t));

  const storyVariant = cfg.story.variants.find((v) => v.id === cfg.story.variant);

  cached = {
    ...cfg,
    gates,
    gateState,
    env,
    isProduction: env === 'production',
    pageVersion: gitSha(),
    derived: {
      isVertical,
      tilesShown,
      tilesHidden,
      storyVariant,
      /** Config values still pending, as { path, reason }. */
      pending: collectPending(
        { offering: cfg.offering, legal: { verification: cfg.legal.verification, retention: cfg.legal.retention }, perks: cfg.perks, site: cfg.investSite },
        '',
      ),
      productionProblems: productionProblems(cfg),
      exemptionIs506c: cfg.offering.exemption === '506(c)',
      /** Rendered when brand clearance has been signed. */
      showBrandInFooter: cfg.offering.sponsor.brandCleared,
      /**
       * Proper names the config itself supplies (the issuer, the host). They
       * are allowed on the page by virtue of being decided in config, so the
       * name lint does not have to be edited when a decision lands.
       */
      configNames: [
        isPending(cfg.offering.issuer) ? null : cfg.offering.issuer.legalName,
        isPending(cfg.investSite.booking.host) ? null : cfg.investSite.booking.host.name,
      ].filter(Boolean),
    },
  };
  return cached;
}

export default loadConfig;
