import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { decideGate, outputBaseName } from '../src/lib/gate.js';
import { loadGate } from '../src/lib/config.js';
import { gateSchema, type GateConfig } from '../src/lib/schema.js';
import { KNOWN_FLAGS } from '../src/cli/args.js';
import { PROJECT_ROOT } from '../src/lib/paths.js';

const OPEN: GateConfig = {
  counselCleared: true,
  clearedBy: 'Alexa Whiteside, Esq.',
  clearedOn: '2027-01-01',
  clearanceReference: 'WAM-CE-0001',
  episodesCleared: ['001'],
};

describe('the release gate', () => {
  test('the committed gate is closed and every render is INTERNAL', () => {
    const gate = loadGate();
    expect(gate.counselCleared).toBe(false);
    expect(gate.episodesCleared).toEqual([]);
    const d = decideGate(gate, '001');
    expect(d.clean).toBe(false);
    expect(d.reasons).toContain('counselCleared is not true');
    expect(outputBaseName(d, 'number-one', 'tiktok', 'INTERNAL_')).toBe(
      'INTERNAL_number-one_tiktok',
    );
  });

  test('a fully cleared gate with the episode listed renders clean', () => {
    const d = decideGate(OPEN, '001');
    expect(d.clean).toBe(true);
    expect(d.reasons).toEqual([]);
    expect(outputBaseName(d, 'number-one', 'tiktok', 'INTERNAL_')).toBe('number-one_tiktok');
  });

  test.each(['counselCleared', 'clearedBy', 'clearedOn', 'clearanceReference'] as const)(
    'missing "%s" fails closed to INTERNAL',
    (field) => {
      const gate = structuredClone(OPEN) as Record<string, unknown>;
      gate[field] = field === 'counselCleared' ? false : '';
      const d = decideGate(gateSchema.parse(gate), '001');
      expect(d.clean).toBe(false);
      expect(d.reasons.length).toBe(1);
      expect(d.reasons[0]).toContain(field);
    },
  );

  test('whitespace does not count as a value', () => {
    const d = decideGate({ ...OPEN, clearedBy: '   ' }, '001');
    expect(d.clean).toBe(false);
  });

  test('an episode not in episodesCleared fails closed even when counsel has cleared the series', () => {
    const d = decideGate(OPEN, '002');
    expect(d.clean).toBe(false);
    expect(d.reasons).toEqual(['episode 002 is not in episodesCleared']);
  });

  test('the decision carries a snapshot of the gate for the manifest, detached from the input', () => {
    const gate = structuredClone(OPEN);
    const d = decideGate(gate, '001');
    gate.clearedBy = 'someone else';
    expect(d.snapshot.clearedBy).toBe('Alexa Whiteside, Esq.');
  });
});

// ── Repository scans ─────────────────────────────────────────────────────

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'out', '.cache', 'tools', 'tests', 'public'].includes(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, acc);
    else if (exts.some((e) => full.endsWith(e))) acc.push(full);
  }
  return acc;
}

const sourceFiles = walk(PROJECT_ROOT, ['.ts', '.tsx', '.mjs', '.js', '.json']).filter(
  (f) => !f.endsWith('package-lock.json'),
);
const rel = (f: string) => path.relative(PROJECT_ROOT, f);

