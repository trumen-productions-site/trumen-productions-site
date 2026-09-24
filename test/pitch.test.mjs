/**
 * The pitch: timing, markup, and the promise that the transcript says
 * everything the animation says.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { builtPages, ids } from './helpers/dom.mjs';
import { scenes, cues, chapters, totalDuration } from '../src/data/pitch.mjs';
import { film } from '../src/data/film.mjs';

const pages = await builtPages();
const pitchPage = pages.find((p) => p.sitePath === '/clearly-established/pitch/');
const home = pages.find((p) => p.sitePath === '/');

describe('composition timing', () => {
  test('the runtime is 1:56 — the authored two minutes less the red-field hold', () => {
    assert.equal(totalDuration, 116, `scene durations now total ${totalDuration}s, not 116s`);
  });

  test('the nine scenes are intact and in order', () => {
    assert.deepEqual(
      scenes.map((s) => s.name),
      ['Title', 'Case', 'Reversal', 'Erasure', 'Question', 'Themes', 'Comparables', 'Ask', 'Close'],
    );
  });

  test('cues are the running total of the durations', () => {
    const c = cues();
    let running = 0;
    for (const scene of scenes) {
      assert.equal(c[scene.name], running, `cue for ${scene.name} is wrong`);
      running += scene.dur;
    }
    assert.equal(c.__total, totalDuration);
  });

  test('chapters tile the timeline with no gaps or overlaps', () => {
    const list = chapters();
    assert.equal(list[0].start, 0);
    assert.equal(list[list.length - 1].end, totalDuration);
    for (let i = 1; i < list.length; i++) {
      assert.equal(list[i].start, list[i - 1].end, `gap between ${list[i - 1].name} and ${list[i].name}`);
    }
  });

  test('every scene is long enough to read', () => {
    // The Question scene is two lines on a bare field; everything else carries
    // a paragraph or a grid and needs its eight seconds.
    for (const scene of scenes) {
      const floor = scene.name === 'Question' ? 6 : 8;
      assert.ok(scene.dur >= floor, `${scene.name} is only ${scene.dur}s`);
    }
  });
});

describe('the stage markup', () => {
  const ANIM_ATTRS = ['shot', 'fade', 'enter', 'draw', 'drift', 'op', 'strike', 'panel', 'at'];

  test('every animation attribute parses to finite numbers inside the runtime', () => {
    for (const attr of ANIM_ATTRS) {
      const values = [...pitchPage.html.matchAll(new RegExp(`data-${attr}="([^"]*)"`, 'g'))].map((m) => m[1]);
      for (const value of values) {
        const parts = value.split(',');
        assert.ok(parts.length >= 1, `empty data-${attr}`);
        const first = Number(parts[0]);
        assert.ok(Number.isFinite(first), `data-${attr}="${value}" does not start with a number`);
        assert.ok(first >= -1, `data-${attr}="${value}" starts before the timeline`);
        assert.ok(
          first <= totalDuration + 1,
          `data-${attr}="${value}" starts after the piece ends`,
        );
      }
    }
  });

  test('every shot window is ordered and inside the piece', () => {
    const shots = [...pitchPage.html.matchAll(/data-shot="([^"]*)"/g)].map((m) => m[1].split(',').map(Number));
    assert.ok(shots.length >= 8, `expected a shot per scene, found ${shots.length}`);
    for (const [from, to] of shots) {
      assert.ok(to > from, `shot window runs backwards: ${from} → ${to}`);
      assert.ok(from >= 0 && from <= totalDuration, `shot starts outside the piece: ${from}`);
    }
  });

  test('the shots between them cover the whole runtime', () => {
    const shots = [...pitchPage.html.matchAll(/data-shot="([^"]*)"/g)]
      .map((m) => m[1].split(',').map(Number))
      .sort((a, b) => a[0] - b[0]);
    let covered = 0;
    for (const [from, to] of shots) {
      if (from <= covered) covered = Math.max(covered, to);
    }
    assert.ok(covered >= totalDuration, `the timeline goes dark at ${covered}s of ${totalDuration}s`);
  });

  test('the stage is hidden from assistive technology in favour of the transcript', () => {
    assert.ok(
      /<div class="pk-stage" data-stage aria-hidden="true">/.test(pitchPage.html),
      'the stage must be aria-hidden — the transcript is the accessible copy',
    );
  });

  test('the player declares its duration and chapters to the engine', () => {
    const config = pitchPage.html.match(/data-pitch='([^']+)'/);
    assert.ok(config, 'no data-pitch config on the player');
    const parsed = JSON.parse(config[1]);
    assert.equal(parsed.duration, totalDuration);
    assert.equal(parsed.chapters.length, scenes.length);
    assert.equal(parsed.loop, false, 'the full pitch should not loop');
  });

  test('the player exposes transport controls and chapter jumps', () => {
    for (const control of ['play', 'restart', 'scrub', 'time', 'scene']) {
      assert.ok(
        pitchPage.html.includes(`data-control="${control}"`),
        `missing player control: ${control}`,
      );
    }
    const seeks = [...pitchPage.html.matchAll(/data-seek="([\d.]+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(seeks, chapters().map((c) => c.start), 'chapter buttons do not match the cue list');
  });
});

describe('the red field', () => {
  // The authored cut held a static red frame for ~5.5s after both questions had
  // landed. These keep the lines readable without letting that dead air return.
  const field = () => {
    const from = pitchPage.html.indexOf('<div class="pk-field"');
    const to = pitchPage.html.indexOf('<section class="pk-shot pk-shot--wide"', from);
    assert.ok(from >= 0 && to > from, 'no red field in the stage markup');
    return [...pitchPage.html.slice(from, to).matchAll(/data-enter="([^"]*)"/g)].map((e) => e[1].split(',').map(Number));
  };
  const { start: qStart } = chapters().find((c) => c.name === 'Question');
  const { start: themesStart } = chapters().find((c) => c.name === 'Themes');
  const themesShot = () => {
    const m = pitchPage.html.match(/<section class="pk-shot pk-shot--wide" data-shot="([\d.]+),/);
    assert.ok(m, 'no Themes shot');
    return Number(m[1]);
  };

  test('both questions are on screen within three seconds of the cut', () => {
    const lines = field().filter(([at]) => at > qStart + 0.5); // the kicker is not a question
    assert.equal(lines.length, 2, `expected two question lines, found ${lines.length}`);
    for (const [at, dur] of lines) assert.ok(at + dur - qStart <= 3.2, `a question lands ${at + dur - qStart}s in`);
  });

  test('no more than three seconds of static red before the Themes cut', () => {
    const landed = Math.max(...field().map(([at, dur]) => at + dur));
    const hold = themesShot() - landed;
    assert.ok(hold >= 1.5, `the last question gets only ${hold.toFixed(2)}s before the cut`);
    assert.ok(hold <= 3, `the red field holds ${hold.toFixed(2)}s of dead air before Themes`);
    assert.ok(themesShot() < themesStart, 'Themes should begin arriving before its cue');
  });
});

describe('the transcript', () => {
  test('has a section for every scene, anchored', () => {
    const anchors = new Set(ids(pitchPage.html));
    for (const scene of scenes) {
      assert.ok(anchors.has(`scene-${scene.name.toLowerCase()}`), `no transcript section for ${scene.name}`);
    }
  });

  const mustAppear = [
    'Opinion No. 25093',
    'March 27, 2000',
    'June 12, 2000',
    'Three years, eleven months',
    'Mark Moyer',
    'Henry Floyd',
    'natural life without parole',
    film.questions.primary,
    film.questions.secondary,
    film.closing.line,
  ];

  for (const phrase of mustAppear) {
    test(`carries "${phrase.slice(0, 46)}${phrase.length > 46 ? '…' : ''}"`, () => {
      const transcript = pitchPage.html.split('id="transcript"')[1] ?? '';
      const normalised = transcript.replace(/&amp;/g, '&').replace(/&#39;/g, '’');
      assert.ok(normalised.includes(phrase), 'phrase is in the animation but not the transcript');
    });
  }

  test('every theme, comparable and ask from the deck reaches the transcript', () => {
    const transcript = pitchPage.html.split('id="transcript"')[1] ?? '';
    for (const item of [...film.themes, ...film.ask]) {
      assert.ok(transcript.includes(item.title), `missing from transcript: ${item.title}`);
    }
    for (const c of film.comparables) {
      assert.ok(transcript.includes(c.title), `missing comparable: ${c.title}`);
    }
  });
});

describe('the homepage teaser', () => {
  test('runs the title card on a short loop, not the whole piece', () => {
    const config = home.html.match(/data-pitch='([^']+)'/);
    assert.ok(config, 'no teaser on the homepage');
    const parsed = JSON.parse(config[1]);
    assert.equal(parsed.loop, true);
    assert.ok(parsed.duration <= 12, `teaser loop is ${parsed.duration}s; keep it short`);
  });

  test('links through to the full pitch', () => {
    assert.ok(home.html.includes('href="/clearly-established/pitch/"'));
  });

  test('loads the engine and its stylesheet', () => {
    assert.ok(home.html.includes('/assets/js/pitch.js'));
    assert.ok(home.html.includes('/assets/css/pitch.css'));
  });
});
