#!/usr/bin/env node
/**
 * Generate the raster brand assets that a static site cannot express in SVG:
 * the Open Graph card (1200×630), the Apple touch icon (180×180), and the
 * investor page's Open Graph card, rendered from the typographic key art in
 * src/invest/keyart.mjs so the two can never drift.
 *
 *   node tools/make-images.mjs
 *
 * Output lands in src/assets/img/ and is committed, so the ordinary build
 * stays dependency-free — this script is only run when the mark or the card
 * design changes.
 *
 * It shells out to a headless Chromium, found in this order:
 *   1. $CHROME_BIN
 *   2. $PLAYWRIGHT_BROWSERS_PATH/chromium
 *   3. the usual names on PATH
 * If none is present the script says so and exits 1 without touching anything.
 */

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

import { keyArtCard } from '../src/invest/keyart.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'src', 'assets', 'img');

function findChromium() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.PLAYWRIGHT_BROWSERS_PATH && path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'),
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find((c) => existsSync(c)) || null;
}

import { lockupSource } from '../src/lib/lockup.mjs';

/** The faceted star, as the components draw it. */
const STAR = '<svg viewBox="0 0 24 24"><polygon points="11.76,11.29 12.11,0.0 14.82,7.79" fill="#E9C24A"/><polygon points="11.76,11.29 14.82,7.79 22.73,8.06" fill="#C9A03A"/><polygon points="11.76,11.29 22.73,8.06 16.49,12.94" fill="#C9A03A"/><polygon points="11.76,11.29 16.49,12.94 21.18,24.0" fill="#8A6A22"/><polygon points="11.76,11.29 21.18,24.0 12.11,16.12" fill="#E9C24A"/><polygon points="11.76,11.29 12.11,16.12 5.68,20.37" fill="#8A6A22"/><polygon points="11.76,11.29 5.68,20.37 7.73,12.94" fill="#C9A03A"/><polygon points="11.76,11.29 7.73,12.94 1.27,7.99" fill="#8A6A22"/><polygon points="11.76,11.29 1.27,7.99 9.4,7.79" fill="#E9C24A"/><polygon points="11.76,11.29 9.4,7.79 12.11,0.0" fill="#C9A03A"/></svg>';

/** The social card: the mark, the motto, the promise. */
const ogCard = `<!doctype html>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,500;0,600;1,700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; background: #0b1f3a; color: #f3ebdd;
    font-family: 'Poppins', system-ui, sans-serif;
    padding: 84px 88px; display: flex; flex-direction: column; justify-content: space-between;
    position: relative; overflow: hidden;
  }
  .grid {
    position: absolute; inset: 0; opacity: 1;
    background-image:
      linear-gradient(to right, rgba(243,235,221,.055) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(243,235,221,.055) 1px, transparent 1px);
    background-size: 80px 80px;
  }
  .inner { position: relative; }
  .mark svg { width: 540px; height: auto; display: block; margin-left: -24px; }
  .motto { margin-top: 10px; font-family: Georgia, serif; font-style: italic; font-size: 34px; color: #bfb09a; }
  .rule { height: 3px; background: #d4af37; width: 190px; margin-bottom: 26px; }
  .tag { font-family: Georgia, serif; font-size: 32px; line-height: 1.35; color: #ded4c2; max-width: 34ch; }
</style>
<div class="grid"></div>
<div class="inner">
  <div class="mark">${lockupSource('navy')}</div>
  <div class="motto">Men of truth</div>
</div>
<div class="inner">
  <div class="rule"></div>
  <p class="tag">We tell true stories that hold up — in court, on the page, and on screen.</p>
</div>`;

/** The touch icon: the mark reduced to the star on ink. */
const touchIcon = `<!doctype html>
<meta charset="utf-8">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 180px; height: 180px; background: #0b1f3a; display: grid; place-items: center; }
  svg { width: 128px; height: 128px; }
</style>
${STAR}`;

/** The investor page's card: the key art, as the page draws it. */
const investCard = `<!doctype html>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,500;1,700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #0b1f3a; }
  /* The card only: the lockup nested inside it sizes itself by attribute. */
  body > svg { display: block; width: 1200px; height: 630px; }
</style>
${keyArtCard()}`;

const TARGETS = [
  { name: 'og-default.png', html: ogCard, width: 1200, height: 630 },
  { name: 'apple-touch-icon.png', html: touchIcon, width: 180, height: 180 },
  { name: 'invest-keyart.png', html: investCard, width: 1200, height: 630 },
];

async function main() {
  const chrome = findChromium();
  if (!chrome) {
    console.error(
      'No Chromium found. Set CHROME_BIN to a Chrome or Chromium binary and run again.\n' +
        'The committed PNGs in src/assets/img/ remain untouched.',
    );
    process.exit(1);
  }

  // Chromium's own `--screenshot` drops parts of inline SVG (nested <svg>
  // viewports and polygons below the fold of a small icon render blank in
  // both headless modes), so the page is driven through playwright-core,
  // which the browser suite needs anyway: npm install --no-save playwright-core
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    console.error('\n  tools/make-images.mjs needs playwright-core:\n    npm install --no-save playwright-core\n');
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  const tmp = path.join(os.tmpdir(), `viri-veri-images-${Date.now()}`);
  await mkdir(tmp, { recursive: true });

  const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  try {
    for (const target of TARGETS) {
      const htmlFile = path.join(tmp, `${target.name}.html`);
      const outFile = path.join(OUT, target.name);
      await writeFile(htmlFile, target.html, 'utf8');
      const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
      await page.goto(`file://${htmlFile}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: target.width, height: target.height } });
      await page.close();
      if (!existsSync(outFile)) throw new Error(`no ${target.name} was written`);
      console.log(`  wrote src/assets/img/${target.name}  (${target.width}×${target.height})`);
    }
  } finally {
    await browser.close();
  }

  await rm(tmp, { recursive: true, force: true });
  console.log('\n  Done. Commit the PNGs — the site build itself needs no browser.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
