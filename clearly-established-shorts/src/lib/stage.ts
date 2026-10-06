/**
 * Staging: what the beats mean, as pure functions of time. Browser-safe.
 */
import type { CastMember, RigConfig } from './schema.js';
import type { ResolvedBeat } from './types.js';

export const ease = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Progress 0..1 of an action that began at `start` and lasts `dur`. */
export const progress = (seconds: number, start: number, dur: number): number =>
  ease((seconds - start) / dur);

export interface LeadState {
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
  pose: string;
  poseBlend: { from: string; to: string; t: number } | null;
  expression: string;
  headTurn: number;
  idle: number;
}

export interface RoomState {
  pose: string;
  poseBlend: { from: string; to: string; t: number } | null;
  idle: number;
  /** 1 = full light. */
  dim: number;
  /** Head bob in degrees for murmur. */
  bob: number;
  variant: string | null;
}

export interface CameraState {
  scale: number;
  x: number;
  y: number;
}

export interface SceneState {
  lead: LeadState;
  room: RoomState;
  camera: CameraState;
}

const LEAD_ACTIONS = new Set([
  'lead_enters',
  'lead_steps_forward',
  'lead_turns_to_room',
  'lead_looks_down',
  'lead_looks_up',
  'lead_lifts_receiver',
  'hold_on_lead',
]);

export function sceneAt(seconds: number, beats: ResolvedBeat[]): SceneState {
  const lead: LeadState = {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    opacity: 1,
    pose: 'rest',
    poseBlend: null,
    expression: 'level',
    headTurn: 0,
    idle: 1,
  };
  const room: RoomState = { pose: 'rest', poseBlend: null, idle: 1, dim: 1, bob: 0, variant: null };
  const camera: CameraState = { scale: 1, x: 0, y: 0 };
  const started = beats.filter((b) => b.seconds <= seconds).sort((a, b) => a.seconds - b.seconds);
  const blendPose = (from: string, to: string, t: number) =>
    t >= 1 ? { pose: to, poseBlend: null } : { pose: from, poseBlend: { from, to, t } };

  for (const beat of started) {
    const since = seconds - beat.seconds;
    if (beat.expression && LEAD_ACTIONS.has(beat.action)) lead.expression = beat.expression;
    switch (beat.action) {
      case 'lead_enters': {
        const p = progress(seconds, beat.seconds, 0.9);
        lead.offsetX = -260 * (1 - p);
        lead.opacity = Math.min(1, p * 1.6);
        break;
      }
      case 'lead_steps_forward': {
        const p = progress(seconds, beat.seconds, 0.8);
        lead.scale = 1 + 0.07 * p;
        lead.offsetY = 18 * p;
        Object.assign(lead, blendPose(lead.pose, 'address', p));
        break;
      }
      case 'lead_turns_to_room': {
        lead.headTurn = 12 * progress(seconds, beat.seconds, 0.5);
        break;
      }
      case 'lead_looks_down': {
        lead.headTurn = 0;
        Object.assign(
          lead,
          blendPose(lead.pose, 'hands_down', progress(seconds, beat.seconds, 0.7)),
        );
        break;
      }
      case 'lead_looks_up': {
        Object.assign(lead, blendPose(lead.pose, 'open', progress(seconds, beat.seconds, 0.7)));
        break;
      }
      case 'lead_lifts_receiver': {
        Object.assign(lead, blendPose(lead.pose, 'receiver', progress(seconds, beat.seconds, 0.6)));
        break;
      }
      case 'hold_on_lead': {
        lead.idle = 0.45;
        lead.headTurn = lead.headTurn * (1 - progress(seconds, beat.seconds, 0.8));
        break;
      }
      case 'room_reacts': {
        const variant = beat.variant ?? 'stillness';
        room.variant = variant;
        if (variant === 'turn')
          Object.assign(room, blendPose(room.pose, 'turned', progress(seconds, beat.seconds, 0.7)));
        if (variant === 'look_away')
          Object.assign(room, blendPose(room.pose, 'away', progress(seconds, beat.seconds, 0.7)));
        if (variant === 'stillness') {
          room.idle = 1 - progress(seconds, beat.seconds, 0.6);
          room.dim = 1 - 0.1 * progress(seconds, beat.seconds, 1.4);
        }
        if (variant === 'lights_down') room.dim = 1 - 0.38 * progress(seconds, beat.seconds, 1.2);
        if (variant === 'murmur')
          room.bob =
            since < 1.8 ? Math.sin(since * 2 * Math.PI * 1.6) * 2.2 * (1 - since / 1.8) : 0;
        break;
      }
    }
    if (beat.camera === 'push')
      camera.scale = Math.max(camera.scale, 1 + 0.06 * progress(seconds, beat.seconds, 3.2));
    if (beat.camera === 'pull') camera.scale = 1.05 - 0.05 * progress(seconds, beat.seconds, 3.2);
    if (beat.camera === 'drift') camera.x = -14 * progress(seconds, beat.seconds, 6);
  }
  return { lead, room, camera };
}

