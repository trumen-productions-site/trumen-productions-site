/**
 * UTM-01 — first-touch attribution survives the session and blocked storage.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { parseTouch, captureFirstTouch, currentTouch, sessionId, UTM_KEYS, STORAGE_KEY } from '../../src/assets/js/invest/utm.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

const blockedStorage = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
};

describe('UTM-01', () => {
  test('parses the seven keys and ignores the rest', () => {
    const t = parseTouch('?utm_source=meta&utm_medium=paid-social&utm_campaign=ce-launch&utm_content=ad-3&utm_term=x&utm_id=123&fbclid=abc&gclid=nope', { landingPath: '/invest/', referrer: 'https://m.facebook.com/' });
    for (const k of UTM_KEYS) assert.ok(t[k], `missing ${k}`);
    assert.equal(t.gclid, undefined);
    assert.equal(t.landing_path, '/invest/');
    assert.equal(t.referrer, 'https://m.facebook.com/');
    assert.ok(t.captured_at);
  });

  test('the first touch wins for the session', () => {
    const storage = fakeStorage();
    const first = captureFirstTouch({ search: '?utm_source=meta&utm_content=ad-1', landingPath: '/invest/', referrer: '', storage });
    const second = captureFirstTouch({ search: '?utm_source=google&utm_content=ad-9', landingPath: '/invest/', referrer: '', storage });
    assert.equal(second.utm_source, 'meta');
    assert.equal(second.utm_content, 'ad-1');
    assert.deepEqual(currentTouch(storage), first);
    assert.ok(storage._m.has(STORAGE_KEY));
  });

  test('values are capped in length', () => {
    const t = parseTouch(`?utm_campaign=${'x'.repeat(500)}`);
    assert.equal(t.utm_campaign.length, 200);
  });

  test('blocked storage degrades to memory, never to an error', () => {
    const t = captureFirstTouch({ search: '?utm_source=meta', landingPath: '/invest/', referrer: '', storage: blockedStorage });
    assert.equal(t.utm_source, 'meta');
    assert.equal(currentTouch(blockedStorage).utm_source, 'meta');
    const sid = sessionId(blockedStorage);
    assert.ok(sid.length >= 8);
    assert.equal(sessionId(blockedStorage), sid, 'the session id is stable');
  });

  test('the session id is stable within a storage', () => {
    const storage = fakeStorage();
    const a = sessionId(storage);
    assert.equal(sessionId(storage), a);
    assert.notEqual(sessionId(fakeStorage()), a);
  });
});
