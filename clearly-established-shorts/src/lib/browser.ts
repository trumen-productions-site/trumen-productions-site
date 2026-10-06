/**
 * Browser discovery for Remotion.
 *
 * Remotion needs a Chromium. On machines with network access it downloads one
 * itself; on machines without, a locally installed headless shell is used if it
 * sits at one of these known paths. This is the ONLY place in the engine that
 * consults the environment, and it affects where pixels come from, never what
 * they show. tests/gate.test.ts pins that.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const KNOWN_DIRS = ['/opt/pw-browsers', path.join(homeDir(), '.cache', 'ms-playwright')];

function homeDir(): string {
  // eslint-disable-next-line no-process-env -- the only environment read in the engine; see tests/gate.test.ts
  return process.env.HOME ?? '/root';
}

export function findLocalBrowser(): string | null {
  for (const dir of KNOWN_DIRS) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir).sort().reverse();
    for (const entry of entries) {
      if (!entry.startsWith('chromium_headless_shell')) continue;
      const candidate = path.join(dir, entry, 'chrome-linux', 'headless_shell');
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}
