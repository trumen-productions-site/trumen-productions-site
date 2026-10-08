/**
 * First-touch attribution (HANDOFF.md § 12; test UTM-01).
 *
 * On first load the UTM parameters and click id are read from the URL and
 * kept for the session. Later navigation within the session never overwrites
 * them — the ad that brought the visitor is the one that gets the credit.
 * Storage is wrapped in try/catch: a private window or blocked storage
 * degrades to in-memory for the page's life, never to an error.
 */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid'];
export const STORAGE_KEY = 'ce_invest_touch';

let memory = null;

/** Read the attribution keys out of a query string. */
export function parseTouch(search, { landingPath = '', referrer = '' } = {}) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const touch = {};
  for (const key of UTM_KEYS) {
    const v = params.get(key);
    if (v) touch[key] = v.slice(0, 200);
  }
  touch.landing_path = landingPath.slice(0, 500);
  touch.referrer = referrer.slice(0, 500);
  touch.captured_at = new Date().toISOString();
  return touch;
}

function read(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return memory;
  }
}

function write(storage, touch) {
  memory = touch;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(touch));
  } catch {
    /* in-memory only */
  }
}

/**
 * Capture the first touch for the session. Returns the stored touch —
 * the existing one if there is one, otherwise the one just parsed.
 */
export function captureFirstTouch({ search, landingPath, referrer, storage }) {
  const existing = read(storage);
  if (existing && typeof existing === 'object' && existing.captured_at) return existing;
  const touch = parseTouch(search, { landingPath, referrer });
  write(storage, touch);
  return touch;
}

/** The current touch, or an empty object. */
export function currentTouch(storage) {
  return read(storage) || memory || {};
}

/** A stable per-session id for the server-side event log. */
export function sessionId(storage) {
  const key = `${STORAGE_KEY}_sid`;
  try {
    let sid = storage.getItem(key);
    if (!sid) {
      sid = randomId();
      storage.setItem(key, sid);
    }
    return sid;
  } catch {
    if (!memory?.sid) memory = { ...(memory || {}), sid: randomId() };
    return memory.sid;
  }
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
