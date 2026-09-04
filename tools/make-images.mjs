#!/usr/bin/env node
/**
 * Generate the raster brand assets that a static site cannot express in SVG:
 * the Open Graph card (1200×630) and the Apple touch icon (180×180).
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
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);
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

const STAR =
  '<svg viewBox="0 0 24 24"><path d="M12 1.6l2.9 7.1 7.7.5-5.9 4.9 1.9 7.4-6.6-4.1-6.6 4.1 1.9-7.4L1.4 9.2l7.7-.5z"/></svg>';

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
  .mark { display: flex; align-items: center; gap: 16px; font-size: 96px; font-weight: 700; font-style: italic; letter-spacing: .03em; line-height: 1; }
  .mark svg { width: 62px; height: 62px; fill: #d4af37; }
  .sub { margin-top: 20px; font-size: 27px; font-weight: 500; letter-spacing: .45em; text-transform: uppercase; }
  .motto { margin-top: 26px; font-family: Georgia, serif; font-style: italic; font-size: 34px; color: #bfb09a; }
  .rule { height: 3px; background: #d4af37; width: 190px; margin-bottom: 30px; }
  .tag { font-family: Georgia, serif; font-size: 36px; line-height: 1.35; color: #ded4c2; max-width: 21ch; }
</style>
<div class="grid"></div>
<div class="inner">
  <div class="mark"><span>TRU</span>${STAR}<span>MEN</span></div>
  <div class="sub">Productions</div>
  <div class="motto">Viri Veri</div>
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
  svg { width: 116px; height: 116px; fill: #d4af37; }
</style>
${STAR}`;

const TARGETS = [
  { name: 'og-default.png', html: ogCard, width: 1200, height: 630 },
  { name: 'apple-touch-icon.png', html: touchIcon, width: 180, height: 180 },
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

  await mkdir(OUT, { recursive: true });
  const tmp = await path.join(os.tmpdir(), `trumen-images-${Date.now()}`);
  await mkdir(tmp, { recursive: true });

  for (const target of TARGETS) {
    const htmlFile = path.join(tmp, `${target.name}.html`);
    const outFile = path.join(OUT, target.name);
    await writeFile(htmlFile, target.html, 'utf8');
    await run(chrome, [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--virtual-time-budget=4000',
      `--window-size=${target.width},${target.height}`,
      `--screenshot=${outFile}`,
      `file://${htmlFile}`,
    ]).catch((err) => {
      // Chromium writes benign D-Bus noise to stderr in containers; only a
      // missing output file is a real failure.
      if (!existsSync(outFile)) throw err;
    });
    if (!existsSync(outFile)) throw new Error(`Chromium produced no ${target.name}`);
    console.log(`  wrote src/assets/img/${target.name}  (${target.width}×${target.height})`);
  }

  await rm(tmp, { recursive: true, force: true });
  console.log('\n  Done. Commit the PNGs — the site build itself needs no browser.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
