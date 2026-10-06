import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadBrand, loadSeries } from '../src/lib/config.js';
import { PROJECT_ROOT } from '../src/lib/paths.js';

const brand = loadBrand();
const series = loadSeries();

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'out', '.cache', 'tools', 'public', '.git'].includes(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|json|md|txt|svg)$/.test(entry) && !entry.endsWith('package-lock.json'))
      acc.push(full);
  }
  return acc;
}

describe('the company name', () => {
  test('TRU★MEN is the only form of the company name in anything that renders or is read by Michael', () => {
    for (const f of walk(PROJECT_ROOT)) {
      const text = readFileSync(f, 'utf8');
      const rel = path.relative(PROJECT_ROOT, f);
      // The canon's banned-terms list and the tests that exercise it are the only places the wrong forms may appear.
      if (rel === 'config/canon.json' || rel.startsWith('tests/')) continue;
      expect(text, rel).not.toMatch(
        /TRU\*MEN|TRUMAN Productions|TRU-MEN|TRU MEN|TruMen|Trumen Productions/,
      );
    }
    expect(series.company).toBe('TRU★MEN Productions');
    expect(series.motto).toBe('VIRI VERI');
  });
});

describe('the palette', () => {
  test('is the locked July 12, 2026 sheet and agrees with the reel set and the site', () => {
    expect(brand.palette.navy).toBe('#0B1F3A');
    expect(brand.palette.cream).toBe('#F3EBDD');
    expect(brand.palette.brass).toBe('#B08D57');
    expect(brand.palette.sectionGreen).toBe('#2E6B4F');
    expect(brand.palette.gold).toBe('#D4AF37');
    const reels = path.join(PROJECT_ROOT, '..', 'four-rules-reels', 'brand', 'tokens.json');
    if (existsSync(reels)) {
      const tokens = JSON.parse(readFileSync(reels, 'utf8')) as { colors: Record<string, string> };
      expect(tokens.colors['navy']?.toUpperCase()).toBe(brand.palette.navy);
      expect(tokens.colors['cream']?.toUpperCase()).toBe(brand.palette.cream);
      expect(tokens.colors['brass']?.toUpperCase()).toBe(brand.palette.brass);
      expect(tokens.colors['green']?.toUpperCase()).toBe(brand.palette.sectionGreen);
      expect(tokens.colors['gold']?.toUpperCase()).toBe(brand.palette.gold);
    }
    const css = path.join(PROJECT_ROOT, '..', 'src', 'assets', 'css', 'site.css');
    if (existsSync(css)) {
      const text = readFileSync(css, 'utf8');
      for (const [name, value] of [
        ['navy', brand.palette.navy],
        ['cream', brand.palette.cream],
        ['brass', brand.palette.brass],
        ['green', brand.palette.sectionGreen],
        ['gold', brand.palette.gold],
      ] as const) {
        expect(text).toContain(`--${name}: ${value.toLowerCase()};`);
      }
    }
  });

  test('the supplied lockup is present and the fonts carry their licences', () => {
    expect(existsSync(path.join(PROJECT_ROOT, brand.companyMark.lockupFile))).toBe(true);
    const fonts = path.join(PROJECT_ROOT, 'assets', 'fonts');
    const files = readdirSync(fonts);
    expect(files).toContain('OFL-Gelasio.txt');
    expect(files).toContain('OFL-Poppins.txt');
    expect(files.filter((f) => f.endsWith('.woff2')).length).toBe(5);
    for (const f of files.filter((f) => f.startsWith('OFL')))
      expect(readFileSync(path.join(fonts, f), 'utf8')).toContain('SIL Open Font License');
  });

  test('no component fetches a font or anything else from the network', () => {
    for (const f of walk(path.join(PROJECT_ROOT, 'src'))) {
      const text = readFileSync(f, 'utf8');
      expect(text, path.relative(PROJECT_ROOT, f)).not.toMatch(
        /fonts\.googleapis|fonts\.gstatic|@remotion\/google-fonts|https?:\/\/(?!github\.com|huggingface\.co|www\.w3\.org)/,
      );
    }
  });
});
