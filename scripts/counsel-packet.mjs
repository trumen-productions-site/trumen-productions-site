#!/usr/bin/env node
/**
 * The counsel review packet — docs/invest/COUNSEL_REVIEW.md.
 *
 *   npm run counsel:packet        (builds first)
 *
 * Generated from the config and the built page so it always matches what is
 * staged, word for word: every open decision, the full page copy as plain
 * text, each disclaimer, the consent texts, the questions for securities
 * counsel, and a signature line per gate. Printable; nothing to install.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadConfig } from '../src/invest/config/index.mjs';
import { GATE_SIGNERS } from '../src/invest/lib/gates.mjs';
import { visibleText, INVEST_PATHS } from '../src/invest/lib/lint.mjs';
import { text as pendingText } from '../src/invest/lib/pending.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.DIST_DIR || 'dist');
const OUT = path.join(ROOT, 'docs', 'invest', 'COUNSEL_REVIEW.md');

const cfg = loadConfig({ fresh: true });
const today = new Date().toISOString().slice(0, 10);

/**
 * Break the page's visible text into readable paragraphs: drop the skip
 * links and screen-reader-only text, collapse the sentence breaks that empty
 * block elements leave behind, and never split inside "State v. Martin" or
 * "Op. No. 25093".
 */
function pageCopy(html) {
  const cleaned = html
    .replace(/<a class="skip-link"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<span class="visually-hidden">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="fn-ref">[\s\S]*?<\/span>/g, '')
    .replace(/<a class="fn-back"[\s\S]*?<\/a>/g, '');
  return visibleText(cleaned)
    .replace(/(?:\s*\.\s*){2,}/g, '. ')
    .replace(/\s+([,;:])/g, '$1')
    .split(/(?<!\bv|\bOp|\bNo|\bS\.C)\.\s+(?=[A-Z\[§])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/[.!?…]$/.test(s) ? s : `${s}.`))
    .join('\n\n');
}

// [key shown, decision, notes, config paths whose Pending state decides the "Current value" column]
const decisions = [
  ['offering.production', 'Which production the raise finances, and its shoot window', 'Default placeholder: Block One of the vertical series (Episodes 1–11), South Carolina. One production per page.', ['offering.production', 'offering.production.shootWindow']],
  ['offering.issuer', 'Legal name and state of the single-purpose LLC', 'Not yet formed.', ['offering.issuer']],
  ['offering.totalRaise', 'Total raise', '', ['offering.totalRaise']],
  ['offering.minimum', 'Minimum investment', 'Interacts with the verification method; ask securities counsel.', ['offering.minimum']],
  ['offering.waterfall', 'Recoupment % to investors first, then profit split', '', ['offering.waterfall']],
  ['offering.targetReturn', 'Target multiple and the model behind it', 'Optional; currently unset, so the tile is hidden. Requires a written basis on file.', []],
  ['offering.exemption', 'Exemption relied on', 'Page copy assumes Rule 506(c). 506(b) is refused by the build.', ['offering.exemption']],
  ['offering.escrow / collectionAccount', 'Escrow; third-party collection account', '', ['offering.escrow', 'offering.collectionAccount']],
  ['offering.useOfFunds', 'Allocation percentages', 'Must sum to 100.', ['offering.useOfFunds']],
  ['perks[].level', 'Which perks, at which levels', 'EP-credit language needs review against guild and distributor practice.', ['perks.0.level', 'perks.1.level', 'perks.2.level', 'perks.3.level', 'perks.4.level', 'perks.5.level']],
  ['team[]', 'Exact credits and bullets', 'Drafted; pending each person’s approval of the wording (gate G_COPY).', []],
  ['features.counselDisplay', 'Whether counsel is named on the page', 'Off; requires her written consent.', []],
  ['site.booking.host', 'Who takes the calls and which calendar', '', ['site.booking.host']],
  ['site.contact.email', 'Public contact address', `Currently ${cfg.investSite.contact.email}; switch to the revelatoryproductions.com address when mail is restored.`, []],
  ['site.domain', 'Production domain', '', ['site.domain']],
  ['story.variant', 'Which approved story wording to use', 'A (conservative) renders. B adds “The Court said it should have been impossible to convict him.” and needs an approver.', []],
  ['legal.verification', 'Accredited-verification sentence', '', ['legal.verification']],
  ['legal.retention', 'Record retention period for leads and consents', '', ['legal.retention']],
];

