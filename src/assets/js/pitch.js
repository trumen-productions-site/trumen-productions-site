/* ═══════════════════════════════════════════════════════════════════════════
   The pitch engine
   ───────────────────────────────────────────────────────────────────────────
   A faithful port of the Claude Design composition
   (`project/clearly-film.jsx`) to the open web — same easings, same cue
   arithmetic, same three motion primitives, no framework.

   The engine is deliberately dumb: it does not know what the film is about.
   Every element that moves carries data-* attributes describing its own
   animation in absolute seconds, and those attributes are written by the
   build from `src/data/pitch.mjs`. Retime the composition there and the
   markup, the player and the tests all follow.

   Attribute vocabulary
   ────────────────────
     data-shot="from,to"                 show only inside this window
     data-fade="t0,t1[,in,out]"          cross-fade in and out (fadeIO)
     data-enter="t0[,dur,dy]"            rise + fade in  (MOTION.enter)
     data-draw="t0[,dur]"                wipe a rule left→right (MOTION.draw)
     data-drift="t0,t1[,amt,origin]"     slow push-in    (MOTION.drift)
     data-op="from,to,start,end[,ease]"  multiply opacity along a curve
     data-strike="t0[,dur]"              wipe the red strike-through bar
     data-panel="qIn,qOut"               the red question field's slide
     data-at="t"                         hard cut to visible at t

   Public surface: `window.TruMenPitch.create(rootElement, options)`.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Timeline maths (ported verbatim) ─────────────────────────────────── */

  var Easing = {
    linear: function (t) {
      return t;
    },
    easeOutCubic: function (t) {
      return 1 - Math.pow(1 - t, 3);
    },
    easeInOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeInOutSine: function (t) {
      return -(Math.cos(Math.PI * t) - 1) / 2;
    },
    easeInOutQuart: function (t) {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    },
  };

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  /** animate({from,to,start,end,ease})(T) — the composition's one tween. */
  function animate(T, from, to, start, end, ease) {
    if (end <= start) return T >= end ? to : from;
    var u = clamp((T - start) / (end - start), 0, 1);
    return from + (to - from) * (ease || Easing.linear)(u);
  }

  /** Hold in, hold out. The cross-fade every section boundary uses. */
  function fadeIO(T, t0, t1, din, dout) {
    return clamp((T - t0) / (din || 0.3), 0, 1) * clamp((t1 - T) / (dout || 0.4), 0, 1);
  }

  /* ── Attribute parsing ────────────────────────────────────────────────── */

  var EASE_NAMES = Object.keys(Easing);

  function nums(value) {
    return String(value)
      .split(',')
      .map(function (part) {
        var n = parseFloat(part);
        return isNaN(n) ? part.trim() : n;
      });
  }

  var SPEC_ATTRS = [
    'shot',
    'fade',
    'enter',
    'draw',
    'drift',
    'op',
    'strike',
    'panel',
    'at',
  ];

  function readSpec(node) {
    var spec = null;
    for (var i = 0; i < SPEC_ATTRS.length; i++) {
      var key = SPEC_ATTRS[i];
      var raw = node.getAttribute('data-' + key);
      if (raw === null) continue;
      spec = spec || { node: node };
      spec[key] = nums(raw);
    }
    return spec;
  }

  /* ── Per-frame application ────────────────────────────────────────────── */

  function applyOne(spec, T) {
    var node = spec.node;

    if (spec.shot) {
      var visible = T >= spec.shot[0] && T <= spec.shot[1];
      if (!visible) {
        if (node.style.visibility !== 'hidden') {
          node.style.visibility = 'hidden';
          node.style.opacity = '0';
        }
        return;
      }
      node.style.visibility = '';
    }

    var opacity = null;
    var transforms = [];
    var origin = null;

    if (spec.drift) {
      var driftEase = Easing[spec.drift[4]] || Easing.linear;
      var scale = 1 + (spec.drift[2] === undefined ? 0.03 : spec.drift[2]) *
        animate(T, 0, 1, spec.drift[0], spec.drift[1], driftEase);
      transforms.push('scale(' + scale.toFixed(5) + ')');
      if (typeof spec.drift[3] === 'string') origin = spec.drift[3];
    }

    if (spec.fade) {
      opacity = fadeIO(T, spec.fade[0], spec.fade[1], spec.fade[2], spec.fade[3]);
    }

    if (spec.enter) {
      var dur = spec.enter[1] === undefined ? 0.9 : spec.enter[1];
      var dy = spec.enter[2] === undefined ? 28 : spec.enter[2];
      var u = animate(T, 0, 1, spec.enter[0], spec.enter[0] + dur, Easing.easeOutCubic);
      opacity = opacity === null ? u : opacity * u;
      transforms.push('translateY(' + ((1 - u) * dy).toFixed(3) + 'px)');
    }

    if (spec.at) {
      var on = T >= spec.at[0] ? 1 : 0;
      opacity = opacity === null ? on : opacity * on;
    }

    if (spec.op) {
      var ease = Easing[spec.op[4]] || Easing.easeInOutCubic;
      var factor = animate(T, spec.op[0], spec.op[1], spec.op[2], spec.op[3], ease);
      opacity = opacity === null ? factor : opacity * factor;
    }

    if (spec.draw || spec.strike) {
      var d = spec.draw || spec.strike;
      var w = animate(T, 0, 1, d[0], d[0] + (d[1] === undefined ? 0.8 : d[1]), Easing.easeInOutCubic);
      if (spec.strike) {
        node.style.setProperty('--strike', w.toFixed(4));
      } else {
        transforms.push('scaleX(' + w.toFixed(4) + ')');
        origin = origin || 'left center';
      }
    }

    if (spec.panel) {
      var mid = (spec.panel[0] + spec.panel[1]) / 2;
      var y =
        T < mid
          ? animate(T, 100, 0, spec.panel[0] - 0.7, spec.panel[0] + 0.1, Easing.easeInOutQuart)
          : animate(T, 0, -100, spec.panel[1] - 0.7, spec.panel[1] + 0.1, Easing.easeInOutQuart);
      transforms.push('translateY(' + y.toFixed(3) + '%)');
    }

    if (opacity !== null) node.style.opacity = opacity.toFixed(4);
    if (transforms.length) node.style.transform = transforms.join(' ');
    if (origin) node.style.transformOrigin = origin;
  }

  /* ── The player ───────────────────────────────────────────────────────── */

  /**
   * @param {HTMLElement} root  element containing `[data-stage]` and, optionally, controls
   * @param {object} options
   * @param {number} options.duration  authored runtime in seconds
   * @param {boolean} options.loop     restart at the end
   * @param {boolean} options.autoplay start on its own when scrolled into view
   * @param {Array}  options.chapters  [{name, start, end, desc}]
   */
  function create(root, options) {
    var opts = options || {};
    var stage = root.querySelector('[data-stage]');
    if (!stage) return null;

    var duration = opts.duration || 120;
    var loop = !!opts.loop;
    var wantsAutoplay = opts.autoplay !== false;
    var chapters = opts.chapters || [];

    var specs = [];
    var nodes = stage.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var spec = readSpec(nodes[i]);
      if (spec) specs.push(spec);
    }

    /*
     * The poster frame.
     *
     * At T=0 every scene is still fading in, so a stopped player would show an
     * empty rectangle — which is exactly what someone with reduced motion on,
     * or with autoplay blocked, would be left looking at. The player therefore
     * rests on a composed frame and rewinds to zero the first time it is
     * actually played.
     */
    var poster = typeof opts.poster === 'number' ? opts.poster : 0;
    var T = poster;
    var hasPlayed = false;
    var playing = false;
    var rafId = null;
    var lastStamp = 0;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* — scaling the 1920×1080 stage into whatever box it is given — */
    function fit() {
      var box = stage.parentElement;
      if (!box) return;
      var w = box.clientWidth;
      var h = box.clientHeight || (w * 9) / 16;
      var s = Math.min(w / 1920, h / 1080);
      stage.style.transform = 'scale(' + s + ')';
      stage.style.left = (w - 1920 * s) / 2 + 'px';
      stage.style.top = (h - 1080 * s) / 2 + 'px';
    }

    function paint() {
      for (var i = 0; i < specs.length; i++) applyOne(specs[i], T);
      if (ui.onFrame) ui.onFrame(T);
    }

    function tick(stamp) {
      if (!playing) return;
      if (!lastStamp) lastStamp = stamp;
      var dt = Math.min((stamp - lastStamp) / 1000, 0.25); // clamp tab-switch jumps
      lastStamp = stamp;
      T += dt;
      if (T >= duration) {
        if (loop) {
          T = T % duration;
        } else {
          T = duration;
          playing = false;
          paint();
          if (ui.onEnd) ui.onEnd();
          return;
        }
      }
      paint();
      rafId = requestAnimationFrame(tick);
    }

    var api = {
      get time() {
        return T;
      },
      get playing() {
        return playing;
      },
      duration: duration,
      play: function () {
        if (playing) return;
        if (!hasPlayed && T === poster) T = 0; // leave the poster, start at the top
        hasPlayed = true;
        if (T >= duration) T = 0;
        playing = true;
        lastStamp = 0;
        rafId = requestAnimationFrame(tick);
        if (ui.onState) ui.onState(true);
      },
      pause: function () {
        if (!playing) return;
        playing = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (ui.onState) ui.onState(false);
      },
      toggle: function () {
        if (playing) api.pause();
        else api.play();
      },
      seek: function (seconds) {
        T = clamp(seconds, 0, duration);
        hasPlayed = true; // a deliberate seek is never overridden by the poster
        lastStamp = 0;
        paint();
      },
      nudge: function (delta) {
        api.seek(T + delta);
      },
      restart: function () {
        api.seek(0);
        api.play();
      },
      fit: fit,
      destroy: function () {
        api.pause();
        window.removeEventListener('resize', fit);
      },
    };

    var ui = {};

    /* — controls, if the markup provides them — */
    var playBtn = root.querySelector('[data-control="play"]');
    var restartBtn = root.querySelector('[data-control="restart"]');
    var scrub = root.querySelector('[data-control="scrub"]');
    var clock = root.querySelector('[data-control="time"]');
    var sceneLabel = root.querySelector('[data-control="scene"]');
    var chapterBtns = root.querySelectorAll('[data-seek]');

    function fmt(s) {
      var m = Math.floor(s / 60);
      var r = Math.floor(s % 60);
      return m + ':' + (r < 10 ? '0' : '') + r;
    }

    function currentChapter(t) {
      for (var i = chapters.length - 1; i >= 0; i--) {
        if (t >= chapters[i].start) return chapters[i];
      }
      return chapters[0];
    }

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        api.toggle();
      });
      ui.onState = function (isPlaying) {
        playBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
        playBtn.setAttribute('aria-label', isPlaying ? 'Pause the pitch' : 'Play the pitch');
        playBtn.dataset.state = isPlaying ? 'playing' : 'paused';
      };
      ui.onEnd = function () {
        ui.onState(false);
      };
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        api.restart();
      });
    }

    if (scrub) {
      scrub.max = String(duration);
      var scrubbing = false;
      var resumeAfter = false;
      scrub.addEventListener('pointerdown', function () {
        scrubbing = true;
        resumeAfter = playing;
        api.pause();
      });
      window.addEventListener('pointerup', function () {
        if (!scrubbing) return;
        scrubbing = false;
        if (resumeAfter) api.play();
      });
      scrub.addEventListener('input', function () {
        api.seek(parseFloat(scrub.value));
      });
    }

    for (var c = 0; c < chapterBtns.length; c++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          api.seek(parseFloat(btn.getAttribute('data-seek')));
          api.play();
        });
      })(chapterBtns[c]);
    }

    ui.onFrame = function (t) {
      if (scrub && document.activeElement !== scrub) scrub.value = String(t);
      if (clock) clock.textContent = fmt(t) + ' / ' + fmt(duration);
      if (sceneLabel && chapters.length) {
        var ch = currentChapter(t);
        if (ch && sceneLabel.textContent !== ch.name) sceneLabel.textContent = ch.name;
      }
      if (scrub) scrub.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(duration));
    };

    /* — keyboard, scoped to the player — */
    if (root.hasAttribute('tabindex') || root.querySelector('[data-control]')) {
      root.addEventListener('keydown', function (e) {
        if (e.target.matches('input[type="range"]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
        switch (e.key) {
          case ' ':
          case 'k':
            e.preventDefault();
            api.toggle();
            break;
          case 'ArrowRight':
            e.preventDefault();
            api.nudge(5);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            api.nudge(-5);
            break;
          case 'Home':
            e.preventDefault();
            api.seek(0);
            break;
          case 'End':
            e.preventDefault();
            api.seek(duration);
            break;
          default:
            break;
        }
      });
    }

    /*
     * Deep link into a moment: /clearly-established/pitch/#t=62 opens on the
     * red field. Arriving at a timecode means the visitor asked for that
     * frame, so the piece holds there rather than autoplaying past it.
     */
    var hashSeek = /(?:^|[#&])t=(\d+(?:\.\d+)?)/.exec(window.location.hash || '');
    if (hashSeek) {
      wantsAutoplay = false;
      hasPlayed = true;
      T = clamp(parseFloat(hashSeek[1]), 0, duration);
    }

    /* — autoplay when in view; always pause when it leaves — */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              if (wantsAutoplay && !reduceMotion.matches) api.play();
            } else {
              api.pause();
            }
          });
        },
        { threshold: 0.35 },
      );
      io.observe(root);
    } else if (wantsAutoplay && !reduceMotion.matches) {
      api.play();
    }

    window.addEventListener('resize', fit, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage.parentElement);

    fit();
    paint();
    if (ui.onState) ui.onState(false);

    root.dataset.ready = 'true';
    return api;
  }

  window.TruMenPitch = { create: create, Easing: Easing, fadeIO: fadeIO, animate: animate };

  /* ── Auto-boot every player on the page ───────────────────────────────── */

  function boot() {
    var players = document.querySelectorAll('[data-pitch]');
    for (var i = 0; i < players.length; i++) {
      var root = players[i];
      var config = {};
      try {
        config = JSON.parse(root.getAttribute('data-pitch') || '{}');
      } catch (err) {
        config = {};
      }
      create(root, config);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
