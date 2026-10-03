/**
 * FLOW-01 — the state machine. "No / not sure" can never reach the contact
 * or booking states, by exhaustive search and by random walk.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { initialState, reduce, stepNumber, isQualified, serialize, deserialize, STEPS, TOTAL_STEPS, INTERESTS } from '../../src/assets/js/invest/machine.js';

const PROTECTED = new Set(['details', 'day', 'time', 'confirmed']);

/** Every event the UI can send, with representative payloads. */
const EVENTS = [
  { type: 'ANSWER_ACCREDITED', answer: 'yes' },
  { type: 'ANSWER_ACCREDITED', answer: 'no_or_unsure' },
  { type: 'SELECT_AMOUNT', range: 'r1' },
  { type: 'SELECT_INTEREST', interest: 'story' },
  { type: 'SELECT_INTEREST', interest: 'bogus' },
  { type: 'LEAD_SAVED', leadId: 'lead-1' },
  { type: 'LEAD_SAVED', leadId: '' },
  { type: 'SET_TIMEZONE', timezone: 'America/Chicago' },
  { type: 'SELECT_DAY', day: '2027-03-03' },
  { type: 'SELECT_SLOT', startsAt: '2027-03-03T15:00:00.000Z', endsAt: '2027-03-03T15:30:00.000Z' },
  { type: 'BOOKED', bookingId: 'b-1', startsAt: '2027-03-03T15:00:00.000Z', endsAt: '2027-03-03T15:30:00.000Z' },
  { type: 'CONFLICT' },
  { type: 'ERROR', message: 'x' },
  { type: 'BACK' },
  { type: 'UNKNOWN' },
];

function invariant(state) {
  if (PROTECTED.has(state.step)) {
    assert.equal(state.accredited, 'yes', `reached ${state.step} without accreditation`);
  }
  if (['day', 'time', 'confirmed'].includes(state.step)) {
    assert.ok(state.leadId, `reached ${state.step} without a saved lead`);
  }
  if (state.step === 'confirmed') assert.ok(state.booking, 'confirmed without a booking');
}

describe('FLOW-01', () => {
  test('exhaustive search from the end screen: only RESTART leaves it, and never into a protected state', () => {
    const end = reduce(initialState, { type: 'ANSWER_ACCREDITED', answer: 'no_or_unsure' });
    assert.equal(end.step, 'end');
    assert.equal(end.accredited, 'no_or_unsure');
    const seen = new Set();
    const queue = [end];
    while (queue.length) {
      const s = queue.shift();
      const key = serialize(s);
      if (seen.has(key)) continue;
      seen.add(key);
      invariant(s);
      for (const e of EVENTS) {
        const next = reduce(s, e);
        if (next.step !== 'end' && next.step !== 'accredited') {
          assert.fail(`event ${e.type} moved the end screen to ${next.step}`);
        }
        queue.push(next);
      }
      // RESTART goes back to step 1 with nothing retained.
      const restarted = reduce(s, { type: 'RESTART' });
      assert.equal(restarted.step, 'accredited');
      assert.equal(restarted.accredited, null);
    }
  });

  test('random walks never violate the invariants', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let walk = 0; walk < 3000; walk++) {
      let s = initialState;
      for (let i = 0; i < 25; i++) {
        s = reduce(s, EVENTS[Math.floor(rnd() * EVENTS.length)]);
        invariant(s);
      }
    }
  });

  test('the happy path walks all six steps in order', () => {
    let s = initialState;
    assert.equal(stepNumber(s), 1);
    s = reduce(s, { type: 'ANSWER_ACCREDITED', answer: 'yes' });
    assert.equal(s.step, 'amount');
    assert.ok(isQualified(s));
    s = reduce(s, { type: 'SELECT_AMOUNT', range: 'r2' });
    assert.equal(s.step, 'interest');
    s = reduce(s, { type: 'SELECT_INTEREST', interest: 'participation' });
    assert.equal(s.step, 'details');
    assert.equal(stepNumber(s), 4);
    s = reduce(s, { type: 'LEAD_SAVED', leadId: 'L1' });
    assert.equal(s.step, 'day');
    s = reduce(s, { type: 'SELECT_DAY', day: '2027-03-03' });
    assert.equal(s.step, 'time');
    assert.equal(stepNumber(s), TOTAL_STEPS);
    s = reduce(s, { type: 'SELECT_SLOT', startsAt: 'a', endsAt: 'b' });
    s = reduce(s, { type: 'BOOKED', bookingId: 'B1', startsAt: 'a', endsAt: 'b' });
    assert.equal(s.step, 'confirmed');
    assert.equal(stepNumber(s), null);
  });

  test('a conflict returns to the day step with a message and no slot', () => {
    let s = initialState;
    for (const e of [{ type: 'ANSWER_ACCREDITED', answer: 'yes' }, { type: 'SELECT_AMOUNT', range: 'r0' }, { type: 'SELECT_INTEREST', interest: 'return' }, { type: 'LEAD_SAVED', leadId: 'L' }, { type: 'SELECT_DAY', day: 'd' }, { type: 'SELECT_SLOT', startsAt: 'a', endsAt: 'b' }]) s = reduce(s, e);
    s = reduce(s, { type: 'CONFLICT' });
    assert.equal(s.step, 'day');
    assert.equal(s.slot, null);
    assert.match(s.error, /just taken/);
  });

  test('BACK never crosses the saved-lead boundary', () => {
    let s = initialState;
    for (const e of [{ type: 'ANSWER_ACCREDITED', answer: 'yes' }, { type: 'SELECT_AMOUNT', range: 'r0' }, { type: 'SELECT_INTEREST', interest: 'return' }, { type: 'LEAD_SAVED', leadId: 'L' }]) s = reduce(s, e);
    assert.equal(s.step, 'day');
    assert.equal(reduce(s, { type: 'BACK' }).step, 'day', 'cannot go back to details once the lead is saved');
    const t = reduce(s, { type: 'SELECT_DAY', day: 'd' });
    assert.equal(reduce(t, { type: 'BACK' }).step, 'day');
  });

  test('deserialize refuses a stored state that claims a step it did not earn', () => {
    const forged = JSON.stringify({ step: 'details', accredited: 'no_or_unsure' });
    assert.equal(deserialize(forged).step, 'accredited');
    const garbage = deserialize('not json');
    assert.equal(garbage.step, 'accredited');
    const fine = deserialize(JSON.stringify({ step: 'amount', accredited: 'yes' }));
    assert.equal(fine.step, 'amount');
    assert.equal(deserialize(JSON.stringify({ step: 'elsewhere' })).step, 'accredited');
  });

  test('the step list and interests are what the page promises', () => {
    assert.deepEqual(STEPS, ['accredited', 'amount', 'interest', 'details', 'day', 'time']);
    assert.equal(TOTAL_STEPS, 6);
    assert.deepEqual(
      INTERESTS.map((i) => i.id),
      ['return', 'story', 'participation'],
    );
  });
});
