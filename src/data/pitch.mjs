/**
 * The animated pitch — scene timings.
 *
 * These are the scene durations authored in Claude Design
 * (`project/Clearly Established Video.dc.html`, `window.OM_SCENES`). They are
 * the single source of truth for both the browser player and the tests, which
 * assert the total still comes to 120 seconds.
 *
 * Changing a duration re-times the whole piece: every cue is derived from the
 * running total, exactly as the original composition did.
 */

export const scenes = [
  { name: 'Title', dur: 10, desc: 'The film title sets against the grid' },
  { name: 'Case', dur: 16, desc: 'The conviction: a murder he was never placed at' },
  { name: 'Reversal', dur: 16, desc: 'The Supreme Court reverses, unanimously' },
  { name: 'Erasure', dur: 20, desc: 'The findings of innocence are struck from the record' },
  { name: 'Question', dur: 10, desc: 'The central question on the red poster field' },
  { name: 'Themes', dur: 14, desc: 'Three themes rule in one by one' },
  { name: 'Comparables', dur: 12, desc: 'The company the film keeps' },
  { name: 'Ask', dur: 14, desc: 'Financing, production home, lead attachment' },
  { name: 'Close', dur: 8, desc: 'Title card and credit' },
];

/** Cue map: scene name → start time in seconds. Derived, never hand-edited. */
export function cues(list = scenes) {
  const out = {};
  let t = 0;
  for (const s of list) {
    out[s.name] = t;
    t += s.dur;
  }
  out.__total = t;
  return out;
}

/** Total authored runtime in seconds. */
export const totalDuration = scenes.reduce((n, s) => n + s.dur, 0);

/** Chapter list for the player's scrub bar and the transcript headings. */
export function chapters(list = scenes) {
  const c = cues(list);
  return list.map((s) => ({ ...s, start: c[s.name], end: c[s.name] + s.dur }));
}

export default scenes;
