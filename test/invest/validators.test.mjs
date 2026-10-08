/**
 * FLOW-02 — validators shared by the island and the API.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { validateName, validateEmail, validatePhone, validateLead } from '../../src/assets/js/invest/validators.js';

describe('FLOW-02 validators', () => {
  test('name', () => {
    assert.deepEqual(validateName('  Ada   Lovelace '), { ok: true, value: 'Ada Lovelace' });
    assert.equal(validateName('A').ok, false);
    assert.equal(validateName('1234').ok, false);
    assert.equal(validateName('x'.repeat(121)).ok, false);
    assert.equal(validateName('Zoë').ok, true);
  });

  test('email', () => {
    assert.deepEqual(validateEmail(' Person@Example.COM '), { ok: true, value: 'person@example.com' });
    for (const bad of ['', 'nope', 'a@b', 'a @b.com', 'a@b.c', '@example.com']) assert.equal(validateEmail(bad).ok, false, bad);
  });

  test('phone normalises to E.164', () => {
    assert.deepEqual(validatePhone('(803) 555-0100'), { ok: true, value: '+18035550100' });
    assert.deepEqual(validatePhone('1 803 555 0100'), { ok: true, value: '+18035550100' });
    assert.deepEqual(validatePhone('+44 20 7946 0958'), { ok: true, value: '+442079460958' });
    assert.equal(validatePhone('555-0100').ok, false, 'seven digits needs a country code');
    assert.equal(validatePhone('+0123456789').ok, false, 'E.164 never starts with zero');
    assert.equal(validatePhone('').ok, false);
    assert.equal(validatePhone('+1234567890123456').ok, false, 'too long');
  });

  test('the lead payload, whole', () => {
    const good = validateLead({ name: 'Ada', email: 'a@b.co', phone: '8035550100', accredited: 'yes', amountRange: 'r1', interest: 'story', timezone: 'America/New_York', smsConsent: 'on' });
    assert.equal(good.ok, true);
    assert.deepEqual(good.value, { name: 'Ada', email: 'a@b.co', phone: '+18035550100', accredited: 'yes', amountRange: 'r1', interest: 'story', timezone: 'America/New_York', smsConsent: true });

    const bad = validateLead({ name: '', email: 'x', phone: '1', accredited: 'maybe', amountRange: 'huge', interest: 'money', timezone: 'Mars' });
    assert.equal(bad.ok, false);
    assert.deepEqual(Object.keys(bad.errors).sort(), ['accredited', 'amountRange', 'email', 'interest', 'name', 'phone', 'timezone']);

    const optional = validateLead({ name: 'Ada', email: 'a@b.co', phone: '8035550100', accredited: 'no_or_unsure' });
    assert.equal(optional.ok, true);
    assert.equal(optional.value.amountRange, null);
    assert.equal(optional.value.smsConsent, false);
  });
});
