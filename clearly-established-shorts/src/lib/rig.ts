/**
 * Rig mechanics, browser-safe and pure.
 *
 * A rig is one SVG with named groups plus rig.json. The engine reads group
 * names only: it prefixes every id so several rigs can share a page, then
 * drives the groups with a per-frame stylesheet. A replacement SVG with the
 * same group names drops in and renders.
 */
import type { RigConfig, Viseme } from './schema.js';
import { RIG_GROUPS, VISEMES } from './schema.js';

/** Prefix every id and every reference to one ("#id", "url(#id)"). */
export function prefixSvgIds(svg: string, prefix: string): string {
  const ids = new Set<string>();
  for (const m of svg.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]!);
  let out = svg.replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${prefix}-${id}"`);
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${prefix}-${id})`);
    out = out.replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${prefix}-${id}"`);
  }
  return out;
}

export function groupsIn(svg: string): Set<string> {
  const found = new Set<string>();
  for (const m of svg.matchAll(/\bid="([^"]+)"/g)) found.add(m[1]!);
  return found;
}

/** Which of the required groups the SVG is missing. Silhouettes may lack a face. */
export function missingGroups(svg: string, required: readonly string[] = RIG_GROUPS): string[] {
  const found = groupsIn(svg);
  return required.filter((g) => !found.has(g));
}

export function availableVisemes(svg: string): Viseme[] {
  const found = groupsIn(svg);
  return VISEMES.filter((v) => found.has(`mouth-${v}`));
}

/** Nearest drawn shape for a viseme the rig does not have. */
const FALLBACK: Record<Viseme, Viseme[]> = {
  A: ['X', 'B'],
  B: ['C', 'A', 'X'],
  C: ['B', 'D', 'E'],
  D: ['C', 'E', 'B'],
  E: ['C', 'F', 'B'],
  F: ['E', 'B', 'X'],
  G: ['B', 'X'],
  H: ['C', 'D', 'B'],
  X: ['A', 'B'],
};

export function resolveViseme(wanted: Viseme, available: Viseme[]): Viseme | null {
  if (available.length === 0) return null;
  if (available.includes(wanted)) return wanted;
  for (const alt of FALLBACK[wanted]) if (available.includes(alt)) return alt;
  return available[0] ?? null;
}

/** 1 = open, 0 = shut. Deterministic from time: a blink every `everySeconds`, offset per rig instance. */
export function blinkOpenness(seconds: number, blink: RigConfig['blink'], phaseOffset = 0): number {
  const period = blink.everySeconds;
  const local = (((seconds + phaseOffset) % period) + period) % period;
  const d = blink.durationSeconds;
  if (local > d) return 1;
  // Raised cosine: shut at the midpoint.
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * local) / d);
}

export interface RigPoseState {
  pose: string;
  expression: string;
  viseme: Viseme;
  /** 0..1, multiplied into the expression's eyeOpen. */
  blink: number;
  /** Seconds, for idle motion. */
  seconds: number;
  /** 0 = frozen, 1 = normal idle. */
  idle: number;
  /** Degrees, added to the head. */
  headTurn?: number;
}

/** Linear blend between two poses, t in 0..1. */
export function blendPose(
  a: RigConfig['poses'][string],
  b: RigConfig['poses'][string],
  t: number,
): RigConfig['poses'][string] {
  const mix = (x: number | undefined, y: number | undefined) =>
    (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
  return {
    arm_l: mix(a.arm_l, b.arm_l),
    arm_r: mix(a.arm_r, b.arm_r),
    hand_l: mix(a.hand_l, b.hand_l),
    hand_r: mix(a.hand_r, b.hand_r),
    head: mix(a.head, b.head),
    torsoLean: mix(a.torsoLean, b.torsoLean),
  };
}

/** The stylesheet that puts the rig into a state. Group ids carry `prefix`. */
export function rigStyle(
  prefix: string,
  config: RigConfig,
  state: RigPoseState,
  available: Viseme[],
  poseOverride?: RigConfig['poses'][string],
): string {
  const pose = poseOverride ??
    config.poses[state.pose] ??
    config.poses['rest'] ?? { arm_l: 0, arm_r: 0, hand_l: 0, hand_r: 0 };
  const expr = config.expressions[state.expression] ??
    config.expressions['level'] ?? { brow_l: 0, brow_r: 0, eyeOpen: 1 };
  const idle = state.idle;
  const breath = Math.sin(state.seconds * 2 * Math.PI * 0.22) * idle;
  const sway = Math.sin(state.seconds * 2 * Math.PI * 0.09 + 1.3) * idle;
  const eyeOpen = Math.max(0.04, expr.eyeOpen * state.blink);
  const p = config.pivots;
  const rules: string[] = [];
  const origin = (pt: { x: number; y: number }) =>
    `transform-box: view-box; transform-origin: ${pt.x}px ${pt.y}px;`;
  rules.push(
    `#${prefix}-torso { ${origin({ x: 300, y: 720 })} transform: rotate(${(pose.torsoLean ?? 0) + sway * 0.4}deg) scaleY(${1 + breath * 0.004}); }`,
  );
  rules.push(
    `#${prefix}-head { ${origin(p.head)} transform: rotate(${(pose.head ?? 0) + (expr.headTilt ?? 0) + (state.headTurn ?? 0) + sway * 0.6}deg) translateY(${breath * 1.2}px); }`,
  );
  rules.push(
    `#${prefix}-brow_l { ${origin(p.brow_l)} transform: translateY(${-expr.brow_l}px) rotate(${-(expr.browTilt ?? 0)}deg); }`,
  );
  rules.push(
    `#${prefix}-brow_r { ${origin(p.brow_r)} transform: translateY(${-expr.brow_r}px) rotate(${expr.browTilt ?? 0}deg); }`,
  );
  rules.push(
    `#${prefix}-eye_l, #${prefix}-eye_r { transform-box: fill-box; transform-origin: center; transform: scaleY(${eyeOpen.toFixed(3)}); }`,
  );
  rules.push(
    `#${prefix}-arm_l { ${origin(p.arm_l)} transform: rotate(${pose.arm_l + breath * 0.5}deg); }`,
  );
  rules.push(
    `#${prefix}-arm_r { ${origin(p.arm_r)} transform: rotate(${pose.arm_r - breath * 0.5}deg); }`,
  );
  rules.push(`#${prefix}-hand_l { ${origin(p.hand_l)} transform: rotate(${pose.hand_l}deg); }`);
  rules.push(`#${prefix}-hand_r { ${origin(p.hand_r)} transform: rotate(${pose.hand_r}deg); }`);
  const shown = resolveViseme(state.viseme, available);
  for (const v of available) {
    rules.push(`#${prefix}-mouth-${v} { visibility: ${v === shown ? 'visible' : 'hidden'}; }`);
  }
  return rules.join('\n');
}
