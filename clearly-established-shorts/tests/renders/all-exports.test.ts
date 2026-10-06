/**
 * Probes every export under out/. Run after `npm run render -- --all`:
 *   npm run test:renders
 * Fails, rather than skipping, when the renders are missing.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadAllConfig } from '../../src/lib/config.js';
import { manifestsUnder, type Manifest } from '../../src/lib/export.js';
import { EPISODES_DIR, OUT_DIR } from '../../src/lib/paths.js';
import { probeExport, verifyManifest } from '../../src/lib/probe.js';

const config = loadAllConfig();
const manifests = manifestsUnder(OUT_DIR);
const episodes = readdirSync(EPISODES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const presets = Object.keys(config.platforms.presets);

describe('every episode on every preset', () => {
  test(`${episodes.length} episodes × ${presets.length} presets = ${episodes.length * presets.length} exports exist`, () => {
    expect(
      manifests.length,
      `run npm run render -- --all first (found ${manifests.length} manifests under out/)`,
    ).toBe(episodes.length * presets.length);
    for (const ep of episodes)
      for (const p of presets)
        expect(existsSync(path.join(OUT_DIR, ep, p, 'manifest.json')), `${ep}/${p}`).toBe(true);
  });

  test.each(manifests.map((m) => [path.relative(OUT_DIR, path.dirname(m)), m] as const))(
    '%s passes every probe and its manifest verifies',
    (_, manifestFile) => {
      const m = JSON.parse(readFileSync(manifestFile, 'utf8')) as Manifest;
      const video = path.join(
        path.dirname(manifestFile),
        Object.keys(m.outputs).find((n) => n.endsWith('.mp4')) ?? '',
      );
      const checks = [
        ...probeExport(video, m.preset, config, m.durationSeconds),
        ...verifyManifest(manifestFile),
      ];
      expect(checks.filter((c) => !c.ok)).toEqual([]);
      expect(Object.keys(m.outputs).sort()).toEqual(
        [
          `${path.basename(video, '.mp4')}.poster.png`,
          `${path.basename(video, '.mp4')}.srt`,
          `${path.basename(video, '.mp4')}.vtt`,
          path.basename(video),
        ].sort(),
      );
    },
  );

  test('while the gate is closed, every export is INTERNAL', () => {
    for (const mf of manifests) {
      const m = JSON.parse(readFileSync(mf, 'utf8')) as Manifest;
      if (!m.gate.clean) {
        for (const name of Object.keys(m.outputs))
          if (!name.endsWith('manifest.json'))
            expect(name.startsWith('INTERNAL_'), `${mf}: ${name}`).toBe(true);
      }
    }
  });

  test('the probe report exists and reports no failures', () => {
    const report = path.join(OUT_DIR, 'PROBE_REPORT.md');
    expect(existsSync(report)).toBe(true);
    expect(readFileSync(report, 'utf8')).toContain('All checks passed.');
  });
});