describe('no bypass exists', () => {
  test('no source file reads an environment variable except browser discovery', () => {
    const offenders = sourceFiles
      .filter((f) => /process\.env/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual(['src/lib/browser.ts']);
    const browser = readFileSync(path.join(PROJECT_ROOT, 'src/lib/browser.ts'), 'utf8');
    expect(browser.match(/process\.env/g)?.length).toBe(1);
    expect(browser).toContain('process.env.HOME');
  });

  test('argv is only read through the flag parser, and no known flag touches the gate', () => {
    const argvReaders = sourceFiles
      .filter((f) => /process\.argv/.test(readFileSync(f, 'utf8')))
      .map(rel);
    for (const f of argvReaders) expect(f.startsWith('src/cli/')).toBe(true);
    for (const flag of Object.keys(KNOWN_FLAGS)) {
      expect(flag).not.toMatch(
        /gate|clean|clear|release|internal|watermark|slate|bypass|force|unlock|public/i,
      );
    }
  });

  test('gate.ts reads nothing but its arguments', () => {
    const src = readFileSync(path.join(PROJECT_ROOT, 'src/lib/gate.ts'), 'utf8');
    expect(src).not.toMatch(/process\./);
    expect(src).not.toMatch(/readFile|import\(|require\(|fetch\(/);
    expect(src.match(/^import .*$/gm)).toEqual(["import type { GateConfig } from './schema.js';"]);
  });

  test('nothing in the engine writes gate.json', () => {
    for (const f of sourceFiles) {
      const src = readFileSync(f, 'utf8');
      if (!src.includes('gate.json')) continue;
      expect(src, rel(f)).not.toMatch(/writeFile|writeFileSync|appendFile|createWriteStream/);
    }
  });

  test('no source constructs an open gate; the only gate object comes from config/gate.json', () => {
    for (const f of sourceFiles) {
      if (rel(f) === 'config/gate.json') continue;
      const src = readFileSync(f, 'utf8');
      expect(src, rel(f)).not.toMatch(/counselCleared\s*:\s*true/);
    }
  });

  test('the only gate decision in the engine is fed by loadGate()', () => {
    const callers = sourceFiles
      .filter((f) => /decideGate\(/.test(readFileSync(f, 'utf8')) && !f.endsWith('gate.ts'))
      .map(rel);
    expect(callers.length).toBeGreaterThan(0);
    for (const f of callers) {
      const src = readFileSync(path.join(PROJECT_ROOT, f), 'utf8');
      expect(src, f).toMatch(/loadGate\(/);
    }
  });
});

describe('no publishing code', () => {
  const PLATFORM_HOSTS = [
    'googleapis.com',
    'youtube.com/upload',
    'youtube/v3',
    'open.tiktokapis.com',
    'open-api.tiktok.com',
    'graph.facebook.com',
    'graph.instagram.com',
    'business-api.tiktok.com',
    'kit.snapchat.com',
    'adsapi.snapchat.com',
    'marketing-api.snapchat.com',
    'upload.twitter.com',
    'api.twitter.com',
  ];
  const UPLOAD_PACKAGES = [
    'googleapis',
    '@googleapis/youtube',
    'youtube-api',
    'tiktok',
    'instagram',
    'snapchat',
    'facebook-nodejs-business-sdk',
    'twitter-api-v2',
    'axios',
    'node-fetch',
    'got',
    'superagent',
    'ky',
    'form-data',
    'node-cron',
    'cron',
    'agenda',
    'bull',
    'bullmq',
  ];

  test('no dependency is a platform client, HTTP client or scheduler', () => {
    const pkg = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const d of deps) expect(UPLOAD_PACKAGES, d).not.toContain(d);
  });

  test('no source file references a platform API host', () => {
    for (const f of sourceFiles) {
      const src = readFileSync(f, 'utf8');
      for (const host of PLATFORM_HOSTS)
        expect(src, `${rel(f)} mentions ${host}`).not.toContain(host);
    }
  });

  test('the only network code is the GET-only tool download in setup-tools', () => {
    const networked = sourceFiles
      .filter((f) =>
        /\b(fetch\(|https?\.request\(|https?\.get\(|new WebSocket|net\.connect)/.test(
          readFileSync(f, 'utf8'),
        ),
      )
      .map(rel);
    expect(networked.every((f) => f === 'src/cli/setup-tools.ts')).toBe(true);
    const setup = readFileSync(path.join(PROJECT_ROOT, 'src/cli/setup-tools.ts'), 'utf8');
    expect(setup).not.toMatch(/method\s*:\s*['"](POST|PUT|PATCH|DELETE)['"]/i);
    const hosts = [...setup.matchAll(/https:\/\/([a-z0-9.-]+)\//g)].map((m) => m[1]);
    expect(new Set(hosts)).toEqual(new Set(['github.com', 'huggingface.co']));
  });

  test('no file is named like an uploader, poster or scheduler', () => {
    for (const f of sourceFiles) {
      expect(path.basename(f)).not.toMatch(/upload|publish|post|schedul|oauth/i);
    }
  });
});
