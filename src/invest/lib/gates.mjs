/**
 * Launch gates (HANDOFF.md § 4).
 *
 * `evaluateGates` reads config/gates.json and the feature flags and says
 * which gates are required, which are signed, and whether a production build
 * may proceed. It also refuses a half-signed gate: `signed: true` with no
 * name or date is a mistake, not a signature.
 */

export const GATE_IDS = [
  'G_TRADEMARK',
  'G_COPYRIGHT',
  'G_DBA',
  'G_SECURITIES',
  'G_COPY',
  'G_TAX',
  'G_OUTREACH',
  'G_ADS',
];

/** Who signs each gate — printed in the counsel packet and on failure. */
export const GATE_SIGNERS = {
  G_TRADEMARK: 'Alexa Whiteside',
  G_COPYRIGHT: 'Alexa Whiteside',
  G_DBA: 'Alexa Whiteside',
  G_SECURITIES: 'Securities counsel (via Alexa Whiteside)',
  G_COPY: 'Alexa Whiteside',
  G_TAX: 'CPA / tax counsel',
  G_OUTREACH: 'Alexa Whiteside + Michael Anthony Martin',
  G_ADS: 'Michael Anthony Martin',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function evaluateGates(gates, features) {
  const problems = [];
  const required = GATE_IDS.filter((id) => id !== 'G_TAX' || features.taxSection);
  const unsigned = [];
  const signed = [];

  for (const id of GATE_IDS) {
    const g = gates[id];
    if (!g) {
      problems.push(`${id}: missing from gates.json`);
      continue;
    }
    if (typeof g.signed !== 'boolean') problems.push(`${id}: "signed" must be true or false`);
    if (g.signed) {
      if (!g.by || !String(g.by).trim()) problems.push(`${id}: signed but "by" is empty`);
      if (!ISO_DATE.test(String(g.date))) problems.push(`${id}: signed but "date" is not YYYY-MM-DD`);
      else if (Number.isNaN(Date.parse(g.date))) problems.push(`${id}: "date" is not a real date`);
    } else if (g.by || g.date) {
      problems.push(`${id}: has a name or date but "signed" is false — sign it or clear the fields`);
    }
    if (g.signed && problems.every((p) => !p.startsWith(id))) signed.push(id);
  }

  for (const id of required) {
    if (!signed.includes(id)) unsigned.push(id);
  }

  return {
    required,
    signed,
    unsigned,
    problems,
    ok: unsigned.length === 0 && problems.length === 0,
  };
}

export default evaluateGates;
