/**
 * SEC-01 — security headers present; no secrets in the bundle.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { ROOT, DIST } from '../helpers/dom.mjs';
import { parseHeadersFile, headersFor, csp } from '../../src/invest/headers.mjs';

const text = await readFile(path.join(DIST, '_headers'), 'utf8');
const parsed = parseHeadersFile(text);

describe('SEC-01 headers', () => {
  test('the global block carries CSP, HSTS, nosniff, referrer policy and frame-ancestors none', () => {
    const h = parsed['/*'];
    assert.ok(h, 'no /* block');
    assert.match(h['Content-Security-Policy'], /frame-ancestors 'none'/);
    assert.match(h['Content-Security-Policy'], /default-src 'self'/);
    assert.match(h['Content-Security-Policy'], /object-src 'none'/);
    assert.match(h['Content-Security-Policy'], /form-action 'self'/);
    assert.match(h['Strict-Transport-Security'], /max-age=31536000/);
    assert.equal(h['X-Content-Type-Options'], 'nosniff');
    assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.ok(h['Permissions-Policy'].includes('camera=()'));
  });

  test('scripts are allowed only from this origin and Turnstile', () => {
    const scriptSrc = csp().split('; ').find((d) => d.startsWith('script-src'));
    assert.equal(scriptSrc, "script-src 'self' https://challenges.cloudflare.com");
    assert.ok(csp({ metaPixel: true }).includes('connect.facebook.net'), 'the pixel host appears only when the feature is on');
    assert.ok(!csp({ metaPixel: false }).includes('facebook'));
  });

  test('the investor and legal pages are never indexed and never cached', () => {
    for (const p of ['/invest/', '/invest/confirmed/', '/privacy/', '/terms/']) {
      const h = headersFor(p, parsed);
      assert.equal(h['X-Robots-Tag'], 'noindex, nofollow', p);
      assert.equal(h['Cache-Control'], 'no-store', p);
    }
    assert.equal(headersFor('/api/lead', parsed)['Cache-Control'], 'no-store');
    assert.equal(headersFor('/faq/', parsed)['X-Robots-Tag'], undefined, 'the company site stays indexable');
  });

  test('the built HTML has no inline script, so the CSP holds', async () => {
    for (const p of ['/invest/', '/invest/confirmed/', '/privacy/']) {
      const html = await readFile(path.join(DIST, p.replace(/^\//, ''), 'index.html'), 'utf8');
      const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(([, attrs, body]) => !/src=/.test(attrs) && !/type="application\/(ld\+)?json"/.test(attrs) && body.trim());
      assert.deepEqual(inline, [], `${p} has inline script`);
      assert.ok(!/\son[a-z]+="/i.test(html), `${p} has an inline event handler`);
    }
  });
});

describe('SEC-01 no secrets in the bundle', () => {
  test('nothing that looks like a key, and no .dev.vars, reaches dist/', async () => {
    const files = [];
    async function walk(dir) {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else files.push(full);
      }
    }
    await walk(DIST);
    assert.ok(!files.some((f) => f.endsWith('.dev.vars')));
    for (const f of files.filter((x) => /\.(html|js|css|json|txt|xml)$/.test(x))) {
      const s = await readFile(f, 'utf8');
      assert.ok(!/\bre_[A-Za-z0-9]{20,}\b/.test(s), `${f} contains a Resend-shaped key`);
      assert.ok(!/\bcal_live_[A-Za-z0-9]{10,}/.test(s), `${f} contains a Cal.com-shaped key`);
      assert.ok(!/0x[0-9A-Fa-f]{30,}/.test(s), `${f} contains a Turnstile-secret-shaped string`);
      assert.ok(!/(TURNSTILE_SECRET|RESEND_API_KEY|CALCOM_API_KEY|IP_SALT|CRON_SECRET)\s*=/.test(s), `${f} contains a secret assignment`);
    }
  });

  test('.dev.vars is gitignored and only the example is committed', async () => {
    const ignore = await readFile(path.join(ROOT, '.gitignore'), 'utf8');
    assert.ok(ignore.split('\n').includes('.dev.vars'));
    await readFile(path.join(ROOT, '.dev.vars.example'), 'utf8');
  });
});
