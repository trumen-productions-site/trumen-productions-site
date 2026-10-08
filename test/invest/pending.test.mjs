/**
 * Pending values: the mechanism behind "no invented numbers".
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { pending, isPending, renderPending, val, text, collectPending, findTokens } from '../../src/invest/lib/pending.mjs';

describe('pending', () => {
  test('a Pending is a frozen marker with a reason', () => {
    const p = pending('minimum');
    assert.ok(isPending(p));
    assert.ok(Object.isFrozen(p));
    assert.ok(!isPending({ pending: 3 }));
    assert.ok(!isPending(null));
    assert.ok(!isPending('pending'));
  });

  test('renders as a visible token, escaped', () => {
    const html = renderPending(pending('the <minimum> & more'));
    assert.equal(html, '<span class="pending" data-pending="the &lt;minimum&gt; &amp; more">[[PENDING: the &lt;minimum&gt; &amp; more]]</span>');
  });

  test('val resolves a decided value through its formatter and a Pending to its token', () => {
    assert.equal(val(5, (n) => `$${n}`), '$5');
    assert.ok(val(pending('x'), (n) => `$${n}`).startsWith('<span class="pending"'));
    assert.equal(val('<b>'), '&lt;b&gt;');
    assert.equal(text(pending('x')), '[[PENDING: x]]');
    assert.equal(text(7, (n) => `${n}%`), '7%');
  });

  test('collectPending walks nested config and reports paths', () => {
    const cfg = { a: pending('one'), b: { c: [1, pending('two')], d: 'ok' }, e: null };
    assert.deepEqual(collectPending(cfg), [
      { path: 'a', reason: 'one' },
      { path: 'b.c.1', reason: 'two' },
    ]);
  });

  test('findTokens finds every rendered token in HTML', () => {
    const html = 'x [[PENDING: alpha]] y <span>[[PENDING: beta &amp; gamma]]</span>';
    assert.deepEqual(findTokens(html), ['alpha', 'beta &amp; gamma']);
    assert.deepEqual(findTokens('nothing here'), []);
  });
});
