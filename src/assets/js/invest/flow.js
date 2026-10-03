/**
 * The qualification-and-booking island (HANDOFF.md § 10).
 *
 * Progressive: the page ships with a plain form that posts to /api/lead.
 * This module replaces it with the six-step flow — a pure state machine
 * (machine.js) driving a small renderer. Progress survives a refresh in
 * sessionStorage; if storage is blocked it lives in memory for the page.
 * Everything is keyboard-operable; the calendar is a real grid.
 */

import { initialState, reduce, stepNumber, serialize, deserialize, STEPS } from './machine.js';
import { validateName, validateEmail, validatePhone } from './validators.js';
import { captureFirstTouch, currentTouch, sessionId } from './utm.js';

const STORAGE_KEY = 'ce_invest_flow';
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/* ── Boot ─────────────────────────────────────────────────────────────── */

const root = document.querySelector('[data-flow-root]');
const fallback = document.querySelector('[data-flow-fallback]');
const progressEl = document.querySelector('[data-flow-progress]');
const standingEl = document.querySelector('[data-flow-standing]');
const configEl = document.getElementById('invest-flow-config');

function boot(cfg) {
  const storage = safeStorage();
  const touch = captureFirstTouch({
    search: location.search,
    landingPath: location.pathname,
    referrer: document.referrer,
    storage,
  });
  const sid = sessionId(storage);

  let state = restore(storage);
  if (!state.timezone) state = reduce(state, { type: 'SET_TIMEZONE', timezone: detectTimezone() });

  const api = createApi(cfg, { sid, touch });
  const slotsCache = new Map(); // `${month}|${tz}` → slots

  // The plain form is for browsers without this script; with it, the island is the form.
  if (fallback) fallback.remove();
  root.hidden = false;

  api.event('page_view', { path: location.pathname });
  initCtaTracking(api);
  initSticky();

  const ctx = { cfg, api, storage, slotsCache, turnstileToken: null };

  function dispatch(event) {
    const next = reduce(state, event);
    if (next === state) return;
    const stepChanged = next.step !== state.step;
    state = next;
    persist(storage, state);
    if (stepChanged) {
      api.event(state.step === 'end' ? 'not_accredited_end' : 'flow_step', { step: state.step, n: stepNumber(state) });
    }
    render(state, ctx, dispatch, { focus: stepChanged });
  }

  render(state, ctx, dispatch, { focus: false });
}

/* ── Rendering ────────────────────────────────────────────────────────── */

function render(state, ctx, dispatch, { focus }) {
  const n = stepNumber(state);
  if (progressEl) {
    progressEl.textContent =
      state.step === 'end'
        ? 'Thank you'
        : state.step === 'confirmed'
          ? 'Booked'
          : `Step ${n} of ${ctx.cfg.totalSteps} · About 30 seconds`;
  }
  if (standingEl) standingEl.hidden = !(state.step === 'day' || state.step === 'time');

  const view = VIEWS[state.step] || VIEWS.accredited;
  root.replaceChildren(view(state, ctx, dispatch));
  root.querySelectorAll('[data-autofocus]').forEach((el) => el.removeAttribute('data-autofocus'));

  if (focus) {
    const title = root.querySelector('.inv-step__title');
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
      title.scrollIntoView({ block: 'nearest' });
    }
  }
}

