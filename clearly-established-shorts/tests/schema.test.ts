import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { episodeSchema, formatIssues, gateSchema, anchorSchema } from '../src/lib/schema.js';
import { loadAllConfig } from '../src/lib/config.js';

const valid = JSON.parse(
  readFileSync(new URL('./fixtures/episode.valid.json', import.meta.url), 'utf8'),
);

describe('episode schema', () => {
  test('the fixture spec is valid', () => {
    expect(episodeSchema.safeParse(valid).success).toBe(true);
  });

  const required = [
    'id',
    'slug',
    'title',
    'targetSeconds',
    'set',
    'cast',
    'audio',
    'script',
    'scratchLines',
    'beats',
    'cards',
  ];
  test.each(required)('removing "%s" fails with a message naming the field', (field) => {
    const broken = structuredClone(valid) as Record<string, unknown>;
    delete broken[field];
    const result = episodeSchema.safeParse(broken);
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = formatIssues(result.error);
      expect(lines.some((l) => l.startsWith(field))).toBe(true);
    }
  });

  test('a fact card without a canonKey is refused', () => {
    const broken = structuredClone(valid);
    broken.cards[0] = { at: 'end-1.5', type: 'fact', text: 'March 27, 2000. Unanimous.' };
    const result = episodeSchema.safeParse(broken);
    expect(result.success).toBe(false);
    if (!result.success) expect(formatIssues(result.error).join('\n')).toMatch(/canonKey/);
  });

  test('a spec needs exactly one lead and a hook beat', () => {
    const noLead = structuredClone(valid);
    noLead.cast[0].role = 'support';
    expect(formatIssues(episodeSchema.safeParse(noLead).error!).join()).toMatch(
      /exactly one cast member has role "lead"/,
    );
    const noHook = structuredClone(valid);
    noHook.beats[0].id = 'opening';
    expect(formatIssues(episodeSchema.safeParse(noHook).error!).join()).toMatch(/"hook"/);
  });

  test('unknown actions, sets and expressions are refused', () => {
    const bad = structuredClone(valid);
    bad.beats[0].action = 'lead_dances';
    expect(episodeSchema.safeParse(bad).success).toBe(false);
    const badSet = structuredClone(valid);
    badSet.set = 'kitchen';
    expect(episodeSchema.safeParse(badSet).success).toBe(false);
  });

  test('anchors accept the four forms and nothing else', () => {
    for (const ok of ['0.0', '12', '12.5', 'line:1', 'line:12.end', 'end', 'end-3.0', 'end+1']) {
      expect(anchorSchema.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of ['', 'line:', 'line:a', 'start', 'end-', '3s', 'line:3.start']) {
      expect(anchorSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('config files', () => {
  test('all five config files validate', () => {
    const cfg = loadAllConfig();
    expect(Object.keys(cfg.platforms.presets)).toEqual([
      'youtube-shorts',
      'snap-spotlight',
      'ig-reels',
      'tiktok',
    ]);
    expect(cfg.series.workingTitle).toBe('CLEARLY ESTABLISHED: STATEMENTS');
  });

  test('the gate schema refuses a gate with extra permissive fields silently dropped', () => {
    const parsed = gateSchema.parse({
      counselCleared: false,
      clearedBy: '',
      clearedOn: '',
      clearanceReference: '',
      episodesCleared: [],
      bypass: true,
    });
    expect('bypass' in parsed).toBe(false);
  });
});
