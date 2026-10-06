/**
 * Project paths. Everything resolves from the project root so the CLI, the
 * Remotion bundle's prepare step and the tests agree on where things are.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The directory that holds package.json, config/, episodes/, src/. */
export const PROJECT_ROOT = path.resolve(here, '..', '..');

export const CONFIG_DIR = path.join(PROJECT_ROOT, 'config');
export const EPISODES_DIR = path.join(PROJECT_ROOT, 'episodes');
export const RIGS_DIR = path.join(PROJECT_ROOT, 'src', 'rigs');
export const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
export const OUT_DIR = path.join(PROJECT_ROOT, 'out');
export const CACHE_DIR = path.join(PROJECT_ROOT, '.cache');
export const TOOLS_DIR = path.join(PROJECT_ROOT, 'tools');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

export function configPath(name: string): string {
  return path.join(CONFIG_DIR, name);
}

/** Find an episode folder by its three-digit id ("001") or full folder name ("001-number-one"). */
export function episodeDir(idOrFolder: string, episodesDir = EPISODES_DIR): string {
  const direct = path.join(episodesDir, idOrFolder);
  if (existsSync(direct)) return direct;
  const match = readdirSync(episodesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((name) => name.startsWith(`${idOrFolder}-`) || name === idOrFolder);
  if (!match) {
    throw new Error(`No episode "${idOrFolder}" under ${episodesDir}`);
  }
  return path.join(episodesDir, match);
}