const VIEWS = {
  accredited(state, ctx, dispatch) {
    const step = el('div', { class: 'inv-step' });
    step.append(
      h('h3', 'inv-step__title', 'Are you an accredited investor?'),
      choices([
        { label: 'Yes, I’m an accredited investor', onClick: () => dispatch({ type: 'ANSWER_ACCREDITED', answer: 'yes' }) },
        { label: 'No, or I’m not sure', onClick: () => dispatch({ type: 'ANSWER_ACCREDITED', answer: 'no_or_unsure' }) },
      ]),
      helpDetails(ctx.cfg),
      errorBox(state),
    );
    return step;
  },

  end(state, ctx, dispatch) {
    const step = el('div', { class: 'inv-step' });
    step.append(h('h3', 'inv-step__title', ctx.cfg.lines.endScreen));
    if (ctx.cfg.followList) {
      const form = el('form', { class: 'inv-follow', novalidate: '' });
      const field = fieldRow({ id: 'fl-email', label: 'Email (optional)', type: 'email', autocomplete: 'email' });
      const consent = el('label', { class: 'inv-choice' });
      const box = el('input', { type: 'checkbox', id: 'fl-consent' });
      consent.append(box, document.createTextNode(` ${ctx.cfg.followListText}`));
      const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Keep me posted');
      form.append(field.wrap, consent, submit);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = validateEmail(field.input.value);
        if (!email.ok || !box.checked) {
          field.setError(email.ok ? 'Please tick the box to confirm.' : email.error);
          return;
        }
        await ctx.api.post('/follow', { email: email.value, consentText: ctx.cfg.followListText });
        form.replaceChildren(h('p', 'inv-flow__note', 'Thank you. We will write only if that changes.'));
      });
      step.append(form);
    }
    step.append(actions([linkButton('Start over', () => dispatch({ type: 'RESTART' }))]));
    return step;
  },

  amount(state, ctx, dispatch) {
    const step = el('div', { class: 'inv-step' });
    step.append(h('h3', 'inv-step__title', 'How much are you considering?'));
    if (ctx.cfg.ranges.pending) {
      step.append(h('p', 'inv-step__help', `The minimum investment is not yet set — [[PENDING: ${ctx.cfg.ranges.pending}]]. You can leave this for the call.`));
    } else {
      step.append(h('p', 'inv-step__help', `The minimum is ${ctx.cfg.minimumLabel}. A range is enough; nothing here commits you.`));
    }
    step.append(
      choices(ctx.cfg.ranges.options.map((r) => ({ label: r.label, pressed: state.amountRange === r.id, onClick: () => dispatch({ type: 'SELECT_AMOUNT', range: r.id }) }))),
      actions([linkButton('Back', () => dispatch({ type: 'BACK' }))]),
    );
    return step;
  },

  interest(state, ctx, dispatch) {
    const step = el('div', { class: 'inv-step' });
    step.append(
      h('h3', 'inv-step__title', 'What matters most to you?'),
      h('p', 'inv-step__help', `Shown to ${ctx.cfg.hostTitle} before the call, so the ${ctx.cfg.durationMinutes} minutes start where you want them to.`),
      choices(ctx.cfg.interests.map((i) => ({ label: i.label, pressed: state.interest === i.id, onClick: () => dispatch({ type: 'SELECT_INTEREST', interest: i.id }) }))),
      actions([linkButton('Back', () => dispatch({ type: 'BACK' }))]),
    );
    return step;
  },

  details(state, ctx, dispatch) {
    const { cfg, api } = ctx;
    const step = el('div', { class: 'inv-step' });
    step.append(h('h3', 'inv-step__title', 'Your details'), h('p', 'inv-step__help', 'So we can send the booking and reach you if anything changes.'));

    const form = el('form', { class: 'inv-details', novalidate: '' });
    const name = fieldRow({ id: 'fl-name', label: 'Your name', type: 'text', autocomplete: 'name' });
    const email = fieldRow({ id: 'fl-email', label: 'Email', type: 'email', autocomplete: 'email' });
    const phone = fieldRow({ id: 'fl-phone', label: 'Phone', type: 'tel', autocomplete: 'tel' });
    form.append(name.wrap, email.wrap, phone.wrap);

    let smsBox = null;
    if (cfg.sms) {
      const wrap = el('div', { class: 'inv-field inv-field--consent' });
      const label = el('label', { class: 'inv-choice' });
      smsBox = el('input', { type: 'checkbox', id: 'fl-sms' });
      label.append(smsBox, document.createTextNode(` ${cfg.smsConsentText}`));
      wrap.append(label);
      form.append(wrap);
    }

    const turnstile = el('div', { class: 'inv-turnstile', 'data-turnstile': '' });
    form.append(turnstile);
    const alert = el('div', { class: 'inv-alert', role: 'alert', hidden: '' });
    form.append(alert);

    const submit = el('button', { class: 'btn btn--primary', type: 'submit' }, 'Save and pick a time');
    submit.append(arrow());
    form.append(actions([submit, linkButton('Back', () => dispatch({ type: 'BACK' }))]));
    step.append(form);

    mountTurnstile(turnstile, cfg, ctx);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert.hidden = true;
      const vName = validateName(name.input.value);
      const vEmail = validateEmail(email.input.value);
      const vPhone = validatePhone(phone.input.value);
      name.setError(vName.ok ? null : vName.error);
      email.setError(vEmail.ok ? null : vEmail.error);
      phone.setError(vPhone.ok ? null : vPhone.error);
      if (!vName.ok || !vEmail.ok || !vPhone.ok) {
        (!vName.ok ? name : !vEmail.ok ? email : phone).input.focus();
        return;
      }
      if (cfg.turnstileSiteKey && !ctx.turnstileToken) {
        alert.textContent = 'Please wait a moment for the verification to finish, then try again.';
        alert.hidden = false;
        return;
      }
      submit.disabled = true;
      try {
        const res = await api.post('/lead', {
          accredited: state.accredited,
          amountRange: state.amountRange,
          interest: state.interest,
          name: vName.value,
          email: vEmail.value,
          phone: vPhone.value,
          smsConsent: Boolean(smsBox && smsBox.checked),
          smsConsentText: smsBox ? cfg.smsConsentText : null,
          timezone: state.timezone,
          turnstileToken: ctx.turnstileToken,
          touch: currentTouch(ctx.storage),
          pageVersion: cfg.pageVersion,
          sessionId: api.sid,
        });
        if (res.ok) {
          api.event('lead_saved', {});
          dispatch({ type: 'LEAD_SAVED', leadId: res.body.leadId });
          return;
        }
        if (res.status === 400 && res.body?.errors) {
          name.setError(res.body.errors.name || null);
          email.setError(res.body.errors.email || null);
          phone.setError(res.body.errors.phone || null);
          if (res.body.errors.turnstile) {
            alert.textContent = 'Verification failed. Please reload the page and try again.';
            alert.hidden = false;
          }
        } else if (res.status === 429) {
          alert.textContent = 'Too many attempts from this connection. Please wait a few minutes and try again.';
          alert.hidden = false;
        } else {
          alert.textContent = `Something went wrong saving your details. Please try again, or email ${cfg.contactEmail}.`;
          alert.hidden = false;
        }
      } finally {
        submit.disabled = false;
        resetTurnstile(ctx);
      }
    });
    return step;
  },

  day(state, ctx, dispatch) {
    const step = el('div', { class: 'inv-step' });
    step.append(h('h3', 'inv-step__title', 'Pick a day'));
    step.append(errorBox(state));
    step.append(tzRow(state, ctx, dispatch));
    const mount = el('div');
    step.append(mount);
    renderCalendar(mount, state, ctx, dispatch);
    return step;
  },

  time(state, ctx, dispatch) {
    const { cfg, api } = ctx;
    const step = el('div', { class: 'inv-step' });
    const dayLabel = formatDay(state.day, state.timezone);
    step.append(h('h3', 'inv-step__title', `Pick a time on ${dayLabel}`), errorBox(state), tzRow(state, ctx, dispatch));
    const list = el('div', { class: 'inv-slots', role: 'group', 'aria-label': 'Available times' });
    list.append(h('p', 'inv-flow__note', 'Loading times…'));
    step.append(list);

    const alert = el('div', { class: 'inv-alert', role: 'alert', hidden: '' });
    const confirm = el('button', { class: 'btn btn--primary', type: 'button', disabled: '' }, `Book ${cfg.durationMinutes} minutes`);
    confirm.append(arrow());
    step.append(alert, actions([confirm, linkButton('Back to the calendar', () => dispatch({ type: 'BACK' }))]));

    loadMonthSlots(state.day.slice(0, 7), state.timezone, ctx).then((slots) => {
      const todays = slots.filter((s) => dayKey(s.startsAt, state.timezone) === state.day);
      list.replaceChildren();
      if (!todays.length) {
        list.append(h('p', 'inv-flow__note', 'No times left on this day. Please pick another.'));
        return;
      }
      for (const s of todays) {
        const b = el('button', { class: 'inv-choice-btn', type: 'button', 'aria-pressed': String(state.slot?.startsAt === s.startsAt) }, formatTime(s.startsAt, state.timezone));
        b.addEventListener('click', () => {
          list.querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
          b.setAttribute('aria-pressed', 'true');
          dispatch({ type: 'SELECT_SLOT', startsAt: s.startsAt, endsAt: s.endsAt });
          confirm.disabled = false;
        });
        list.append(b);
      }
      api.event('slot_view', { day: state.day });
      if (state.slot) confirm.disabled = false;
    });

    confirm.addEventListener('click', async () => {
      if (!state.slot) return;
      confirm.disabled = true;
      alert.hidden = true;
      const res = await api.post('/book', { leadId: state.leadId, startsAt: state.slot.startsAt, timezone: state.timezone, sessionId: api.sid });
      if (res.ok) {
        api.event('booked', {});
        dispatch({ type: 'BOOKED', bookingId: res.body.bookingId, startsAt: res.body.startsAt, endsAt: res.body.endsAt });
        try {
          sessionStorage.setItem('ce_invest_booking', JSON.stringify({ ...res.body, timezone: state.timezone }));
        } catch {
          /* fine */
        }
        location.assign(`${cfg.confirmedPath}?b=${encodeURIComponent(res.body.bookingId)}`);
        return;
      }
      if (res.status === 409) {
        ctx.slotsCache.clear();
        dispatch({ type: 'CONFLICT' });
        return;
      }
      alert.textContent = res.status === 429 ? 'Too many attempts. Please wait a few minutes.' : `We couldn’t complete the booking. Please try again, or email ${cfg.contactEmail}.`;
      alert.hidden = false;
      confirm.disabled = false;
    });
    return step;
  },

  confirmed(state, ctx) {
    const step = el('div', { class: 'inv-step' });
    step.append(h('h3', 'inv-step__title', 'Booked.'), h('p', 'inv-step__help', `${formatDay(dayKey(state.booking.startsAt, state.timezone), state.timezone)} at ${formatTime(state.booking.startsAt, state.timezone)}.`));
    const link = el('a', { class: 'btn btn--primary', href: `${ctx.cfg.confirmedPath}?b=${encodeURIComponent(state.booking.id)}` }, 'Your confirmation');
    link.append(arrow());
    step.append(actions([link]));
    return step;
  },
};

