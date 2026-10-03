/**
 * Hashing and ids. WebCrypto is available in Workers and in Node ≥ 19 as
 * `globalThis.crypto`, so this file runs unchanged in both.
 */

const enc = new TextEncoder();

export function uuid() {
  return crypto.randomUUID();
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** IP addresses are stored only as a salted hash (HANDOFF.md § 11.3). */
export async function ipHash(ip, salt) {
  if (!salt) throw new Error('IP_SALT is not set');
  return sha256Hex(`${salt}:${ip}`);
}

/** Normalised SHA-256 for Meta's Conversions API matching keys. */
export async function capiHash(value) {
  return sha256Hex(String(value ?? '').trim().toLowerCase());
}
