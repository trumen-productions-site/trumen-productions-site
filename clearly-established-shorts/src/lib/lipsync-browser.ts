/** The one lip-sync function the composition needs, kept free of Node imports. */
import type { Viseme } from './schema.js';
import type { MouthCue } from './types.js';

export function visemeAt(cues: MouthCue[], seconds: number): Viseme {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid]!;
    if (seconds < c.start) hi = mid - 1;
    else if (seconds >= c.end) lo = mid + 1;
    else return c.value;
  }
  return 'X';
}
