/**
 * FN-01 · FN-02 — the footnote engine.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createFootnotes, FootnoteError } from '../../src/invest/lib/footnotes.mjs';

const defs = { a: 'Note A text here.', b: 'Note B text here.', c: 'Note C text here.' };

describe('FN-01 numbering', () => {
  test('numbers by first appearance, not by definition order', () => {
    const fn = createFootnotes(defs);
    fn.mark('b');
    fn.mark('a');
    fn.mark('b');
    assert.equal(fn.number('b'), 1);
    assert.equal(fn.number('a'), 2);
    assert.equal(fn.number('c'), null);
    assert.deepEqual(fn.used(), ['b', 'a']);
  });

  test('the reference carries the number and links to the note', () => {
    const fn = createFootnotes(defs);
    const html = fn.mark('a');
    assert.match(html, /<sup class="fn-ref"><a href="#fn-a" id="fnref-a" aria-label="Footnote 1">1<\/a><\/sup>/);
    // The second reference to the same note carries no id (ids are unique per page).
    assert.ok(!fn.mark('a').includes('id="fnref-a"'));
  });

  test('flush prints only the notes referenced since the last flush, numbered as on the page', () => {
    const fn = createFootnotes(defs);
    fn.mark('b');
    const first = fn.flush();
    assert.match(first, /<li id="fn-b" value="1">Note B text here\./);
    assert.ok(!first.includes('fn-a'));
    fn.mark('a');
    fn.mark('b');
    const second = fn.flush();
    assert.match(second, /<li id="fn-a" value="2">/);
    // b was already printed once: it repeats the text without the id.
    assert.match(second, /<li value="1">Note B text here\./);
    assert.ok(!second.includes('id="fn-b"'));
    assert.equal(fn.flush(), '');
  });
});

describe('FN-02 failures are loud', () => {
  test('an unknown id throws', () => {
    const fn = createFootnotes(defs);
    assert.throws(() => fn.mark('zzz'), FootnoteError);
    assert.throws(() => fn.mark('zzz'), /Unknown footnote id "zzz"/);
  });

  test('a definition nothing used fails, unless exempted', () => {
    const fn = createFootnotes(defs);
    fn.mark('a');
    fn.flush();
    assert.throws(() => fn.assertAllUsed(), /never used: b, c/);
    assert.doesNotThrow(() => fn.assertAllUsed(['b', 'c']));
  });

  test('a reference without a flush fails', () => {
    const fn = createFootnotes(defs);
    fn.mark('a');
    assert.throws(() => fn.assertFlushed(), /never printed: a/);
    fn.flush();
    assert.doesNotThrow(() => fn.assertFlushed());
  });

  test('note text is escaped', () => {
    const fn = createFootnotes({ x: 'Tom & Jerry <b>' });
    fn.mark('x');
    assert.ok(fn.flush().includes('Tom &amp; Jerry &lt;b&gt;'));
  });
});
