import { describe, expect, test } from 'vitest';
import {
  resolveAnchor,
  secondsToFrame,
  TimingError,
  type TimingContext,
} from '../src/lib/timing.js';

const ctx: TimingContext = {
  lines: [
    { line: 1, start: 0.4, end: 2.1 },
    { line: 2, start: 2.9, end: 5.0 },
    { line: 3, start: 5.8, end: 8.7 },
  ],
  takeEnd: 9.5,
};

describe('anchors', () => {
  test('absolute seconds', () => {
    expect(resolveAnchor('0.0', ctx)).toBe(0);
    expect(resolveAnchor('3.25', ctx)).toBe(3.25);
  });
  test('line anchors resolve from the alignment', () => {
    expect(resolveAnchor('line:2', ctx)).toBe(2.9);
    expect(resolveAnchor('line:3.end', ctx)).toBe(8.7);
  });
  test('end anchors', () => {
    expect(resolveAnchor('end', ctx)).toBe(9.5);
    expect(resolveAnchor('end-3.0', ctx)).toBe(6.5);
    expect(resolveAnchor('end+1', ctx)).toBe(10.5);
  });
  test('a line the take does not have is a readable error', () => {
    expect(() => resolveAnchor('line:7', ctx)).toThrow(TimingError);
    expect(() => resolveAnchor('line:7', ctx)).toThrow(/line 7, but the take has 3 lines/);
  });
  test('an end anchor before zero is refused', () => {
    expect(() => resolveAnchor('end-20', ctx)).toThrow(/before the start/);
  });
  test('re-timing: a new alignment moves every line anchor with no spec edit', () => {
    const retimed: TimingContext = {
      ...ctx,
      lines: ctx.lines.map((l) => ({ ...l, start: l.start + 1, end: l.end + 1 })),
    };
    expect(resolveAnchor('line:2', retimed)).toBe(3.9);
  });
  test('frames round to the nearest frame', () => {
    expect(secondsToFrame(1.0, 30)).toBe(30);
    expect(secondsToFrame(2.016, 30)).toBe(60);
  });
});
