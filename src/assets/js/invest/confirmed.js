/**
 * The confirmation page: fetch the booking by its id and show it in the
 * investor's own timezone, with a calendar file. The id is a random UUID
 * and the API returns no personal data for it — only the time and the host.
 */

const titleEl = document.querySelector('[data-confirm-title]');
const whenEl = document.querySelector('[data-confirm-when] span');
const tzEl = document.querySelector('[data-confirm-tz]');
const icsEl = document.querySelector('[data-confirm-ics]');

const id = new URLSearchParams(location.search).get('b');

let stored = null;
try {
  stored = JSON.parse(sessionStorage.getItem('ce_invest_booking') || 'null');
} catch {
  stored = null;
}

const tz = stored?.timezone || safeTz();

if (!id) {
  showMissing();
} else {
  fetch(`/api/book?id=${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((b) => show(b))
    .catch(() => (stored && stored.bookingId === id ? show(stored) : showMissing()));
}

function show(b) {
  const start = new Date(b.startsAt);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(start);
  const end = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(b.endsAt));
  if (whenEl) whenEl.textContent = `${day}, ${time} – ${end}`;
  if (tzEl) tzEl.textContent = `Shown in ${tz.replace(/_/g, ' ')}. The calendar file carries the exact time wherever you are.`;
  if (icsEl) {
    icsEl.href = `/api/ics?id=${encodeURIComponent(b.bookingId || id)}`;
    icsEl.hidden = false;
  }
}

function showMissing() {
  if (titleEl) titleEl.textContent = 'We couldn’t find that booking.';
  if (whenEl) whenEl.textContent = 'If you have just booked, the details are in your confirmation email.';
  if (tzEl) tzEl.textContent = '';
}

function safeTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}
