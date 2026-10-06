/** Loading rigs from disk (Node side). */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RIGS_DIR } from './paths.js';
import { missingGroups } from './rig.js';
import { parseOrThrow, rigSchema } from './schema.js';
import type { RigBundle } from './types.js';

/** Groups a speaking lead must have. Silhouettes are exempt from the face. */
export const LEAD_GROUPS = [
  'head',
  'brow_l',
  'brow_r',
  'eye_l',
  'eye_r',
  'mouth',
  'torso',
  'arm_l',
  'arm_r',
  'hand_l',
  'hand_r',
] as const;

export function loadRig(name: string, rigsDir = RIGS_DIR): RigBundle {
  const dir = path.join(rigsDir, name);
  const cfgFile = path.join(dir, 'rig.json');
  if (!existsSync(cfgFile)) throw new Error(`rig "${name}" has no rig.json under ${dir}`);
  const config = parseOrThrow(
    rigSchema,
    JSON.parse(readFileSync(cfgFile, 'utf8')),
    `${name}/rig.json`,
  );
  if (config.name !== name)
    throw new Error(`rig folder "${name}" but rig.json says "${config.name}"`);
  const svgFile = path.join(dir, config.svg);
  if (!existsSync(svgFile))
    throw new Error(`rig "${name}" names ${config.svg} but it is not in ${dir}`);
  const svg = readFileSync(svgFile, 'utf8');
  if (config.provenance !== 'silhouette') {
    const missing = missingGroups(svg, LEAD_GROUPS);
    if (missing.length > 0)
      throw new Error(
        `rig "${name}" is missing group${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`,
      );
  }
  return { config, svg };
}
