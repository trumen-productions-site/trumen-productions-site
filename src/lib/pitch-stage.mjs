/**
 * The animated pitch, as markup.
 *
 * This is the port of `project/clearly-film.jsx`. Every element that moves in
 * the original composition appears here with the same copy, the same position,
 * and its cue expressed in absolute seconds via a data-* attribute that
 * `assets/js/pitch.js` reads back.
 *
 * Two consequences worth knowing:
 *
 *   1. The copy is real HTML. It is indexed, selectable, translatable, and
 *      readable with JavaScript switched off — where the original was a canvas
 *      of React nodes that existed only at runtime.
 *   2. Every time below is derived from `src/data/pitch.mjs`. Re-time a scene
 *      there and the whole piece re-times with it.
 */

import { cues, totalDuration } from '../data/pitch.mjs';
import { film } from '../data/film.mjs';
import { esc, each, when, raw } from './html.mjs';

const C = cues();
const T = {
  title: C.Title,
  case: C.Case,
  rev: C.Reversal,
  era: C.Erasure,
  q: C.Question,
  th: C.Themes,
  comp: C.Comparables,
  ask: C.Ask,
  close: C.Close,
  end: totalDuration,
};

/** Round to 2dp so attribute strings stay short and stable. */
const t = (n) => Math.round(n * 100) / 100;

/* ── Small building blocks ────────────────────────────────────────────── */

/** The kicker: an uppercase line over a rule that wipes in beneath it. */
function kicker({ at, text, width = 900, tone = '' }) {
  return `
<div class="pk-kicker${tone ? ` pk-kicker--${tone}` : ''}" style="width:${width}px" data-enter="${t(at)},0.7,14">
  <div class="pk-kicker__text">${raw(text)}</div>
  <div class="pk-kicker__rule" data-draw="${t(at + 0.15)},0.9"></div>
</div>`;
}

/** The TRU★MEN wordmark at stage scale. */
function stageLogo(size = 36) {
  return `
<span class="pk-logo" style="--pk-logo:${size}px">
  <span class="pk-logo__line">
    <span>TRU</span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6l2.9 7.1 7.7.5-5.9 4.9 1.9 7.4-6.6-4.1-6.6 4.1 1.9-7.4L1.4 9.2l7.7-.5z"/></svg>
    <span>MEN</span>
  </span>
  <span class="pk-logo__sub">Productions</span>
</span>`;
}

/* ── The record: one court page that persists across three scenes ─────── */

const BODY_LINES = [0.96, 0.9, 0.98, 0.86, 0.94, 0.7];
const FINDING_LINES = [0.95, 0.88, 0.97, 0.62];

const GONE_START = T.era + 6.5; // the deletion dissolve
const GONE_END = T.era + 8.5;

