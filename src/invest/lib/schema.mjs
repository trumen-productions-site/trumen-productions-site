/**
 * A small schema validator — the shape of zod, none of the weight.
 *
 * The project has no dependencies by design, and the investor config needs
 * exactly one thing from a validator: refuse to build when a term is the
 * wrong shape, and say where. Each schema is a function `(value, path) =>
 * value` that throws a SchemaError listing every problem it found.
 *
 *   const Offering = s.object({ minimum: s.pendingOr(s.number()), ... });
 *   Offering.parse(offering, 'offering');
 */

import { isPending } from './pending.mjs';

export class SchemaError extends Error {
  constructor(problems) {
    super(`Config does not match its schema:\n  - ${problems.join('\n  - ')}`);
    this.name = 'SchemaError';
    this.problems = problems;
  }
}

const make = (check) => ({
  /** Validate; throws SchemaError with every problem. */
  parse(value, path = 'value') {
    const problems = [];
    check(value, path, problems);
    if (problems.length) throw new SchemaError(problems);
    return value;
  },
  /** Validate; returns the problem list instead of throwing. */
  problems(value, path = 'value') {
    const problems = [];
    check(value, path, problems);
    return problems;
  },
  _check: check,
});

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

export const s = {
  string: ({ min = 0, pattern } = {}) =>
    make((v, p, out) => {
      if (typeof v !== 'string') return out.push(`${p}: expected string, got ${typeOf(v)}`);
      if (v.length < min) out.push(`${p}: expected at least ${min} characters`);
      if (pattern && !pattern.test(v)) out.push(`${p}: "${v}" does not match ${pattern}`);
    }),

  number: ({ min, max, integer = false } = {}) =>
    make((v, p, out) => {
      if (typeof v !== 'number' || Number.isNaN(v)) return out.push(`${p}: expected number, got ${typeOf(v)}`);
      if (integer && !Number.isInteger(v)) out.push(`${p}: expected an integer`);
      if (min !== undefined && v < min) out.push(`${p}: ${v} is below the minimum ${min}`);
      if (max !== undefined && v > max) out.push(`${p}: ${v} is above the maximum ${max}`);
    }),

  boolean: () =>
    make((v, p, out) => {
      if (typeof v !== 'boolean') out.push(`${p}: expected boolean, got ${typeOf(v)}`);
    }),

  literal: (expected) =>
    make((v, p, out) => {
      if (v !== expected) out.push(`${p}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(v)}`);
    }),

  enum: (values) =>
    make((v, p, out) => {
      if (!values.includes(v)) out.push(`${p}: expected one of ${values.map((x) => JSON.stringify(x)).join(', ')}, got ${JSON.stringify(v)}`);
    }),

  nullable: (inner) =>
    make((v, p, out) => {
      if (v === null) return;
      inner._check(v, p, out);
    }),

  optional: (inner) =>
    make((v, p, out) => {
      if (v === undefined) return;
      inner._check(v, p, out);
    }),

  array: (inner, { min = 0 } = {}) =>
    make((v, p, out) => {
      if (!Array.isArray(v)) return out.push(`${p}: expected array, got ${typeOf(v)}`);
      if (v.length < min) out.push(`${p}: expected at least ${min} item(s)`);
      v.forEach((item, i) => inner._check(item, `${p}[${i}]`, out));
    }),

  object: (shape, { strict = true } = {}) =>
    make((v, p, out) => {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return out.push(`${p}: expected object, got ${typeOf(v)}`);
      for (const [key, inner] of Object.entries(shape)) inner._check(v[key], `${p}.${key}`, out);
      if (strict) {
        for (const key of Object.keys(v)) {
          if (!(key in shape) && !key.startsWith('_')) out.push(`${p}.${key}: unexpected key`);
        }
      }
    }),

  record: (inner) =>
    make((v, p, out) => {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return out.push(`${p}: expected object, got ${typeOf(v)}`);
      for (const [key, item] of Object.entries(v)) inner._check(item, `${p}.${key}`, out);
    }),

  /** Either a Pending marker or a value matching `inner`. */
  pendingOr: (inner) =>
    make((v, p, out) => {
      if (isPending(v)) {
        if (!v.pending.trim()) out.push(`${p}: a Pending must say why it is pending`);
        return;
      }
      inner._check(v, p, out);
    }),

  /** Any value matching one of the alternatives. */
  union: (...alts) =>
    make((v, p, out) => {
      const attempts = alts.map((a) => a.problems(v, p));
      if (attempts.some((a) => a.length === 0)) return;
      out.push(`${p}: matched none of ${alts.length} alternatives (${attempts.map((a) => a[0]).join(' | ')})`);
    }),

  /** A custom predicate. */
  refine: (inner, predicate, message) =>
    make((v, p, out) => {
      const before = out.length;
      inner._check(v, p, out);
      if (out.length === before && !predicate(v)) out.push(`${p}: ${message}`);
    }),

  any: () => make(() => {}),
  function: () =>
    make((v, p, out) => {
      if (typeof v !== 'function') out.push(`${p}: expected function, got ${typeOf(v)}`);
    }),
};

export default s;
