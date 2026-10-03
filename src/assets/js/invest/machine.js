/**
 * The qualification-and-booking flow as a pure state machine.
 *
 * Shared verbatim between the browser island (flow.js) and the Node test
 * suite, so what the tests prove is what the page runs. No DOM, no fetch —
 * `reduce(state, event)` returns the next state and nothing else.
 *
 * Steps (HANDOFF.md § 10):
 *   1 accredited   Are you an accredited investor?
 *   2 amount       How much are you considering?
 *   3 interest     What matters most to you?
 *   4 details      Name, email, phone (lead is saved here)
 *   5 day          Pick a day
 *   6 time         Pick a time → booked
 *
 * "No / not sure" at step 1 goes to `end`, from which only RESTART leaves.
 * Test FLOW-01 proves no sequence of events reaches details, day, time or
 * confirmed from `end` without passing through step 1 again and answering yes.
 */

export const STEPS = ['accredited', 'amount', 'interest', 'details', 'day', 'time'];
export const TOTAL_STEPS = STEPS.length;

export const initialState = Object.freeze({
  step: 'accredited',
  accredited: null, // 'yes' | 'no_or_unsure'
  amountRange: null,
  interest: null, // 'return' | 'story' | 'participation'
  leadId: null,
  day: null, // 'YYYY-MM-DD'
  slot: null, // { startsAt, endsAt }
  booking: null, // { id, startsAt, endsAt }
  timezone: null,
  error: null,
});

export const INTERESTS = [
  { id: 'return', label: 'The return' },
  { id: 'story', label: 'The story' },
  { id: 'participation', label: 'Being part of the production' },
];

/** The 1-based step number for the progress label, or null off the path. */
export function stepNumber(state) {
  const i = STEPS.indexOf(state.step);
  return i === -1 ? null : i + 1;
}

/** Can this state ever hold offering details or a booking? */
export function isQualified(state) {
  return state.accredited === 'yes';
}

export function reduce(state, event) {
  switch (event.type) {
    case 'ANSWER_ACCREDITED': {
      if (state.step !== 'accredited') return state;
      if (event.answer === 'yes') return { ...state, accredited: 'yes', step: 'amount', error: null };
      return { ...initialState, accredited: 'no_or_unsure', step: 'end', timezone: state.timezone };
    }
    case 'SELECT_AMOUNT':
      if (state.step !== 'amount' || !isQualified(state)) return state;
      return { ...state, amountRange: String(event.range), step: 'interest', error: null };
    case 'SELECT_INTEREST':
      if (state.step !== 'interest' || !isQualified(state)) return state;
      if (!INTERESTS.some((i) => i.id === event.interest)) return state;
      return { ...state, interest: event.interest, step: 'details', error: null };
    case 'LEAD_SAVED':
      if (state.step !== 'details' || !isQualified(state)) return state;
      if (!event.leadId) return state;
      return { ...state, leadId: String(event.leadId), step: 'day', error: null };
    case 'SET_TIMEZONE':
      return { ...state, timezone: String(event.timezone) };
    case 'SELECT_DAY':
      if (state.step !== 'day' || !state.leadId) return state;
      return { ...state, day: String(event.day), slot: null, step: 'time', error: null };
    case 'SELECT_SLOT':
      if (state.step !== 'time' || !state.leadId) return state;
      return { ...state, slot: { startsAt: event.startsAt, endsAt: event.endsAt }, error: null };
    case 'BOOKED':
      if (state.step !== 'time' || !state.leadId || !isQualified(state)) return state;
      return { ...state, booking: { id: event.bookingId, startsAt: event.startsAt, endsAt: event.endsAt }, step: 'confirmed', error: null };
    case 'CONFLICT':
      // The slot went while they were choosing: back to the day with the message.
      if (state.step !== 'time') return state;
      return { ...state, slot: null, step: 'day', error: 'That time was just taken. The calendar has been refreshed — please pick another.' };
    case 'ERROR':
      return { ...state, error: String(event.message || 'Something went wrong. Please try again.') };
    case 'BACK': {
      const i = STEPS.indexOf(state.step);
      if (i <= 0) return state;
      // Once the lead is saved there is no going back past the details step —
      // the record exists and the investor is told so.
      if (state.leadId && STEPS[i - 1] === 'details') return state;
      return { ...state, step: STEPS[i - 1], error: null };
    }
    case 'RESTART':
      return { ...initialState, timezone: state.timezone };
    default:
      return state;
  }
}

/** Serialisable snapshot for sessionStorage. */
export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !('step' in parsed)) return initialState;
    if (parsed.step !== 'end' && !STEPS.includes(parsed.step) && parsed.step !== 'confirmed') return initialState;
    // Never trust a stored state that claims qualification it did not earn.
    if (parsed.accredited !== 'yes' && ['amount', 'interest', 'details', 'day', 'time', 'confirmed'].includes(parsed.step)) {
      return initialState;
    }
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}