const lines = [];
const h = (s) => lines.push('', s, '');
const p = (s) => lines.push(s, '');

lines.push('# CLEARLY ESTABLISHED — Investor Page · Counsel Review Packet');
p(`Generated ${today} from build \`${cfg.pageVersion}\` (${cfg.env}). Regenerate with \`npm run counsel:packet\`; do not edit by hand.`);
p('**Owner:** Michael Anthony Martin, Vice-President, Revelatory Productions, LLC · **Counsel of record:** Alexa Whiteside, Esq., WAM Entertainment Law');
p('This packet is the whole page as staged, in plain text, with every undecided term marked `[[PENDING: …]]`. Nothing on the page can reach production until each gate below is signed in `src/invest/config/gates.json` and every pending term is decided in `src/invest/config/`.');

h('## 1. Launch gates — signature lines');
lines.push('| Gate | Meaning | Signs | Status | Signature / date |', '|---|---|---|---|---|');
for (const [id, g] of Object.entries(cfg.gates)) {
  const req = cfg.gateState.required.includes(id) ? '' : ' (not required unless the tax section is on)';
  lines.push(`| \`${id}\` | ${g.note}${req} | ${GATE_SIGNERS[id]} | ${g.signed ? `signed by ${g.by}, ${g.date}` : 'unsigned'} | _______________________ |`);
}

h('## 2. Open decisions');
lines.push('| Key | Decision | Current value | Notes |', '|---|---|---|---|');
const pendingByPath = new Map(cfg.derived.pending.map((x) => [x.path, x.reason]));
for (const [key, decision, notes, paths] of decisions) {
  const open = paths.filter((p) => pendingByPath.has(p));
  const value = open.length ? [...new Set(open.map((p) => `[[PENDING: ${pendingByPath.get(p)}]]`))].join(' ') : 'set — see the draft on the page';
  lines.push(`| \`${key}\` | ${decision} | ${value} | ${notes} |`);
}

h('## 2a. Reconciled: the day counts');
p('HANDOFF.md phrases the detention as “held seventy-seven days past the Court’s order”. The record this repository locked on September 5, 2026 derives two numbers from dated documents in the case file: **seventy-seven days** between the two filings of the opinion (March 27 → June 12, 2000) and **ninety-three days** from the order to the remittitur of June 28, 2000 — the over-detention. The page states both for what each is and leads with the over-detention. Decided in `docs/invest/DECISIONS.md` D-04; recorded here as information. The two sentences as they render:');
p(`> ${cfg.derived.storyVariant.logline.split('Then ')[1] ? `Then ${cfg.derived.storyVariant.logline.split('Then ')[1]}` : cfg.derived.storyVariant.logline}`);

h('## 3. Every pending value, by config path');
for (const x of cfg.derived.pending) lines.push(`- \`${x.path}\` — ${x.reason}`);
if (!cfg.derived.pending.length) lines.push('- none');

h('## 4. Feature flags in force');
for (const [k, v] of Object.entries(cfg.features)) lines.push(`- \`${k}\`: **${v}**`);

h('## 5. The story wording');
for (const v of cfg.story.variants) {
  lines.push(`**Variant ${v.id}${v.id === cfg.story.variant ? ' (renders)' : ''}**${v.approvedBy ? ` — approved by ${v.approvedBy}, ${v.approvedOn}` : v.id === 'B_canon' ? ' — requires an approver' : ''}`, '', `> ${v.logline}`, '');
}
lines.push('Facts the page states, exactly: arrested 1996 at twenty-six · convicted 1997 · three years and eleven months · unanimous reversal March 27, 2000, Op. No. 25093 · withdrawn and refiled June 12, 2000 (seventy-seven days later) · remittitur June 28, 2000 (ninety-three days after the order) · written by Michael Anthony Martin and David Alexander Martin · rights held by Revelatory Productions, LLC.');

