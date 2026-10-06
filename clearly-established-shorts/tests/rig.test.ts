import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { RIGS_DIR } from '../src/lib/paths.js';
import {
  availableVisemes,
  blinkOpenness,
  missingGroups,
  prefixSvgIds,
  resolveViseme,
  rigStyle,
} from '../src/lib/rig.js';
import { LEAD_GROUPS, loadRig } from '../src/lib/rigs-node.js';
import { VISEMES } from '../src/lib/schema.js';

const rigNames = readdirSync(RIGS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

describe('rig format', () => {
  test.each(rigNames)('%s loads, validates and declares its provenance', (name) => {
    const rig = loadRig(name);
    expect(rig.config.name).toBe(name);
    expect(['machine-drafted', 'human-illustrated', 'silhouette']).toContain(rig.config.provenance);
    if (rig.config.provenance !== 'silhouette') {
      expect(missingGroups(rig.svg, LEAD_GROUPS)).toEqual([]);
      expect(availableVisemes(rig.svg)).toEqual([...VISEMES]);
    }
    expect(rig.svg).not.toMatch(/<image/i); // no raster, no AI imagery
  });

  test('every machine-drafted rig says so, and no rig claims a likeness it does not have', () => {
    for (const name of rigNames) {
      const rig = loadRig(name);
      if (rig.config.provenance === 'machine-drafted')
        expect(rig.config.likeness.toLowerCase()).toContain('placeholder');
    }
  });

  test('ids are prefixed, including references', () => {
    const svg =
      '<svg><defs><clipPath id="c"/></defs><g id="head" clip-path="url(#c)"><use href="#c"/></g></svg>';
    const out = prefixSvgIds(svg, 'r1');
    expect(out).toContain('id="r1-c"');
    expect(out).toContain('id="r1-head"');
    expect(out).toContain('url(#r1-c)');
    expect(out).toContain('href="#r1-c"');
    expect(out).not.toContain('id="c"');
  });

  test('a missing viseme falls back to the nearest drawn shape', () => {
    expect(resolveViseme('D', ['X', 'B', 'D'])).toBe('D');
    expect(resolveViseme('C', ['X', 'B', 'D'])).toBe('B');
    expect(resolveViseme('F', ['X', 'B', 'D'])).toBe('B');
    expect(resolveViseme('A', ['X', 'B', 'D'])).toBe('X');
    expect(resolveViseme('A', [])).toBeNull();
  });

  test('blinks are deterministic and brief', () => {
    const blink = { everySeconds: 4, durationSeconds: 0.14 };
    expect(blinkOpenness(1, blink)).toBe(1);
    expect(blinkOpenness(4.07, blink)).toBeLessThan(0.05);
    expect(blinkOpenness(4.2, blink)).toBe(1);
    expect(blinkOpenness(8.07, blink)).toBe(blinkOpenness(4.07, blink));
  });

  test('the stylesheet shows exactly one mouth shape and addresses every group by prefixed id', () => {
    const rig = loadRig('michael-present');
    const css = rigStyle(
      'r9',
      rig.config,
      { pose: 'address', expression: 'resolve', viseme: 'D', blink: 1, seconds: 1.5, idle: 1 },
      availableVisemes(rig.svg),
    );
    expect((css.match(/visibility: visible/g) ?? []).length).toBe(1);
    expect(css).toContain('#r9-mouth-D { visibility: visible; }');
    for (const g of [
      'torso',
      'head',
      'brow_l',
      'brow_r',
      'eye_l',
      'arm_l',
      'arm_r',
      'hand_l',
      'hand_r',
    ])
      expect(css).toContain(`#r9-${g}`);
    expect(css).toMatch(/#r9-arm_r \{[^}]*rotate\(-2[0-9.]+deg\)/);
  });
});