/* ── Calendar ─────────────────────────────────────────────────────────── */

function tzRow(state, ctx, dispatch) {
  const row = el('div', { class: 'inv-tz' });
  const label = el('label', { for: 'fl-tz' }, 'Times shown in');
  const select = el('select', { id: 'fl-tz' });
  const zones = timezones(state.timezone);
  for (const z of zones) {
    const opt = el('option', { value: z }, z.replace(/_/g, ' '));
    if (z === state.timezone) opt.selected = true;
    select.append(opt);
  }
  select.addEventListener('change', () => {
    dispatch({ type: 'SET_TIMEZONE', timezone: select.value });
    // Re-render the current step so slots and day labels move with the zone.
    render(reduce(stateWithTz(state, select.value), { type: 'NOOP' }), ctx, dispatch, { focus: false });
  });
  row.append(label, select);
  return row;
}

function stateWithTz(state, tz) {
  return { ...state, timezone: tz };
}

function renderCalendar(mount, state, ctx, dispatch, month = state.day?.slice(0, 7) || currentMonth(state.timezone)) {
  const { api } = ctx;
  mount.replaceChildren();
  const [y, m] = month.split('-').map(Number);
  const bar = el('div', { class: 'inv-cal__bar' });
  const prev = el('button', { class: 'inv-cal__nav', type: 'button', 'aria-label': 'Previous month' }, '‹');
  const next = el('button', { class: 'inv-cal__nav', type: 'button', 'aria-label': 'Next month' }, '›');
  const title = el('h4', { class: 'inv-cal__month', id: 'cal-month' }, new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
  bar.append(prev, title, next);
  const thisMonth = currentMonth(state.timezone);
  prev.disabled = month <= thisMonth;
  prev.addEventListener('click', () => renderCalendar(mount, state, ctx, dispatch, shiftMonth(month, -1)));
  next.addEventListener('click', () => renderCalendar(mount, state, ctx, dispatch, shiftMonth(month, 1)));

  const grid = el('div', { class: 'inv-cal__grid', role: 'grid', 'aria-labelledby': 'cal-month' });
  const headRow = el('div', { role: 'row', style: 'display:contents' });
  for (const d of ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']) headRow.append(el('div', { class: 'inv-cal__head', role: 'columnheader' }, d));
  grid.append(headRow);
  const status = h('p', 'inv-flow__note', 'Checking availability…');
  mount.append(bar, grid, status);

  loadMonthSlots(month, state.timezone, ctx).then((slots) => {
    const byDay = new Map();
    for (const s of slots) {
      const k = dayKey(s.startsAt, state.timezone);
      byDay.set(k, (byDay.get(k) || 0) + 1);
    }
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = first.getUTCDay();
    const cells = [];
    let row = el('div', { role: 'row', style: 'display:contents' });
    for (let i = 0; i < lead; i++) row.append(el('div', { class: 'inv-cal__day inv-cal__day--empty', role: 'gridcell' }));
    for (let d = 1; d <= daysIn; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`;
      const count = byDay.get(key) || 0;
      const date = new Date(Date.UTC(y, m - 1, d));
      const human = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
      const cell = el(
        'button',
        {
          class: `inv-cal__day${count ? ' inv-cal__day--open' : ''}`,
          type: 'button',
          role: 'gridcell',
          'aria-label': count ? `${human} — ${count} time${count === 1 ? '' : 's'} available` : `${human} — no times`,
          'aria-disabled': String(!count),
          'aria-selected': String(state.day === key),
          tabindex: '-1',
          'data-key': key,
        },
        String(d),
      );
      if (count) cell.addEventListener('click', () => dispatch({ type: 'SELECT_DAY', day: key }));
      cells.push(cell);
      row.append(cell);
      if ((lead + d) % 7 === 0) {
        grid.append(row);
        row = el('div', { role: 'row', style: 'display:contents' });
      }
    }
    if (row.childElementCount) grid.append(row);

    const open = cells.filter((c) => c.getAttribute('aria-disabled') === 'false');
    const focusable = cells.find((c) => c.dataset.key === state.day) || open[0] || cells[0];
    if (focusable) focusable.tabIndex = 0;
    status.textContent = open.length ? `${open.length} day${open.length === 1 ? '' : 's'} with open times this month. Use the arrow keys to move, Enter to choose.` : 'No open times this month. Try the next one.';

    grid.addEventListener('keydown', (e) => {
      const i = cells.indexOf(document.activeElement);
      if (i === -1) return;
      const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7, Home: -i, End: cells.length - 1 - i }[e.key];
      if (delta === undefined) return;
      e.preventDefault();
      const target = cells[Math.max(0, Math.min(cells.length - 1, i + delta))];
      cells.forEach((c) => (c.tabIndex = -1));
      target.tabIndex = 0;
      target.focus();
    });
    api.event('calendar_view', { month });
  });
}

async function loadMonthSlots(month, tz, ctx) {
  const key = `${month}|${tz}`;
  if (ctx.slotsCache.has(key)) return ctx.slotsCache.get(key);
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const to = `${shiftMonth(month, 1)}-01`;
  const res = await ctx.api.get(`/slots?from=${from}&to=${to}&tz=${encodeURIComponent(tz)}`);
  const slots = res.ok ? res.body.slots : [];
  void y;
  void m;
  ctx.slotsCache.set(key, slots);
  return slots;
}

/* ── Turnstile ────────────────────────────────────────────────────────── */

function mountTurnstile(container, cfg, ctx) {
  if (!cfg.turnstileSiteKey) return;
  const renderWidget = () => {
    if (!window.turnstile) return;
    ctx.turnstileWidget = window.turnstile.render(container, {
      sitekey: cfg.turnstileSiteKey,
      callback: (token) => {
        ctx.turnstileToken = token;
      },
      'expired-callback': () => {
        ctx.turnstileToken = null;
      },
      'error-callback': () => {
        ctx.turnstileToken = null;
      },
      appearance: 'interaction-only',
    });
  };
  if (window.turnstile) {
    renderWidget();
    return;
  }
  if (!document.querySelector(`script[src^="${TURNSTILE_SRC.split('?')[0]}"]`)) {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.defer = true;
    s.addEventListener('load', renderWidget);
    s.addEventListener('error', () => {
      container.textContent = 'The verification widget could not load. Please check your connection or try again later.';
    });
    document.head.append(s);
  } else {
    window.addEventListener('load', renderWidget, { once: true });
  }
}

function resetTurnstile(ctx) {
  ctx.turnstileToken = null;
  try {
    if (window.turnstile && ctx.turnstileWidget !== undefined) window.turnstile.reset(ctx.turnstileWidget);
  } catch {
    /* fine */
  }
}

/* ── Sticky CTA & tracking ────────────────────────────────────────────── */

function initSticky() {
  const bar = document.querySelector('[data-sticky]');
  const hero = document.getElementById('top');
  const start = document.getElementById('start-section');
  if (!bar || !hero || !start || !('IntersectionObserver' in window)) return;
  let heroOut = false;
  let startIn = false;
  let keyboard = false;
  const update = () => {
    bar.hidden = !(heroOut && !startIn && !keyboard);
  };
  new IntersectionObserver(([e]) => ((heroOut = !e.isIntersecting), update()), { threshold: 0 }).observe(hero);
  new IntersectionObserver(([e]) => ((startIn = e.isIntersecting), update()), { threshold: 0.05 }).observe(start);
  document.addEventListener('focusin', (e) => ((keyboard = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)), update()));
  document.addEventListener('focusout', () => ((keyboard = false), update()));
  update();
}

function initCtaTracking(api) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#start"]');
    if (!a) return;
    const section = a.closest('section, header, div[data-sticky]');
    api.event('cta_click', { location: section?.id || (a.closest('[data-sticky]') ? 'sticky' : 'unknown') });
    const stage = document.getElementById('start');
    if (stage) {
      e.preventDefault();
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      stage.focus({ preventScroll: true });
      history.replaceState(null, '', '#start');
    }
  });
}

/* ── API ──────────────────────────────────────────────────────────────── */

function createApi(cfg, { sid, touch }) {
  const base = cfg.apiBase;
  async function request(method, path, body) {
    try {
      const res = await fetch(base + path, {
        method,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
      });
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { ok: res.ok, status: res.status, body: json };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  }
  return {
    sid,
    touch,
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    event(name, props) {
      const payload = JSON.stringify({ name, props, sessionId: sid, pageVersion: cfg.pageVersion });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`${base}/event`, new Blob([payload], { type: 'application/json' }));
          return;
        }
      } catch {
        /* fall through */
      }
      fetch(`${base}/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    },
  };
}

/* ── State persistence ────────────────────────────────────────────────── */

function safeStorage() {
  try {
    const s = window.sessionStorage;
    s.setItem('__t', '1');
    s.removeItem('__t');
    return s;
  } catch {
    const mem = new Map();
    return { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  }
}

function restore(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? deserialize(raw) : initialState;
  } catch {
    return initialState;
  }
}

function persist(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, serialize(state));
  } catch {
    /* in memory only */
  }
}

/* ── Dates ────────────────────────────────────────────────────────────── */

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

function timezones(current) {
  let list = [];
  try {
    list = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [];
  } catch {
    list = [];
  }
  if (!list.length) {
    list = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney', 'UTC'];
  }
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

function parts(iso, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const out = {};
  for (const p of fmt.formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

export function dayKey(iso, tz) {
  const p = parts(iso, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

function currentMonth(tz) {
  return dayKey(new Date().toISOString(), tz).slice(0, 7);
}

function shiftMonth(month, by) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatDay(key, tz) {
  const [y, m, d] = key.split('-').map(Number);
  void tz;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function formatTime(iso, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
}

/* ── DOM helpers ──────────────────────────────────────────────────────── */

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

function h(tag, className, text) {
  return el(tag, { class: className }, text);
}

function arrow() {
  return el('span', { class: 'btn__arrow', 'aria-hidden': 'true' }, '→');
}

function choices(items) {
  const wrap = el('div', { class: 'inv-choices' });
  for (const item of items) {
    const b = el('button', { class: 'inv-choice-btn', type: 'button', 'aria-pressed': String(Boolean(item.pressed)) }, item.label);
    b.addEventListener('click', item.onClick);
    wrap.append(b);
  }
  return wrap;
}

function actions(nodes) {
  const wrap = el('div', { class: 'inv-step__actions' });
  wrap.append(...nodes);
  return wrap;
}

function linkButton(label, onClick) {
  const b = el('button', { class: 'inv-link-btn', type: 'button' }, label);
  b.addEventListener('click', onClick);
  return b;
}

function errorBox(state) {
  const box = el('div', { class: 'inv-alert', role: 'alert', hidden: !state.error ? '' : null });
  if (state.error) box.textContent = state.error;
  return box;
}

function helpDetails(cfg) {
  const d = el('details', { class: 'inv-help' });
  d.append(el('summary', {}, 'What counts as accredited?'));
  const ul = el('ul');
  for (const line of cfg.accreditedHelp) ul.append(el('li', {}, line));
  d.append(ul, el('p', {}, cfg.accreditedHelpNote));
  return d;
}

function fieldRow({ id, label, type, autocomplete }) {
  const wrap = el('div', { class: 'inv-field' });
  const lab = el('label', { for: id }, label);
  const input = el('input', { id, name: id.replace('fl-', ''), type, autocomplete, required: '' });
  const err = el('p', { class: 'inv-field__error', id: `${id}-error`, hidden: '' });
  wrap.append(lab, input, err);
  return {
    wrap,
    input,
    setError(message) {
      if (message) {
        err.textContent = message;
        err.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', err.id);
      } else {
        err.hidden = true;
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    },
  };
}

void STEPS;

/* ── Go ───────────────────────────────────────────────────────────────── */

// Last, so every table above (VIEWS in particular) exists before the first render.
if (root && configEl) boot(JSON.parse(configEl.textContent));
