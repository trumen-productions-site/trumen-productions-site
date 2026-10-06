/**
 * The release gate.
 *
 * A render is CLEAN only when config/gate.json says counsel has cleared the
 * series AND names who, when and under what reference, AND lists this episode.
 * Anything short of that is INTERNAL: a two-second slate, a persistent corner
 * watermark and an INTERNAL_ filename prefix.
 *
 * This module takes the parsed gate file and an episode id. It reads nothing
 * else: no environment, no flags, no second config. tests/gate.test.ts scans
 * the repository to prove no bypass exists, and the engine never edits
 * gate.json. Only a human does.
 */
import type { GateConfig } from './schema.js';

export interface GateDecision {
  /** True only when every clearance condition holds. */
  clean: boolean;
  /** Why the render is INTERNAL. Empty when clean. */
  reasons: string[];
  /** The gate as it stood when the decision was made, for the manifest. */
  snapshot: GateConfig;
}

export function decideGate(gate: GateConfig, episodeId: string): GateDecision {
  const reasons: string[] = [];
  if (gate.counselCleared !== true) reasons.push('counselCleared is not true');
  if (gate.clearedBy.trim() === '') reasons.push('clearedBy is empty');
  if (gate.clearedOn.trim() === '') reasons.push('clearedOn is empty');
  if (gate.clearanceReference.trim() === '') reasons.push('clearanceReference is empty');
  if (!gate.episodesCleared.includes(episodeId))
    reasons.push(`episode ${episodeId} is not in episodesCleared`);
  return {
    clean: reasons.length === 0,
    reasons,
    snapshot: structuredClone(gate),
  };
}

/** The filename for an export, prefixed when the gate is closed. */
export function outputBaseName(
  decision: GateDecision,
  slug: string,
  preset: string,
  prefix: string,
): string {
  const base = `${slug}_${preset}`;
  return decision.clean ? base : `${prefix}${base}`;
}
