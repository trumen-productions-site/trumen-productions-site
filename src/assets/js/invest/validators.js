/**
 * Field validators, shared by the browser island and the API route so the
 * page and the server disagree about nothing (test FLOW-02).
 *
 * Each returns { ok: true, value } with the normalised value, or
 * { ok: false, error } with a sentence a person can act on.
 */

export function validateName(input) {
  const value = String(input ?? '').replace(/\s+/g, ' ').trim();
  if (value.length < 2) return { ok: false, error: 'Please enter your name.' };
  if (value.length > 120) return { ok: false, error: 'That name is too long.' };
  if (!/\p{L}/u.test(value)) return { ok: false, error: 'Please enter your name.' };
  return { ok: true, value };
}

// Pragmatic: one @, something either side, a dot in the domain, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(input) {
  const value = String(input ?? '').trim().toLowerCase();
  if (!value) return { ok: false, error: 'Please enter your email address.' };
  if (value.length > 254 || !EMAIL.test(value)) return { ok: false, error: 'That email address doesn’t look right.' };
  return { ok: true, value };
}

/**
 * Phone → E.164. A bare ten-digit number is assumed to be North American
 * (+1); anything starting with + keeps its country code.
 */
export function validatePhone(input, { defaultCountry = '1' } = {}) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: false, error: 'Please enter a phone number we can reach you on.' };
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'That phone number doesn’t look right.' };
  let e164;
  if (hasPlus) e164 = `+${digits}`;
  else if (digits.length === 10) e164 = `+${defaultCountry}${digits}`;
  else if (digits.length === 11 && digits.startsWith(defaultCountry)) e164 = `+${digits}`;
  else return { ok: false, error: 'Please include your country code, e.g. +1 for the United States.' };
  // E.164: + followed by 8–15 digits, first digit not zero.
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return { ok: false, error: 'That phone number doesn’t look right.' };
  return { ok: true, value: e164 };
}

export const AMOUNT_RANGE = /^r[0-9]$/;
export const INTEREST = /^(return|story|participation)$/;
export const ACCREDITED = /^(yes|no_or_unsure)$/;
export const TIMEZONE = /^[A-Za-z_]+\/[A-Za-z_\-+0-9]+(\/[A-Za-z_\-+0-9]+)?$|^UTC$/;

/** Validate the whole lead payload the way /api/lead does. */
export function validateLead(body) {
  const errors = {};
  const out = {};

  const name = validateName(body.name);
  if (!name.ok) errors.name = name.error;
  else out.name = name.value;

  const email = validateEmail(body.email);
  if (!email.ok) errors.email = email.error;
  else out.email = email.value;

  const phone = validatePhone(body.phone);
  if (!phone.ok) errors.phone = phone.error;
  else out.phone = phone.value;

  if (!ACCREDITED.test(String(body.accredited))) errors.accredited = 'Please answer the first question.';
  else out.accredited = body.accredited;

  if (body.amountRange != null && body.amountRange !== '') {
    if (!AMOUNT_RANGE.test(String(body.amountRange))) errors.amountRange = 'Invalid range.';
    else out.amountRange = body.amountRange;
  } else out.amountRange = null;

  if (body.interest != null && body.interest !== '') {
    if (!INTEREST.test(String(body.interest))) errors.interest = 'Invalid choice.';
    else out.interest = body.interest;
  } else out.interest = null;

  if (body.timezone != null && body.timezone !== '') {
    if (!TIMEZONE.test(String(body.timezone))) errors.timezone = 'Invalid timezone.';
    else out.timezone = body.timezone;
  } else out.timezone = null;

  out.smsConsent = body.smsConsent === true || body.smsConsent === 'on' || body.smsConsent === 'true';

  return { ok: Object.keys(errors).length === 0, value: out, errors };
}
