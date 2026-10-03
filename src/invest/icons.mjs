/**
 * Line icons for the perk and marketing cards. Drawn, 24-unit grid, one
 * stroke weight, always `aria-hidden` — the card's title is the meaning.
 */

const PATHS = {
  credit: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/>',
  set: '<path d="M3 8l9-4 9 4-9 4-9-4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>',
  premiere: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4l-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z"/>',
  festival: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
  dinner: '<path d="M7 3v8M5 3v5a2 2 0 004 0V3"/><path d="M7 11v10"/><path d="M16 3c-2 0-3 3-3 6s1 4 3 4v8"/>',
  updates: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  document: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 11h6M9 15h6"/>',
  audience: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0112 0"/><path d="M15 20a4 4 0 016-3.5"/>',
  calendar: '<path d="M4 6h16v14H4z"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
};

export function icon(name, { size = 28, className = 'inv-icon' } = {}) {
  const d = PATHS[name] || PATHS.document;
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

export default icon;
