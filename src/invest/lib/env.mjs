/**
 * Build environment for the investor pages.
 *
 * There are two builds. `staging` (the default) renders Pending tokens and
 * the red STAGING ribbon and ignores the launch gates. `production`
 * (`npm run build:prod`, or INVEST_ENV=production) renders neither and is
 * refused by build.mjs unless every gate check passes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function buildEnv() {
  if (process.env.INVEST_ENV === 'production' || process.argv.includes('--prod')) return 'production';
  return 'staging';
}

export const isProduction = () => buildEnv() === 'production';

/**
 * The git SHA of the build — stored with every lead as `page_version`, so
 * there is a record of exactly which copy and disclaimers each investor saw.
 * Hosts expose it in their own variable; a local build reads .git.
 */
export function gitSha() {
  for (const key of ['CF_PAGES_COMMIT_SHA', 'COMMIT_REF', 'GITHUB_SHA', 'VERCEL_GIT_COMMIT_SHA']) {
    if (process.env[key]) return process.env[key].slice(0, 12);
  }
  try {
    const head = readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return head.slice(0, 12);
    const refPath = path.join(ROOT, '.git', head.slice(5).trim());
    if (existsSync(refPath)) return readFileSync(refPath, 'utf8').trim().slice(0, 12);
    const packed = path.join(ROOT, '.git', 'packed-refs');
    if (existsSync(packed)) {
      const line = readFileSync(packed, 'utf8')
        .split('\n')
        .find((l) => l.endsWith(head.slice(5).trim()));
      if (line) return line.split(' ')[0].slice(0, 12);
    }
  } catch {
    /* fall through */
  }
  return 'unversioned';
}