/** Resolve a (possibly blended) pose into numbers. */
export function poseFor(
  config: RigConfig,
  pose: string,
  blend: { from: string; to: string; t: number } | null,
): RigConfig['poses'][string] | undefined {
  const rest = config.poses['rest'];
  if (!blend) return config.poses[pose] ?? rest;
  const a = config.poses[blend.from] ?? rest;
  const b = config.poses[blend.to] ?? rest;
  if (!a || !b) return rest;
  const mix = (x: number | undefined, y: number | undefined) =>
    (x ?? 0) + ((y ?? 0) - (x ?? 0)) * blend.t;
  return {
    arm_l: mix(a.arm_l, b.arm_l),
    arm_r: mix(a.arm_r, b.arm_r),
    hand_l: mix(a.hand_l, b.hand_l),
    hand_r: mix(a.hand_r, b.hand_r),
    head: mix(a.head, b.head),
    torsoLean: mix(a.torsoLean, b.torsoLean),
  };
}

export interface Placement {
  x: number;
  bottom: number;
  heightPx: number;
  facing: 1 | -1;
  /** Draw order; higher is nearer the camera. */
  z: number;
  labelY?: number;
}

/** Where a cast member stands on a 1080×1920 canvas, by position. */
export function placement(member: CastMember, width: number, height: number): Placement {
  const cx = width / 2;
  switch (member.position) {
    case 'center':
      return { x: cx, bottom: height * 0.86, heightPx: 1180, facing: 1, z: 5 };
    case 'left':
      return {
        x: width * 0.3,
        bottom: height * 0.86,
        heightPx: 1120,
        facing: 1,
        z: 4,
        labelY: height * 0.88,
      };
    case 'right':
      return {
        x: width * 0.72,
        bottom: height * 0.86,
        heightPx: 1120,
        facing: -1,
        z: 4,
        labelY: height * 0.88,
      };
    case 'background':
      return { x: cx, bottom: height * 0.7, heightPx: 700, facing: 1, z: 1 };
    case 'split-left':
      return { x: width * 0.26, bottom: height * 0.84, heightPx: 1080, facing: 1, z: 5 };
    case 'split-right':
      return {
        x: width * 0.75,
        bottom: height * 0.84,
        heightPx: 1000,
        facing: -1,
        z: 4,
        labelY: height * 0.86,
      };
    case 'back-seat':
      return { x: cx, bottom: height * 0.74, heightPx: 980, facing: 1, z: 3 };
    case 'front-left':
      return {
        x: width * 0.16,
        bottom: height * 1.02,
        heightPx: 1000,
        facing: 1,
        z: 8,
        labelY: height * 0.9,
      };
    case 'front-right':
      return {
        x: width * 0.84,
        bottom: height * 1.02,
        heightPx: 1000,
        facing: -1,
        z: 8,
        labelY: height * 0.9,
      };
  }
}
