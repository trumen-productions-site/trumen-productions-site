/* ═══════════════════════════════════════════════════════════════════════════
   Site chrome: navigation, scroll state, reveal-on-scroll.

   Everything here is progressive. The site is fully readable, navigable and
   linkable with this file blocked — the reveal styles only arm themselves once
   the `js` class lands on <html>, and the mobile nav is a plain list until the
   toggle is wired up.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Mobile navigation ───────────────────────────────────────────────── */

  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close on Escape, and on any navigation away from the current page.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // A resize into desktop layout must not leave the menu in a stuck state.
    var desktop = window.matchMedia('(min-width: 60em)');
    var onChange = function (e) {
      if (e.matches) setOpen(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
    else desktop.addListener(onChange);
  }

  /* ── Sticky-header shadow ────────────────────────────────────────────── */

  function initHeaderState() {
    var header = document.querySelector('[data-site-header]');
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true },
    );
    update();
  }

  /* ── Reveal on scroll ────────────────────────────────────────────────── */

  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    // With reduced motion, or without IntersectionObserver, show everything.
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    for (var j = 0; j < targets.length; j++) io.observe(targets[j]);
  }

  /* ── Deep links into <details> (FAQ) ─────────────────────────────────── */

  function initDetailsAnchors() {
    function openTarget() {
      if (!location.hash) return;
      var el = document.querySelector(location.hash);
      if (!el) return;
      var d = el.closest('details');
      if (d) d.open = true;
    }
    window.addEventListener('hashchange', openTarget);
    openTarget();
  }

  function init() {
    initNav();
    initHeaderState();
    initReveal();
    initDetailsAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
