#!/usr/bin/env node
/**
 * Export leads (with their booking and consents) as CSV for the producer.
 *
 * From the production database:
 *   npx wrangler d1 execute ce_invest --remote --json \
 *     --command "$(node scripts/export-leads.mjs --sql)" | node scripts/export-leads.mjs > leads.csv
 *
 * From the local development database:
 *   node scripts/export-leads.mjs --db .data/invest.sqlite > leads.csv
 *
 * The export contains personal data. Keep it where the RUNBOOK says, and
 * delete it when it has served its purpose.
 */

import { readFileSync } from 'node:fs';

export const SQL = `
SELECT l.id, l.created_at, l.status, l.channel, l.name, l.email, l.phone, l.timezone,
       l.accredited_self_report, l.amount_range, l.interest,
       l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content, l.utm_term, l.utm_id, l.landing_path, l.referrer,
       l.page_version,
       b.starts_at AS booked_for, b.provider AS booking_provider, b.status AS booking_status,
       (SELECT GROUP_CONCAT(kind || ':' || granted, ';') FROM consents c WHERE c.lead_id = l.id) AS consents
FROM leads l
LEFT JOIN bookings b ON b.lead_id = l.id AND b.status = 'confirmed'
ORDER BY l.created_at DESC`.trim();

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
}

/** Rows from `wrangler d1 execute --json` output. */
export function rowsFromWranglerJson(text) {
  const parsed = JSON.parse(text);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  return first?.results ?? [];
}

const args = process.argv.slice(2);
if (args.includes('--sql')) {
  process.stdout.write(SQL.replace(/\s+/g, ' '));
} else if (args.includes('--db')) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(args[args.indexOf('--db') + 1]);
  process.stdout.write(toCsv(db.prepare(SQL).all().map((r) => ({ ...r }))));
} else if (!process.stdin.isTTY) {
  process.stdout.write(toCsv(rowsFromWranglerJson(readFileSync(0, 'utf8'))));
} else {
  console.error('Usage: see the header of scripts/export-leads.mjs');
  process.exit(1);
}
