/**
 * Loading and validating one episode: spec + approved script + gate decision.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { assertClean, lintCards, lintText, type LintFinding } from './canon.js';
import { loadGate } from './config.js';
import type { AllConfig } from './config.js';
import { decideGate, type GateDecision } from './gate.js';
import { parseScript, type ApprovedScript } from './script.js';
import { episodeSchema, formatIssues, type EpisodeSpec } from './schema.js';
import { resolveAnchor, scratchTimings, TimingError, type LineTiming } from './timing.js';

export interface LoadedEpisode {
  dir: string;
  folder: string;
  spec: EpisodeSpec;
  script: ApprovedScript;
  scriptRaw: string;
  /** True when audio/take.wav exists. */
  hasTake: boolean;
  takePath: string;
  scratchPath: string;
}

export function loadEpisode(dir: string): LoadedEpisode {
  const specFile = path.join(dir, 'episode.json');
  if (!existsSync(specFile)) throw new Error(`${dir} has no episode.json`);
  const parsed = episodeSchema.safeParse(JSON.parse(readFileSync(specFile, 'utf8')));
  if (!parsed.success) {
    throw new Error(
      `${path.relative(process.cwd(), specFile)} is invalid:\n  - ${formatIssues(parsed.error).join('\n  - ')}`,
    );
  }
  const spec = parsed.data;
  const scriptFile = path.join(dir, spec.script);
  if (!existsSync(scriptFile)) throw new Error(`${dir} has no ${spec.script}`);
  const scriptRaw = readFileSync(scriptFile, 'utf8');
  const takePath = path.join(dir, spec.audio.take);
  return {
    dir,
    folder: path.basename(dir),
    spec,
    script: parseScript(scriptRaw),
    scriptRaw,
    hasTake: existsSync(takePath),
    takePath,
    scratchPath: path.join(dir, spec.audio.scratch),
  };
}

/** The gate decision for an episode. The only input is config/gate.json. */
export function gateFor(spec: EpisodeSpec): GateDecision {
  return decideGate(loadGate(), spec.id);
}

/**
 * Canon lint for everything that will reach the screen: cards, the script,
 * the title, and cast labels. Plus the hook deadline, checked against the
 * scratch plan (and again against the real alignment at prepare time).
 */
export function lintEpisode(
  ep: LoadedEpisode,
  config: AllConfig,
  lines?: LineTiming[],
): LintFinding[] {
  const where = `episodes/${ep.folder}`;
  const findings: LintFinding[] = [];
  findings.push(...lintCards(config.canon, ep.spec.cards, where));
  findings.push(...lintText(config.canon, ep.spec.title, `${where} title`));
  ep.script.lines.forEach((line, i) =>
    findings.push(...lintText(config.canon, line, `${where} script line ${i + 1}`)),
  );
  ep.spec.cast.forEach((c, i) => {
    if (c.label) findings.push(...lintText(config.canon, c.label, `${where} cast[${i}].label`));
  });

  const timings = lines ?? scratchTimings(ep.spec.scratchLines, config.series.lineGapSeconds);
  const takeEnd = timings[timings.length - 1]?.end ?? 0;
  for (const beat of ep.spec.beats) {
    try {
      const t = resolveAnchor(beat.at, { lines: timings, takeEnd });
      if (beat.id === 'hook' && t > config.series.hookDeadlineSeconds) {
        findings.push({
          level: 'error',
          rule: 'hook',
          where: `${where} beats.hook`,
          message: `the hook lands at ${t.toFixed(2)}s; it must land inside the first ${config.series.hookDeadlineSeconds.toFixed(1)} seconds`,
        });
      }
    } catch (e) {
      if (e instanceof TimingError)
        findings.push({
          level: 'error',
          rule: 'anchor',
          where: `${where} beats.${beat.id}`,
          message: e.message,
        });
      else throw e;
    }
  }
  for (const [i, card] of ep.spec.cards.entries()) {
    try {
      resolveAnchor(card.at, { lines: timings, takeEnd });
    } catch (e) {
      if (e instanceof TimingError)
        findings.push({
          level: 'error',
          rule: 'anchor',
          where: `${where} cards[${i}]`,
          message: e.message,
        });
      else throw e;
    }
  }
  if (ep.script.lines.length > 0 && ep.script.lines.length !== ep.spec.scratchLines.length) {
    findings.push({
      level: 'warning',
      rule: 'scratch-plan',
      where,
      message: `the approved script has ${ep.script.lines.length} lines but scratchLines plans ${ep.spec.scratchLines.length}; the take governs, the scratch plan is only for development`,
    });
  }
  return findings;
}

export function assertEpisodeClean(
  ep: LoadedEpisode,
  config: AllConfig,
  lines?: LineTiming[],
): LintFinding[] {
  const findings = lintEpisode(ep, config, lines);
  assertClean(findings);
  return findings;
}