h('## 6. Disclaimers and required text');
p('**Header and hero qualifier**'); p(`> ${cfg.legal.qualifier}`); p(`> ${cfg.legal.qualifierLong}`);
p('**Risk sentence (FAQ)**'); p(`> ${cfg.legal.risk}`);
p('**Not an offer (footer)**'); for (const t of cfg.legal.notAnOffer) p(`> ${t}`);
p('**Offering structure sentences (each renders only when its config value is decided and true)**'); for (const [k, t] of Object.entries(cfg.legal.structure)) p(`> _${k}_ — ${t}`);
p('**Story notice**'); p(`> ${cfg.legal.storyNotice}`);
p('**Accredited-investor helper (step 1)**'); for (const t of cfg.legal.accreditedHelp) p(`> ${t}`); p(`> ${cfg.legal.accreditedHelpNote}`);
p('**Verification (FAQ)**'); p(`> ${pendingText(cfg.legal.verification)}`);
p('**Footnotes**'); for (const [k, t] of Object.entries(cfg.legal.footnotes)) p(`> _${k}_ — ${t}`);
p('**Standing lines in the flow**'); for (const t of Object.values(cfg.legal.flowLines)) p(`> ${t}`);
p('**Tax wording**'); p(cfg.legal.tax ? `> ${cfg.legal.tax.card}` : '> none — the tax section is off until a CPA or tax counsel signs the exact wording (gate G_TAX).');

h('## 7. Consent texts (stored verbatim with each consent)');
for (const [k, t] of Object.entries(cfg.legal.consents)) p(`**${k}** — ${cfg.features.sms || k !== 'sms' ? '' : '(not shown; SMS is off) '}\n\n> ${t}`);

h('## 8. Questions for securities counsel (HANDOFF.md Appendix C)');
for (const q of [
  'Exemption, issuer entity, and state of formation.',
  'Accredited-verification method for the chosen minimum, and the third-party verifier.',
  'Form D timing relative to the first ad and first sale; state notice filings.',
  'Whether any person taking investor calls needs to be mindful of broker-dealer registration issues, and the script boundaries for those calls.',
  'Whether a public raise affects the pending introductions or the reserved-rights position.',
  'Approved wording for the accredited definition, verification sentence, risk sentence, and any return or tax language.',
  'Bad-actor questionnaire for covered persons.',
  'Record retention period for leads and consents.',
]) lines.push(`1. ${q}`);

h('## 9. The pages, as staged (plain text)');
for (const sitePath of INVEST_PATHS) {
  const file = path.join(dist, sitePath.replace(/^\//, ''), 'index.html');
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    lines.push(`### ${sitePath}`, '', '_not built_', '');
    continue;
  }
  lines.push(`### ${sitePath}`, '', pageCopy(html), '');
}

h('## 10. What the system stores');
p('Per lead: name, email, phone (E.164), self-reported accredited status, amount range, interest, timezone, status, UTM parameters and click id, landing path, referrer, a salted hash of the IP address (never the address), user agent, the git SHA of the page build seen, the channel (flow or plain form). Per consent: kind, granted, the exact text shown and its SHA-256, timestamp. Per booking: provider, provider reference, start, end, status. Per event: name, properties, session id. Schema: `db/migrations/0001_init.sql`.');
p('Never stored: Social Security numbers, financial documents, verification files. Verification happens with the third party counsel selects.');

lines.push('', '---', '', 'VIRI VERI', '');

await writeFile(OUT, `${lines.join('\n')}\n`, 'utf8');
console.log(`\n  Wrote ${path.relative(ROOT, OUT)} (${(lines.join('\n').length / 1024).toFixed(1)} kB) from build ${cfg.pageVersion}.\n`);