function docPage() {
  return `
<div class="pk-doc" data-fade="${t(T.case + 0.8)},${t(T.q + 0.4)},0.8">
  <div class="pk-doc__push" data-drift="${t(T.case + 1)},${t(T.era)},0.05,60% 55%">
    <div class="pk-doc__push" data-drift="${t(T.era + 2)},${t(T.era + 10)},0.09,60% 55%,easeInOutSine">
      <div class="pk-doc__page">
        <div class="pk-doc__court" data-enter="${t(T.case + 1.2)},0.7,10">Supreme Court of South Carolina</div>
        <div class="pk-doc__divider" data-draw="${t(T.case + 1.4)},0.8"></div>

        <div class="pk-doc__lines">
          ${each(
            BODY_LINES,
            (w, i) =>
              `<div class="pk-doc__line" style="width:${w * 100}%" data-draw="${t(T.case + 1.8 + i * 0.25)},0.5"></div>`,
          )}
        </div>

        <div class="pk-doc__opinion" data-enter="${t(T.rev + 1.2)},0.7,12">
          <span class="pk-doc__bullet"></span>
          <span>Opinion No. 25093 — filed March 27, 2000</span>
        </div>
        <div class="pk-doc__verdict" data-enter="${t(T.rev + 2.6)},0.7,12">Reversed — “Impossible”</div>

        <div class="pk-doc__findings">
          <div class="pk-doc__struck-label" data-enter="${t(T.era + 1)},0.7,10">
            <span data-op="1,0.6,${t(GONE_START)},${t(GONE_END)},easeInOutCubic">Last three paragraphs</span>
            <span data-op="0,1,${t(GONE_START)},${t(GONE_END)},easeInOutCubic">Deleted</span>
          </div>
          <div class="pk-doc__lines">
            ${each(
              FINDING_LINES,
              (w, i) => `
            <div class="pk-doc__finding" style="width:${w * 100}%">
              <div class="pk-doc__line pk-doc__line--find"
                   data-draw="${t(T.era - 2 + i * 0.2)},0.5"
                   data-at="${t(T.era - 2)}"
                   data-op="1,0.08,${t(GONE_START)},${t(GONE_END)},easeInOutCubic"></div>
              <div class="pk-doc__strike"
                   data-strike="${t(T.era + 3 + i * 0.7)},0.55"
                   data-op="1,0,${t(GONE_START)},${t(GONE_END)},easeInOutCubic"></div>
            </div>`,
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

/* ── The nine scenes ──────────────────────────────────────────────────── */

function sceneTitle() {
  return `
<section class="pk-shot" data-shot="0,${t(T.case + 0.5)}" data-fade="0,${t(T.case + 0.5)},0.6,0.4">
  <div class="pk-shot__push" data-drift="0,${t(T.case)},0.025,30% 40%">
    <div class="pk-pos pk-pos--top-wide">
      ${kicker({ at: 0.4, text: 'A feature film · Adapted from the memoir by Michael &amp; David Martin', width: 1680 })}
    </div>
    <div class="pk-pos pk-pos--title">
      <h2 class="pk-display pk-display--xl" data-enter="1.2,1.1,40">Clearly<br>Established</h2>
      <p class="pk-note pk-note--wide pk-mt-36" data-enter="2.6,1">
        The State of South Carolina Supreme Court unanimously said it should have been
        impossible to convict him. Then he was unable to seek relief due to the court’s
        prevarication — hiding that fact in an erasure.
      </p>
    </div>
    <div class="pk-pos pk-pos--foot-left" data-enter="3.6,0.9,14">Pitch · Based on a true story</div>
    <div class="pk-pos pk-pos--foot-right" data-enter="4.2,0.9,14">${stageLogo(36)}</div>
  </div>
</section>`;
}

function sceneCase() {
  return `
<section class="pk-shot pk-shot--column" data-shot="${t(T.case)},${t(T.rev + 0.5)}" data-fade="${t(T.case)},${t(T.rev + 0.5)}">
  ${kicker({ at: T.case + 0.1, text: '01 · The prevarication' })}
  <h2 class="pk-display pk-display--md pk-mt-56" data-enter="${t(T.case + 1)},1">A murder the State admitted it could not prove.</h2>
  <p class="pk-note pk-note--case pk-mt-36" data-enter="${t(T.case + 4)},1">
    “We will probably never know which one of these defendants actually did the killing.”
    — prosecutor Mark Moyer, in open court.
  </p>
  <p class="pk-note pk-note--case pk-note--ink pk-mt-22" data-enter="${t(T.case + 6.5)},1">
    “You don’t know if either of them did.” — Judge Henry Floyd
  </p>
  <p class="pk-note pk-note--case pk-mt-22" data-enter="${t(T.case + 9)},1">
    Arrested in 1996 at twenty-six. Convicted in 1997 — sentenced to natural life without parole.
  </p>
  <h3 class="pk-punch pk-mt-24" data-enter="${t(T.case + 11)},0.9,32">Three years, eleven months in prison.</h3>
  <h3 class="pk-punch pk-punch--red pk-mt-10" data-enter="${t(T.case + 13)},0.9,32">Seventy-seven days of it past what the law allowed.</h3>
</section>`;
}

function sceneReversal() {
  return `
<section class="pk-shot pk-shot--column" data-shot="${t(T.rev)},${t(T.era + 0.5)}" data-fade="${t(T.rev)},${t(T.era + 0.5)}">
  ${kicker({ at: T.rev + 0.1, text: '02 · The reversal' })}
  <h2 class="pk-display pk-display--lg pk-mt-100" data-enter="${t(T.rev + 0.8)},0.9,44">Reversed.</h2>
  <h2 class="pk-display pk-display--lg2 pk-red pk-mt-24" data-enter="${t(T.rev + 2.4)},0.9,44">Impossible to convict.</h2>
  <p class="pk-note pk-mt-48" data-enter="${t(T.rev + 5.5)},1">
    On March 27, 2000, the Supreme Court of South Carolina reversed the conviction —
    unanimously — holding it should have been impossible to convict him under the State’s own
    theory.
  </p>
</section>`;
}

function sceneErasure() {
  return `
<section class="pk-shot pk-shot--column" data-shot="${t(T.era)},${t(T.q + 0.8)}" data-fade="${t(T.era)},${t(T.q + 0.8)}">
  ${kicker({ at: T.era + 0.1, text: '03 · The erasure' })}
  <h2 class="pk-display pk-display--sm pk-mt-90" data-enter="${t(T.era + 0.9)},1">Then the findings vanished.</h2>
  <p class="pk-note pk-mt-48" data-enter="${t(T.era + 9.5)},1">
    On June 12, 2000, the Court withdrew that opinion and refiled it — with the language that
    explained his innocence deleted.
  </p>
  <p class="pk-note pk-note--ink pk-mt-32" data-enter="${t(T.era + 14)},1">
    The reversal stood. The words that explained it did not — a prevarication by erasure,
    rewriting the Supreme Court’s own ruling to shield the State from liability to the man it
    wronged.
  </p>
</section>`;
}

function sceneQuestion() {
  return `
<div class="pk-field" data-panel="${t(T.q)},${t(T.th)}">
  <div class="pk-shot" data-shot="${t(T.q - 0.5)},${t(T.th + 0.2)}">
    <div class="pk-pos pk-pos--top-wide">
      ${kicker({ at: T.q + 0.4, text: 'Clearly Established', width: 1680, tone: 'invert' })}
    </div>
    <div class="pk-pos pk-pos--question" data-drift="${t(T.q)},${t(T.th)},0.02,20% 40%">
      <h2 class="pk-display pk-display--q" data-enter="${t(T.q + 0.9)},1,36">${esc(film.questions.primary)}</h2>
      <p class="pk-question-sub pk-mt-48" data-enter="${t(T.q + 3.5)},1">${esc(film.questions.secondary)}</p>
    </div>
  </div>
</div>`;
}

function sceneThemes() {
  return `
<section class="pk-shot pk-shot--wide" data-shot="${t(T.th - 0.9)},${t(T.comp + 0.5)}" data-fade="${t(T.th - 0.9)},${t(T.comp + 0.5)}">
  ${kicker({ at: T.th - 0.6, text: '04 · What it’s really about', width: 1680 })}
  <div class="pk-grid pk-grid--3 pk-mt-140">
    ${each(
      film.themes,
      (item, i) => `
    <div data-enter="${t(T.th + 0.4 + i * 1.6)},0.9">
      <div class="pk-rule" data-draw="${t(T.th + 0.4 + i * 1.6)},0.8"></div>
      <div class="pk-num">${esc(item.number)}</div>
      <h3 class="pk-card-title">${esc(item.title)}</h3>
      <p class="pk-card-body">${esc(item.body)}</p>
    </div>`,
    )}
  </div>
</section>`;
}

function sceneComparables() {
  return `
<section class="pk-shot pk-shot--wide" data-shot="${t(T.comp)},${t(T.ask + 0.5)}" data-fade="${t(T.comp)},${t(T.ask + 0.5)}">
  ${kicker({ at: T.comp + 0.1, text: '05 · Where this film lives', width: 1680 })}
  <div class="pk-mt-130">
    ${each(
      film.comparables,
      (row, i) => `
    <div data-enter="${t(T.comp + 0.8 + i * 1.4)},0.9,20">
      <div class="pk-rule" data-draw="${t(T.comp + 0.8 + i * 1.4)},0.8"></div>
      <div class="pk-row">
        <div class="pk-row__title">${esc(row.title)}</div>
        <div class="pk-row__year">${esc(row.year)}</div>
        <div class="pk-row__body">${esc(row.body)}</div>
      </div>
    </div>`,
    )}
  </div>
</section>`;
}

function sceneAsk() {
  return `
<section class="pk-shot pk-shot--wide" data-shot="${t(T.ask)},${t(T.close + 0.5)}" data-fade="${t(T.ask)},${t(T.close + 0.5)}">
  ${kicker({ at: T.ask + 0.1, text: '06 · The ask', width: 1680 })}
  <h2 class="pk-display pk-display--sm pk-mt-90" data-enter="${t(T.ask + 0.8)},1">What we’re looking for.</h2>
  <div class="pk-grid pk-grid--3 pk-mt-80">
    ${each(
      film.ask,
      (item, i) => `
    <div data-enter="${t(T.ask + 2 + i * 1.5)},0.9">
      <div class="pk-rule" data-draw="${t(T.ask + 2 + i * 1.5)},0.8"></div>
      <div class="pk-num">${esc(item.number)}</div>
      <h3 class="pk-card-title">${esc(item.title)}</h3>
      <p class="pk-card-body">${esc(item.body)}</p>
    </div>`,
    )}
  </div>
  <p class="pk-status pk-mt-64" data-enter="${t(T.ask + 7)},0.9,14">Status · Completed screenplay · Life rights held by the authors</p>
</section>`;
}

function sceneClose({ showContact = true } = {}) {
  return `
<section class="pk-shot" data-shot="${t(T.close)},${t(T.end + 1)}" data-fade="${t(T.close)},${t(T.end + 10)},0.3,0.4">
  <div class="pk-shot__push" data-drift="${t(T.close)},${t(T.end)},0.02,30% 40%">
    <div class="pk-pos pk-pos--top-wide">
      ${kicker({ at: T.close + 0.1, text: 'A feature film · Based on a true story', width: 1680 })}
    </div>
    <div class="pk-pos pk-pos--close">
      <h2 class="pk-display pk-display--xl pk-display--close" data-enter="${t(T.close + 0.6)},1,36">Clearly<br>Established</h2>
      <p class="pk-note pk-mt-44" data-enter="${t(T.close + 1.8)},1">${esc(film.closing.line)}</p>
    </div>
    ${when(
      showContact,
      `<div class="pk-pos pk-pos--credit" data-enter="${t(T.close + 2.8)},0.9,14">
      ${stageLogo(44)}
      <span class="pk-credit">Michael &amp; David Martin · <em>Viri Veri</em></span>
    </div>`,
    )}
  </div>
</section>`;
}

/* ── Assembly ─────────────────────────────────────────────────────────── */

/**
 * The 1920×1080 stage.
 *
 * `aria-hidden` is deliberate: every word on the stage also appears in the
 * transcript beneath the player, as ordinary prose in reading order. Exposing
 * both would read the pitch twice to a screen reader, in the wrong order, with
 * no way to tell the animation apart from the text.
 */
export function pitchStage({ showContact = true } = {}) {
  return `
<div class="pk-stage" data-stage aria-hidden="true">
  ${sceneTitle()}
  ${docPage()}
  ${sceneCase()}
  ${sceneReversal()}
  ${sceneErasure()}
  ${sceneQuestion()}
  ${sceneThemes()}
  ${sceneComparables()}
  ${sceneAsk()}
  ${sceneClose({ showContact })}
</div>`;
}

/**
 * The homepage teaser: the title card alone, looping.
 * Same stage, same engine, one scene, no controls.
 */
export function titleTeaser() {
  return `
<div class="pk-stage pk-stage--teaser" data-stage aria-hidden="true">
  ${sceneTitle()}
</div>`;
}

export { T as pitchCues };
