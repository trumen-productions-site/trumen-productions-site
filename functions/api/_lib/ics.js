/**
 * An iCalendar file for the booked call (RFC 5545). Plain text, CRLF line
 * endings, folded at 75 octets.
 */

function stamp(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer_byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer_byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

function Buffer_byteLength(s) {
  return new TextEncoder().encode(s).length;
}

export function buildIcs({ uid, startsAt, endsAt, summary, description, location, organizerName, organizerEmail, attendeeName, attendeeEmail, url }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Revelatory Productions, LLC//Clearly Established Investor Page//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(startsAt)}`,
    `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${escapeText(summary)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    location ? `LOCATION:${escapeText(location)}` : null,
    url ? `URL:${url}` : null,
    organizerEmail ? `ORGANIZER;CN=${escapeText(organizerName || organizerEmail)}:mailto:${organizerEmail}` : null,
    attendeeEmail ? `ATTENDEE;CN=${escapeText(attendeeName || attendeeEmail)};ROLE=REQ-PARTICIPANT:mailto:${attendeeEmail}` : null,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
