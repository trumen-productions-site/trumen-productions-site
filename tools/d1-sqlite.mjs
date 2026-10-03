/**
 * A D1-shaped wrapper over node:sqlite.
 *
 * The Pages Functions in functions/ talk to Cloudflare D1 through the small
 * API they actually use: prepare().bind().first()/run()/all(), exec() and
 * batch(). This gives the test suite and the local dev server the same
 * shape over Node's built-in SQLite, running the real migration, so what the
 * tests prove about SQL is what production runs.
 *
 * Node 22.13+ (node:sqlite). No dependencies.
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class D1Sqlite {
  constructor(file = ':memory:') {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  /** Run every migration in db/migrations, in order. */
  migrate() {
    const dir = path.join(ROOT, 'db', 'migrations');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      this.db.exec(readFileSync(path.join(dir, f), 'utf8'));
    }
    return this;
  }

  prepare(sql) {
    const db = this.db;
    let params = [];
    const stmt = {
      bind(...p) {
        params = p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
        return stmt;
      },
      async first(column) {
        const raw = db.prepare(sql).get(...params);
        const row = raw ? { ...raw } : null; // D1 returns plain objects; node:sqlite returns null-prototype rows
        if (column === undefined) return row;
        return row ? row[column] : null;
      },
      async run() {
        const r = db.prepare(sql).run(...params);
        return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
      },
      async all() {
        return { success: true, results: db.prepare(sql).all(...params).map((r) => ({ ...r })) };
      },
      async raw() {
        return db.prepare(sql).all(...params).map((r) => Object.values(r));
      },
    };
    return stmt;
  }

  async exec(sql) {
    this.db.exec(sql);
    return { count: sql.split(';').filter((s) => s.trim()).length };
  }

  async batch(statements) {
    const out = [];
    this.db.exec('BEGIN');
    try {
      for (const s of statements) out.push(await s.run());
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return out;
  }

  close() {
    this.db.close();
  }
}

/** A fresh, migrated, in-memory database. */
export function freshDb() {
  return new D1Sqlite(':memory:').migrate();
}

export default D1Sqlite;
