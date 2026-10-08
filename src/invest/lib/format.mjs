/**
 * Formatting for the terms. Numbers live in config as numbers; every string
 * a reader sees is produced here, so the same figure never appears in two
 * styles on one page.
 */

/** $25,000 */
export function money(n) {
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** $25K · $1.5M · $250K — for the stat tiles. */
export function moneyCompact(n) {
  const v = Number(n);
  if (v >= 1_000_000) return `$${trimZero((v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1))}M`;
  if (v >= 1_000) return `$${trimZero((v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1))}K`;
  return money(v);
}

/** 120% */
export function pct(n) {
  return `${trimZero(Number(n).toFixed(1))}%`;
}

/** 2.5× */
export function multiple(n) {
  return `${trimZero(Number(n).toFixed(1))}×`;
}

function trimZero(str) {
  return str.replace(/\.0$/, '');
}

/**
 * The amount ranges offered at step 2, generated from the minimum so the
 * page never offers a range below it.
 */
export function amountRanges(minimum) {
  const m = Number(minimum);
  const steps = [m, m * 2, m * 4, m * 10];
  const out = [];
  for (let i = 0; i < steps.length - 1; i++) {
    out.push({ id: `r${i}`, label: `${moneyCompact(steps[i])} – ${moneyCompact(steps[i + 1])}`, min: steps[i], max: steps[i + 1] });
  }
  out.push({ id: `r${steps.length - 1}`, label: `${moneyCompact(steps[steps.length - 1])} or more`, min: steps[steps.length - 1], max: null });
  return out;
}

/** A date in the reader's zone: "Tuesday, March 3, 2027". */
export function longDate(iso, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone }).format(new Date(iso));
}

/** "2:30 PM EST" */
export function clock(iso, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-US', { timeStyle: 'short', timeZone, timeZoneName: 'short' }).format(new Date(iso));
}
