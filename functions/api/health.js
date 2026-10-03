/**
 * GET /api/health — database and scheduler reachability, and which launch
 * gates are signed (booleans only; who signed is in the repository).
 */

import { json } from './_lib/http.js';
import { getScheduler } from './_lib/scheduler.js';
import gates from '../../src/invest/config/gates.json' with { type: 'json' };

export async function onRequestGet(context) {
  const { env } = context;
  const out = { ok: true, db: false, scheduler: false, provider: null, gates: {}, time: new Date().toISOString() };
  try {
    const row = await env.DB.prepare('SELECT 1 AS one').first();
    out.db = row?.one === 1;
  } catch {
    out.db = false;
  }
  try {
    const s = getScheduler(env);
    out.provider = s.name;
    out.scheduler = await s.ping();
  } catch {
    out.scheduler = false;
  }
  for (const [id, g] of Object.entries(gates)) {
    if (id.startsWith('_')) continue;
    out.gates[id] = Boolean(g.signed);
  }
  out.ok = out.db && out.scheduler;
  return json(out, out.ok ? 200 : 503);
}
