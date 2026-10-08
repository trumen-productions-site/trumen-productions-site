import { site } from '../site.config.mjs';
import { film } from '../data/film.mjs';
import { chapters, totalDuration } from '../data/pitch.mjs';
import { esc, each, raw } from '../lib/html.mjs';
import { btn, sectionHead, pageHeader } from '../lib/components.mjs';
import { pitchStage } from '../lib/pitch-stage.mjs';

const CH = chapters();

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * The transcript.
 *
 * This is not a courtesy caption track bolted on afterwards — it is the
 * accessible, indexable, printable form of the piece, and it is what a screen
 * reader, a search engine, and anyone on a small phone actually reads. The
 * stage above it is marked aria-hidden precisely so this is the one voice.
 */
const TRANSCRIPT = {
  Title: `
    <p class="lead">Clearly Established</p>
    <p>A feature film · Adapted from the memoir by Michael &amp; David Martin.</p>
    <p>
      The State of South Carolina Supreme Court unanimously said it should have been impossible
      to convict him. Then he was unable to seek relief due to the court’s prevarication —
      hiding that fact in an erasure.
    </p>
    <p>Pitch · Based on a true story.</p>`,
  Case: `
    <p class="lead">01 · The prevarication</p>
    <p>A murder the State admitted it could not prove.</p>
    <p>“We will probably never know which one of these defendants actually did the killing.” — prosecutor Mark Moyer, in open court.</p>
    <p>“You don’t know if either one of them did.” — Judge Henry Floyd.</p>
    <p>Arrested in 1996 at twenty-six. Convicted in 1997 — sentenced to natural life without parole.</p>
    <p><strong>Three years, eleven months in prison. Ninety-three days of it past what the law allowed.</strong></p>`,
  Reversal: `
    <p class="lead">02 · The reversal</p>
    <p><strong>Reversed. Impossible to convict.</strong></p>
    <p>
      On March 27, 2000, the Supreme Court of South Carolina reversed the conviction —
      unanimously — holding it should have been impossible to convict him under the State’s own
      theory. On the page beside it: Opinion No. 25093, filed March 27, 2000.
    </p>`,
  Erasure: `
    <p class="lead">03 · The erasure</p>
    <p>Then the findings vanished. On the court page, the last three paragraphs are struck through in red, and deleted.</p>
    <p>
      On June 12, 2000, the Court withdrew that opinion and refiled it — with the language that
      explained his innocence deleted.
    </p>
    <p>
      The reversal stood. The words that explained it did not — a prevarication by erasure,
      rewriting the Supreme Court’s own ruling to shield the State from liability to the man it
      wronged.
    </p>`,
  Question: `
    <p class="lead">${esc(film.questions.primary)}</p>
    <p>${esc(film.questions.secondary)}</p>`,
  Themes: `
    <p class="lead">04 · What it’s really about</p>
    ${each(film.themes, (t) => `<p><strong>${esc(t.number)} ${esc(t.title)}.</strong> ${esc(t.body)}</p>`)}`,
  Comparables: `
    <p class="lead">05 · Where this film lives</p>
    ${each(film.comparables, (c) => `<p><strong>${esc(c.title)} (${esc(c.year)}).</strong> ${esc(c.body)}</p>`)}`,
  Ask: `
    <p class="lead">06 · The ask — what we’re looking for</p>
    ${each(film.ask, (a) => `<p><strong>${esc(a.number)} ${esc(a.title)}.</strong> ${esc(a.body)}</p>`)}
    <p>Status · ${esc(film.status)}.</p>`,
  Close: `
    <p class="lead">Clearly Established</p>
    <p>${esc(film.closing.line)}</p>
    <p>A feature film · Based on a true story. VIRI VERI Productions — Michael &amp; David Martin · <em>men of truth</em>.</p>`,
};

const playerConfig = JSON.stringify({
  duration: totalDuration,
  loop: false,
  autoplay: true,
  // Rest on the fully composed title card rather than an empty first frame —
  // this is what a visitor with reduced motion switched on sees.
  poster: 6,
  chapters: CH.map((c) => ({ name: c.name, start: c.start, end: c.end })),
});

const body = () => `
${pageHeader({
  eyebrow: 'Clearly Established',
  title: 'The pitch',
  lede: 'Two minutes: the case, the reversal, the erasure, and the ask.',
  meta: `${fmt(totalDuration)} · ${CH.length} scenes · Sound not required`,
})}

<section class="player">
  <div class="container container--wide">
    <div class="player__frame-wrap" data-pitch='${playerConfig}' tabindex="-1">
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
          (c) => `
        <li><button class="player__chapter" type="button" data-seek="${c.start}">${esc(c.name)}<span>${fmt(c.start)}</span></button></li>`,
        )}
      </ul>

      <p class="player__hint">
        Space or K plays and pauses · ← → skip five seconds · Home and End jump to the ends.
        The piece plays silently and pauses itself when it scrolls out of view; if you have
        reduced motion switched on, it waits for you to press play.
      </p>
      <p class="player__small-note">
        This is a fixed sixteen-by-nine frame, so it is small on a phone. Turn the device
        sideways, or <a href="#transcript">read the full transcript below</a> — it carries every
        word.
      </p>
    </div>
  </div>
</section>

<section class="section" id="transcript">
  <div class="container">
    <div data-reveal>
      ${sectionHead({
        label: 'Transcript',
        title: 'Every word of the pitch',
        lede:
          'The piece in reading order, scene by scene, with its timecodes. Nothing in the ' +
          'animation is missing from here.',
      })}
    </div>
    ${each(
      CH,
      (c, i) => `
    <article class="transcript__scene" id="scene-${esc(c.name.toLowerCase())}" data-reveal>
      <div class="transcript__head">
        <span class="transcript__num">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="transcript__title">${esc(c.name)}</h3>
        <span class="transcript__time">${fmt(c.start)}–${fmt(c.end)}</span>
      </div>
      <p class="note" style="margin-bottom:var(--sp-4)">${esc(c.desc)}</p>
      <div class="transcript__body">${raw(TRANSCRIPT[c.name] || '')}</div>
    </article>`,
    )}
  </div>
</section>

<section class="section section--ink on-ink">
  <div class="container" data-reveal>
    <p class="eyebrow">Next</p>
    <h2 style="font-size:var(--step-3);max-width:20ch">The full project, and how to reach us.</h2>
    <div class="btn-row">
      ${btn({ href: '/clearly-established/', label: 'The full story', variant: 'primary' })}
      ${btn({ href: '/contact/#financing', label: 'Financing & production', variant: 'secondary' })}
    </div>
  </div>
</section>
`;

export default {
  path: '/clearly-established/pitch/',
  title: 'The pitch',
  description:
    'The two-minute animated pitch for Clearly Established: the case, the unanimous reversal, ' +
    'the erasure of the finding of innocence, and what we are looking for. Full transcript included.',
  ogType: 'article',
  css: [
    'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&display=swap',
    '/assets/css/pitch.css',
  ],
  js: ['/assets/js/pitch.js'],
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Clearly Established — pitch',
      description: 'A two-minute animated pitch for the feature film Clearly Established.',
      url: `${site.url}/clearly-established/pitch/`,
      timeRequired: `PT${totalDuration}S`,
      publisher: { '@id': `${site.url}/#organization` },
    },
  ],
  body,
};
