import { describe, expect, test } from 'vitest';
import { loadCanon } from '../src/lib/config.js';
import {
  assertClean,
  checkArithmetic,
  errorsOf,
  hasFactualSignal,
  lintCanonFile,
  lintCards,
  lintText,
  numberToWords,
} from '../src/lib/canon.js';

const canon = loadCanon();

describe('the record', () => {
  test('day counts are derived from the dates, not asserted', () => {
    expect(checkArithmetic(canon)).toEqual([]);
    expect(canon.derived.erasureDays).toBe(77);
    expect(canon.derived.overDetentionDays).toBe(93);
  });

  test('a record whose numbers disagree with its dates fails', () => {
    const wrong = structuredClone(canon);
    wrong.derived.overDetentionDays = 77;
    expect(checkArithmetic(wrong).map((f) => f.rule)).toEqual(['arithmetic']);
  });

  test('every fact key resolves and every counted form states the derived count', () => {
    expect(errorsOf(lintCanonFile(canon))).toEqual([]);
  });

  test('the record agrees with the reel set and the site on the dates', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const reelCanon = new URL('../../four-rules-reels/src/canon.py', import.meta.url);
    if (!existsSync(reelCanon)) return;
    const py = readFileSync(reelCanon, 'utf8');
    expect(py).toContain(`"reversal_date": "${canon.dates.reversal}"`);
    expect(py).toContain(`"refiled_date": "${canon.dates.refiled}"`);
    expect(py).toContain(`"remittitur_date": "${canon.dates.remittitur}"`);
    expect(py).toContain(`"over_detention_days": ${canon.derived.overDetentionDays}`);
  });
});

describe('banned terms', () => {
  test.each(canon.bannedTerms)('"%s" fails', (term) => {
    const findings = lintText(canon, `He said ${term} and nothing else.`, 'test');
    expect(findings.some((f) => f.rule === 'banned-term' && f.level === 'error')).toBe(true);
  });

  test('"Loyd" is banned but "Floyd" inside a cleared context is a different word', () => {
    expect(lintText(canon, 'Loyd', 'test').some((f) => f.rule === 'banned-term')).toBe(true);
    expect(lintText(canon, 'Floyd', 'test').some((f) => f.rule === 'banned-term')).toBe(false);
  });

  test('the correct company name passes; the asterisk form fails', () => {
    expect(errorsOf(lintText(canon, 'TRU★MEN Productions', 'test'))).toEqual([]);
    expect(errorsOf(lintText(canon, 'TRU*MEN Productions', 'test')).length).toBe(1);
  });

  test('"nineteen" within ten words of "Cadillac" fails; farther away it passes', () => {
    expect(
      errorsOf(lintText(canon, 'At nineteen he sold a Cadillac.', 'test')).map((f) => f.rule),
    ).toEqual(['proximity']);
    const far = `nineteen ${'word '.repeat(12)}Cadillac`;
    expect(errorsOf(lintText(canon, far, 'test'))).toEqual([]);
  });

  test('seventy-seven presented as the detention fails; as the erasure it passes', () => {
    expect(
      errorsOf(lintText(canon, 'Seventy-seven days they held me after the order.', 'test')).map(
        (f) => f.rule,
      ),
    ).toEqual(['number-word']);
    expect(
      errorsOf(lintText(canon, 'Seventy-seven days later they refiled the opinion.', 'test')),
    ).toEqual([]);
    expect(errorsOf(lintText(canon, 'Ninety-three days they held me.', 'test'))).toEqual([]);
  });
});

describe('names', () => {
  test('an unlisted real name fails and a role label passes', () => {
    expect(
      errorsOf(lintText(canon, 'Judge Floyd looked up.', 'test')).map((f) => f.rule),
    ).toContain('real-name');
    expect(errorsOf(lintText(canon, 'Godfrey stood.', 'test')).map((f) => f.rule)).toEqual([
      'real-name',
    ]);
    expect(errorsOf(lintText(canon, 'The judge looked up. The detective drove.', 'test'))).toEqual(
      [],
    );
  });

  test('a title followed by any capitalised name fails until cleared', () => {
    expect(errorsOf(lintText(canon, 'Detective Harrow drove.', 'test')).map((f) => f.rule)).toEqual(
      ['real-name'],
    );
    const cleared = structuredClone(canon);
    cleared.names.realNamesCleared.push('Harrow');
    expect(errorsOf(lintText(cleared, 'Detective Harrow drove.', 'test'))).toEqual([]);
  });

  test('Michael, David, Pops, Uncle JP and Dan Stacey are permitted by default', () => {
    expect(
      errorsOf(
        lintText(
          canon,
          'Michael called David. Pops and Uncle JP waited. Dan Stacey said it.',
          'test',
        ),
      ),
    ).toEqual([]);
  });
});

describe('cards', () => {
  test('a fact card in an approved form passes', () => {
    expect(
      errorsOf(
        lintCards(
          canon,
          [{ at: 'end-1', type: 'fact', text: 'March 27, 2000. Unanimous.', canonKey: 'reversal' }],
          'ep',
        ),
      ),
    ).toEqual([]);
  });

  test('a fact card whose text is not an approved form fails', () => {
    const f = errorsOf(
      lintCards(
        canon,
        [{ at: 'end-1', type: 'fact', text: 'March 28, 2000. Unanimous.', canonKey: 'reversal' }],
        'ep',
      ),
    );
    expect(f.map((x) => x.rule)).toEqual(['canon-form']);
    expect(f[0]?.message).toContain('Approved:');
  });

  test('an untagged fact card fails and names the signal', () => {
    const f = errorsOf(
      lintCards(
        canon,
        [{ at: 'end-1', type: 'fact', text: 'Three years and eleven months.' }],
        'ep',
      ),
    );
    expect(f.map((x) => x.rule)).toEqual(['untagged-fact']);
    expect(f[0]?.message).toMatch(/number word|years/);
  });

  test('a canon key that does not resolve fails and lists the keys', () => {
    const f = errorsOf(
      lintCards(canon, [{ at: 'end-1', type: 'fact', text: 'x', canonKey: 'nope' }], 'ep'),
    );
    expect(f.map((x) => x.rule)).toEqual(['canon-key']);
    expect(f[0]?.message).toContain('reversal');
  });

  test('the out-of-scope family land cannot be carded in a pilot', () => {
    const f = errorsOf(
      lintCards(canon, [{ at: 'end-1', type: 'fact', text: 'x', canonKey: 'familyLand' }], 'ep'),
    );
    expect(f.map((x) => x.rule)).toContain('canon-key');
  });

  test('a title card carries no text', () => {
    expect(
      errorsOf(lintCards(canon, [{ at: 'end-1', type: 'title', text: 'Hello' }], 'ep')).map(
        (f) => f.rule,
      ),
    ).toEqual(['card']);
  });
});

describe('motive terms', () => {
  test('warn without failing', () => {
    const findings = lintText(canon, 'They quietly refiled it.', 'test');
    expect(findings.map((f) => f.level)).toEqual(['warning']);
    expect(() => assertClean(findings)).not.toThrow();
  });
});

test('helpers', () => {
  expect(numberToWords(77)).toBe('seventy-seven');
  expect(numberToWords(93)).toBe('ninety-three');
  expect(numberToWords(26)).toBe('twenty-six');
  expect(hasFactualSignal(canon, 'Hello there.')).toBeNull();
  expect(hasFactualSignal(canon, 'In 1996.')).toBe('a number');
});
