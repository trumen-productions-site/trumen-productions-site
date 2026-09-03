#!/usr/bin/env node
/**
 * Build the pitch as ONE self-contained HTML file.
 *
 *   node tools/make-standalone-pitch.mjs [outfile]
 *
 * Everything is inlined — both stylesheets, the engine, the stage, the
 * transcript. No server, no build, no internet beyond the webfonts (which fall
 * back to system faces if they cannot load). Double-click it and it plays.
 *
 * This is the version to attach to an email, put on a USB stick, or open in a
 * room with bad wifi. The site's own /clearly-established/pitch/ page is the
 * one to link to; this is the one to hand over.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { pitchStage } from '../src/lib/pitch-stage.mjs';
import { chapters, totalDuration } from '../src/data/pitch.mjs';
import { film } from '../src/data/film.mjs';
import { site } from '../src/site.config.mjs';
import { esc, each, raw } from '../src/lib/html.mjs';
import { wordmark } from '../src/lib/components.mjs';
import pitchPage from '../src/pages/pitch.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = process.argv[2] || path.join(ROOT, 'clearly-established-pitch.html');

const CH = chapters();
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Lift the rendered transcript out of the site page so it is never restated. */
function transcriptFrom(pageHtml) {
  const start = pageHtml.indexOf('<section class="section" id="transcript">');
  const end = pageHtml.indexOf('</section>', pageHtml.lastIndexOf('</article>'));
  if (start === -1 || end === -1) throw new Error('could not locate the transcript in the pitch page');
  return pageHtml.slice(start, end + '</section>'.length);
}

const config = JSON.stringify({
  duration: totalDuration,
  loop: false,
  autoplay: true,
  poster: 6,
  chapters: CH.map((c) => ({ name: c.name, start: c.start, end: c.end })),
});

const [siteCss, pitchCss, engine] = await Promise.all([
  readFile(path.join(ROOT, 'src/assets/css/site.css'), 'utf8'),
  readFile(path.join(ROOT, 'src/assets/css/pitch.css'), 'utf8'),
  readFile(path.join(ROOT, 'src/assets/js/pitch.js'), 'utf8'),
]);

// Inlining is only safe if nothing carries a closing tag for its own block.
for (const [name, text, needle] of [
  ['site.css', siteCss, '</style'],
  ['pitch.css', pitchCss, '</style'],
  ['pitch.js', engine, '</script'],
]) {
  if (text.includes(needle)) throw new Error(`${name} contains "${needle}" and cannot be inlined verbatim`);
}

const transcript = transcriptFrom(pitchPage.body());

const html = `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clearly Established — the pitch · ${esc(site.namePlain)}</title>
<meta name="description" content="The two-minute pitch for Clearly Established, with a full transcript.">
<meta name="color-scheme" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,700&family=Archivo:wght@400;600;700;800&display=swap">
<style>
${siteCss}
${pitchCss}

/* Standalone-only: this file has no site chrome around it. */
.standalone-head {
  background: var(--ink);
  color: var(--paper);
  padding: clamp(2rem, 5vw, 3.5rem) 0 clamp(1.5rem, 3vw, 2.5rem);
}
.standalone-head__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-5);
}
.standalone-head h1 {
  font-size: var(--step-4);
  margin: 0;
}
.standalone-head .eyebrow { color: var(--red); }
.standalone-head__meta {
  font-family: var(--font-sign);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b7b1ab;
  margin: 0;
}
.standalone-head .wordmark { color: var(--paper); }
.player { padding-top: 0; }
.standalone-foot {
  background: var(--ink);
  color: #b7b1ab;
  padding-block: var(--sp-7);
  font-size: var(--step--1);
}
.standalone-foot p { margin: 0 0 var(--sp-2); max-width: 70ch; }
</style>
</head>
<body>
<main id="main">

<header class="standalone-head">
  <div class="container container--wide standalone-head__inner">
    <div>
      <p class="eyebrow">Clearly Established</p>
      <h1>The pitch</h1>
      <p class="standalone-head__meta">${fmt(totalDuration)} · ${CH.length} scenes · Sound not required</p>
    </div>
    ${wordmark({ size: 'md', productions: true, motto: true })}
  </div>
</header>

<section class="player">
  <div class="container container--wide">
    <div class="player__frame-wrap" data-pitch='${config}' tabindex="-1">
      <div class="pk-frame">
        ${pitchStage({ showContact: true })}
      </div>

      <div class="player__controls" role="group" aria-label="Pitch playback controls">
        <button class="player__btn" type="button" data-control="play" aria-pressed="false" aria-label="Play the pitch">
          <svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          <svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
        </button>
        <button class="player__btn player__btn--ghost" type="button" data-control="restart" aria-label="Restart from the beginning">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>
        </button>
        <input class="player__scrub" type="range" min="0" max="${totalDuration}" step="0.1" value="0"
               data-control="scrub" aria-label="Seek through the pitch">
        <p class="player__meta">
          <span class="player__scene" data-control="scene">${esc(CH[0].name)}</span>
          <span class="player__time" data-control="time">0:00 / ${fmt(totalDuration)}</span>
        </p>
      </div>

      <ul class="player__chapters">
        ${each(
          CH,
          (c) =>
            `<li><button class="player__chapter" type="button" data-seek="${c.start}">${esc(c.name)}<span>${fmt(c.start)}</span></button></li>`,
        )}
      </ul>

      <p class="player__hint">
        Space or K plays and pauses · ← → skip five seconds · Home and End jump to the ends.
        It plays silently and pauses itself when it scrolls out of view; with reduced motion
        switched on it waits for you to press play.
      </p>
      <p class="player__small-note">
        This is a fixed sixteen-by-nine frame, so it is small on a phone. Turn the device
        sideways, or <a href="#transcript">read the transcript below</a> — it carries every word.
      </p>
    </div>
  </div>
</section>

${raw(transcript)}

<footer class="standalone-foot">
  <div class="container">
    <p><strong style="color:#ded8d2">${esc(film.title)}</strong> — ${esc(film.format)}. ${esc(film.status)}.</p>
    <p>${esc(site.legalLine.replace(/^/, '© ' + new Date().getFullYear() + ' '))}</p>
    <p>Inquiries: <a href="mailto:${esc(site.contact.general)}" style="color:#ded8d2">${esc(site.contact.general)}</a></p>
  </div>
</footer>

</main>
<script>
document.documentElement.classList.add('js');
${engine}
</script>
</body>
</html>
`;

await writeFile(OUT, html, 'utf8');
console.log(`  wrote ${path.relative(ROOT, OUT)}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} kB, self-contained)`);
