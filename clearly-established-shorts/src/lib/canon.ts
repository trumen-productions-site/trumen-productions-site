/**
 * The canon linter.
 *
 * Fails on: a banned term; a known real name that counsel has not cleared; a
 * title followed by a name ("Judge Floyd"); a proximity violation ("nineteen"
 * within ten words of "Cadillac"); a fact card whose text is not one of its
 * key's approved forms; a card with factual signals and no canonKey; a canon
 * key that does not resolve; a number word used against its meaning; and a
 * record whose derived day counts disagree with its dates.
 *
 * Warns on: a motive term ("quietly", "in order to"). The deletion is stated;
 * it is never motivated.
 */
import type { CanonConfig, Card } from './schema.js';

export interface LintFinding {
  level: 'error' | 'warning';
  rule: string;
  message: string;
  where: string;
}

export class CanonError extends Error {
  constructor(public readonly findings: LintFinding[]) {
    super(
      `Canon lint failed:\n${findings
        .filter((f) => f.level === 'error')
        .map((f) => `  - [${f.rule}] ${f.where}: ${f.message}`)
        .join('\n')}`,
    );
    this.name = 'CanonError';
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function wholeWord(term: string): RegExp {
  // Word boundaries fail around punctuation like "*" and ".", so bracket with
  // "not a letter/digit" lookarounds instead.
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, 'iu');
}

function daysBetween(a: string, b: string): number {
  const ms =
    Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
    Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

/** The record's arithmetic: both day counts are derived from the dates, never asserted. */
export function checkArithmetic(canon: CanonConfig): LintFinding[] {
  const findings: LintFinding[] = [];
  const erasure = daysBetween(canon.dates.reversal, canon.dates.refiled);
  const detention = daysBetween(canon.dates.reversal, canon.dates.remittitur);
  if (erasure !== canon.derived.erasureDays) {
    findings.push({
      level: 'error',
      rule: 'arithmetic',
      where: 'config/canon.json',
      message: `${canon.dates.reversal} to ${canon.dates.refiled} is ${erasure} days, but derived.erasureDays says ${canon.derived.erasureDays}`,
    });
  }
  if (detention !== canon.derived.overDetentionDays) {
    findings.push({
      level: 'error',
      rule: 'arithmetic',
      where: 'config/canon.json',
      message: `${canon.dates.reversal} to ${canon.dates.remittitur} is ${detention} days, but derived.overDetentionDays says ${canon.derived.overDetentionDays}`,
    });
  }
  return findings;
}

/** Banned terms, proximity rules, number-word misuse, uncleared names, motive terms. For any text. */
export function lintText(canon: CanonConfig, text: string, where: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const lower = text.toLowerCase();

  for (const term of canon.bannedTerms) {
    if (wholeWord(term).test(text)) {
      findings.push({
        level: 'error',
        rule: 'banned-term',
        where,
        message: `banned term "${term}"`,
      });
    }
  }

  const words = lower.split(/\s+/).filter(Boolean);
  for (const rule of canon.proximityRules) {
    const termIdx: number[] = [];
    const nearIdx: number[] = [];
    words.forEach((w, i) => {
      const key = w.replace(/[^\p{L}\p{N}-]/gu, '');
      if (key === rule.term.toLowerCase()) termIdx.push(i);
      if (key === rule.near.toLowerCase()) nearIdx.push(i);
    });
    if (termIdx.some((t) => nearIdx.some((n) => Math.abs(t - n) <= rule.withinWords))) {
      findings.push({
        level: 'error',
        rule: 'proximity',
        where,
        message: `"${rule.term}" within ${rule.withinWords} words of "${rule.near}": ${rule.reason}`,
      });
    }
  }

  for (const [word, meta] of Object.entries(canon.numberWords)) {
    if (!meta.neverNear || !wholeWord(word).test(text)) continue;
    const re = new RegExp(
      `${escapeRe(word)}\\b[^.!?]{0,80}?(${meta.neverNear.map(escapeRe).join('|')})`,
      'iu',
    );
    if (re.test(text)) {
      findings.push({
        level: 'error',
        rule: 'number-word',
        where,
        message: `"${word}" presented as something it is not (${meta.meaning})`,
      });
    }
  }

  const cleared = new Set(
    [...canon.names.permitted, ...canon.names.realNamesCleared].map((n) => n.toLowerCase()),
  );
  for (const name of canon.names.knownRealNames) {
    if (cleared.has(name.toLowerCase())) continue;
    if (wholeWord(name).test(text)) {
      findings.push({
        level: 'error',
        rule: 'real-name',
        where,
        message: `real name "${name}" is not in realNamesCleared; use a role label`,
      });
    }
  }
  const titleRe = new RegExp(
    `\\b(${canon.names.titleWords.map(escapeRe).join('|')})\\s+([A-Z][\\p{L}'’.-]+)`,
    'gu',
  );
  for (const m of text.matchAll(titleRe)) {
    const candidate = m[2] ?? '';
    const full = `${m[1]} ${candidate}`;
    if (cleared.has(candidate.toLowerCase()) || cleared.has(full.toLowerCase())) continue;
    findings.push({
      level: 'error',
      rule: 'real-name',
      where,
      message: `"${full}" names a person after a title; real names of officials need counsel's clearance (realNamesCleared)`,
    });
  }

  for (const term of canon.motiveTerms.terms) {
    if (wholeWord(term).test(text)) {
      findings.push({
        level: 'warning',
        rule: 'motive-term',
        where,
        message: `"${term}" supplies a motive or a conclusion the record does not establish`,
      });
    }
  }
  return findings;
}

const NUMBER_WORDS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/i;
const MONTHS =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/;

/** Does this text assert a fact? Digits, number words, months, or a canon signal word. */
export function hasFactualSignal(canon: CanonConfig, text: string): string | null {
  if (/\d/.test(text)) return 'a number';
  if (NUMBER_WORDS.test(text)) return 'a number word';
  if (MONTHS.test(text)) return 'a date';
  const lower = text.toLowerCase();
  for (const term of canon.factualSignals.terms) {
    if (lower.includes(term.toLowerCase())) return `"${term}"`;
  }
  return null;
}

/** Cards: fact cards must cite a key and use one of its approved forms, verbatim. */
export function lintCards(canon: CanonConfig, cards: Card[], where: string): LintFinding[] {
  const findings: LintFinding[] = [];
  cards.forEach((card, i) => {
    const here = `${where} cards[${i}]`;
    if (card.type === 'title') {
      if (card.text)
        findings.push({
          level: 'error',
          rule: 'card',
          where: here,
          message: 'a title card takes no text; the title comes from the spec',
        });
      return;
    }
    const text = card.text ?? '';
    findings.push(...lintText(canon, text, here));
    if (!card.canonKey) {
      const signal = hasFactualSignal(canon, text);
      findings.push({
        level: 'error',
        rule: 'untagged-fact',
        where: here,
        message: signal ? `states ${signal} with no canonKey` : 'fact card has no canonKey',
      });
      return;
    }
    const fact = canon.facts[card.canonKey];
    if (!fact) {
      findings.push({
        level: 'error',
        rule: 'canon-key',
        where: here,
        message: `canonKey "${card.canonKey}" does not resolve; keys are: ${Object.keys(canon.facts).join(', ')}`,
      });
      return;
    }
    if (fact.outOfScope) {
      findings.push({
        level: 'error',
        rule: 'canon-key',
        where: here,
        message: `canonKey "${card.canonKey}" is out of scope for the pilots`,
      });
    }
    if (!fact.forms.includes(text)) {
      findings.push({
        level: 'error',
        rule: 'canon-form',
        where: here,
        message: `text is not an approved form of "${card.canonKey}". Approved: ${fact.forms.map((f) => JSON.stringify(f)).join(' | ') || '(none)'}`,
      });
    }
  });
  return findings;
}

/** Every key resolves and the record's arithmetic holds. */
export function lintCanonFile(canon: CanonConfig): LintFinding[] {
  const findings = checkArithmetic(canon);
  for (const [key, fact] of Object.entries(canon.facts)) {
    if (!fact.derivedDays) continue;
    const n = canon.derived[fact.derivedDays];
    const asWords = numberToWords(n);
    for (const form of fact.forms) {
      // Any "<count> days" or "<count> more days" in a form must be the derived count.
      for (const m of form.matchAll(/\b([a-z]+(?:-[a-z]+)?|\d+)\s+(?:more\s+)?days\b/giu)) {
        const count = (m[1] ?? '').toLowerCase();
        if (count !== asWords && count !== String(n)) {
          findings.push({
            level: 'error',
            rule: 'derived-days',
            where: `canon.facts.${key}`,
            message: `form ${JSON.stringify(form)} counts "${count} days"; the record derives ${asWords} (${n})`,
          });
        }
      }
    }
  }
  return findings;
}

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function numberToWords(n: number): string {
  if (n < 20) return ONES[n] ?? String(n);
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
  return String(n);
}

export function errorsOf(findings: LintFinding[]): LintFinding[] {
  return findings.filter((f) => f.level === 'error');
}

export function assertClean(findings: LintFinding[]): void {
  if (errorsOf(findings).length > 0) throw new CanonError(findings);
}
