/**
 * zod schemas for every spec and config file.
 *
 * Validation messages are written to be read by a person editing a JSON file
 * at nine at night, so each names the field and what it expected.
 */
import { z } from 'zod';

// ── Anchors ─────────────────────────────────────────────────────────────

/**
 * A time anchor. Four forms:
 *   "12.5"        absolute seconds from the start of the take
 *   "line:3"      the moment line 3 of the approved script begins
 *   "line:3.end"  the moment line 3 ends
 *   "end-3.0"     3.0 seconds before the take ends ("end" alone is the take's end)
 */
export const ANCHOR_PATTERN = /^(?:\d+(?:\.\d+)?|line:\d+(?:\.end)?|end(?:[-+]\d+(?:\.\d+)?)?)$/;

export const anchorSchema = z
  .string()
  .regex(
    ANCHOR_PATTERN,
    'an anchor is seconds ("12.5"), a script line ("line:3" or "line:3.end"), or relative to the end ("end-3.0")',
  );

export type Anchor = z.infer<typeof anchorSchema>;

// ── Vocabulary ──────────────────────────────────────────────────────────

export const ACTIONS = [
  'lead_enters',
  'lead_steps_forward',
  'lead_turns_to_room',
  'lead_looks_down',
  'lead_looks_up',
  'lead_lifts_receiver',
  'room_reacts',
  'hold_on_lead',
] as const;

export const REACTION_VARIANTS = [
  'stillness',
  'turn',
  'look_away',
  'lights_down',
  'murmur',
] as const;

export const EXPRESSIONS = ['level', 'resolve', 'quiet', 'weary', 'warm', 'hard'] as const;

export const CAMERAS = ['hold', 'push', 'pull', 'drift'] as const;

export const SETS = [
  'cadillac-showroom',
  'car-back-seat',
  'courtroom-gallery',
  'cell-calendar',
  'telephone-split',
  'release-curb',
] as const;

export const ROLES = ['lead', 'room', 'support'] as const;
export const POSITIONS = [
  'center',
  'left',
  'right',
  'background',
  'split-left',
  'split-right',
  'back-seat',
  'front-left',
  'front-right',
] as const;

export const CARD_TYPES = ['fact', 'title'] as const;

// ── Episode spec ────────────────────────────────────────────────────────

export const castMemberSchema = z.object({
  rig: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'rig names are lower-case with hyphens, e.g. "michael-present"'),
  role: z.enum(ROLES),
  position: z.enum(POSITIONS),
  label: z
    .string()
    .optional()
    .describe('role label shown beneath a silhouette, e.g. "the detective"'),
});

export const beatSchema = z.object({
  id: z.string().min(1, 'every beat needs an id'),
  at: anchorSchema,
  action: z.enum(ACTIONS),
  expression: z.enum(EXPRESSIONS).optional(),
  camera: z.enum(CAMERAS).optional(),
  variant: z.enum(REACTION_VARIANTS).optional(),
  target: z.string().optional().describe('cast rig the action applies to; defaults to the lead'),
});

export const cardSchema = z
  .object({
    at: anchorSchema,
    type: z.enum(CARD_TYPES),
    text: z.string().optional(),
    canonKey: z.string().optional(),
  })
  .superRefine((card, ctx) => {
    if (card.type === 'fact') {
      if (!card.text)
        ctx.addIssue({ code: 'custom', message: 'a fact card needs "text"', path: ['text'] });
      if (!card.canonKey)
        ctx.addIssue({
          code: 'custom',
          message: 'a fact card needs a "canonKey" that names an entry in config/canon.json',
          path: ['canonKey'],
        });
    }
  });

export const episodeSchema = z
  .object({
    id: z.string().regex(/^\d{3}$/, 'id is three digits, e.g. "001"'),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug is lower-case words joined by hyphens'),
    title: z.string().min(1, 'title is required'),
    targetSeconds: z.number().int().min(10).max(180),
    set: z.enum(SETS),
    cast: z.array(castMemberSchema).min(1, 'cast needs at least the lead'),
    audio: z.object({
      take: z.string().min(1),
      scratch: z.string().min(1),
    }),
    script: z.string().min(1),
    scratchLines: z
      .array(z.number().positive().max(30))
      .min(
        1,
        'scratchLines lists the length in seconds of each placeholder line for the scratch track',
      )
      .describe(
        'one entry per line in the beat list; drives the scratch track until the take exists',
      ),
    beats: z.array(beatSchema).min(1, 'at least a "hook" beat is required'),
    cards: z.array(cardSchema).min(1, 'the end card needs at least a title card'),
    notes: z.string().optional(),
    openItems: z.array(z.string()).optional(),
  })
  .superRefine((ep, ctx) => {
    const leads = ep.cast.filter((c) => c.role === 'lead');
    if (leads.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `exactly one cast member has role "lead" (found ${leads.length})`,
        path: ['cast'],
      });
    }
    if (!ep.beats.some((b) => b.id === 'hook')) {
      ctx.addIssue({
        code: 'custom',
        message: 'a beat with id "hook" is required and must land inside the first 2.0 seconds',
        path: ['beats'],
      });
    }
    if (!ep.cards.some((c) => c.type === 'title')) {
      ctx.addIssue({
        code: 'custom',
        message: 'a card of type "title" is required: it starts the end card',
        path: ['cards'],
      });
    }
    const ids = new Set<string>();
    for (const [i, b] of ep.beats.entries()) {
      if (ids.has(b.id))
        ctx.addIssue({
          code: 'custom',
          message: `duplicate beat id "${b.id}"`,
          path: ['beats', i, 'id'],
        });
      ids.add(b.id);
    }
    const rigNames = new Set(ep.cast.map((c) => c.rig));
    for (const [i, b] of ep.beats.entries()) {
      if (b.target && !rigNames.has(b.target)) {
        ctx.addIssue({
          code: 'custom',
          message: `beat "${b.id}" targets rig "${b.target}" which is not in the cast`,
          path: ['beats', i, 'target'],
        });
      }
    }
  });

export type EpisodeSpec = z.infer<typeof episodeSchema>;
export type Beat = z.infer<typeof beatSchema>;
export type Card = z.infer<typeof cardSchema>;
export type CastMember = z.infer<typeof castMemberSchema>;

// ── Gate ────────────────────────────────────────────────────────────────

export const gateSchema = z.object({
  counselCleared: z.boolean(),
  clearedBy: z.string(),
  clearedOn: z.string(),
  clearanceReference: z.string(),
  episodesCleared: z.array(z.string().regex(/^\d{3}$/)),
});
export type GateConfig = z.infer<typeof gateSchema>;

// ── Series ──────────────────────────────────────────────────────────────

export const seriesSchema = z.object({
  workingTitle: z.string().min(1),
  sourceWork: z.string().min(1),
  writtenBy: z.string().min(1),
  company: z.string().min(1),
  motto: z.string().min(1),
  owner: z.string(),
  counsel: z.string(),
  endCard: z.object({
    titleHoldSeconds: z.number().positive(),
    writtenBySeconds: z.number().positive(),
    companySeconds: z.number().positive(),
  }),
  hookDeadlineSeconds: z.number().positive(),
  lineGapSeconds: z.number().positive(),
});
export type SeriesConfig = z.infer<typeof seriesSchema>;

// ── Brand ───────────────────────────────────────────────────────────────

const hex = z
  .string()
  .regex(/^#[0-9A-F]{6}$/, 'colours are upper-case six-digit hex, e.g. "#0B1F3A"');

export const brandSchema = z.object({
  paletteSource: z.string(),
  palette: z.object({ navy: hex, cream: hex, brass: hex, sectionGreen: hex, gold: hex, ink: hex }),
  type: z.object({
    titlesPreferred: z.string(),
    titlesFallback: z.string(),
    wordmark: z.string(),
    wordmarkWeight: z.number(),
    wordmarkStyle: z.string(),
  }),
  captions: z.object({
    wordsPerPlateMin: z.number().int().min(1),
    wordsPerPlateMax: z.number().int().min(1).max(3),
    plateColor: z.string(),
    textColor: z.string(),
    activeWordColor: z.string(),
    fontSizePx: z.number().positive(),
    platePaddingPx: z.number().nonnegative(),
    plateRadiusPx: z.number().nonnegative(),
    maxPlateWidthFraction: z.number().positive().max(1),
  }),
  titleLockup: z.object({
    sectionMark: z.string(),
    sectionMarkColor: z.string(),
    scalesBeneath: z.boolean(),
    titleColor: z.string(),
    ground: z.string(),
  }),
  companyMark: z.object({
    lockupFile: z.string(),
    lockupWidthPx: z.number().positive(),
    placeholderFont: z.string(),
  }),
  look: z.object({
    style: z.string(),
    grainOpacity: z.number().min(0).max(1),
    grainSeed: z.number().int(),
    shadowOffsetPx: z.number(),
  }),
  gateMarking: z.object({
    slateText: z.string().min(1),
    slateSeconds: z.number().positive(),
    watermarkText: z.string().min(1),
    filenamePrefix: z.string().min(1),
  }),
});
export type BrandConfig = z.infer<typeof brandSchema>;

// ── Platforms ───────────────────────────────────────────────────────────

const safeZoneSchema = z.object({
  top: z.number().min(0).max(0.5),
  bottom: z.number().min(0).max(0.5),
  left: z.number().min(0).max(0.5),
  right: z.number().min(0).max(0.5),
});

export const presetSchema = z.object({
  label: z.string(),
  maxSeconds: z.number().positive(),
  safeZone: safeZoneSchema,
});

export const platformsSchema = z.object({
  canvas: z.object({ width: z.literal(1080), height: z.literal(1920), fps: z.literal(30) }),
  video: z.object({
    codec: z.literal('h264'),
    profile: z.literal('high'),
    pixelFormat: z.literal('yuv420p'),
    bitrateKbps: z.number().positive(),
    maxrateKbps: z.number().positive(),
    bufsizeKbps: z.number().positive(),
    gopSeconds: z.number().positive(),
  }),
  audio: z.object({
    codec: z.literal('aac'),
    sampleRate: z.literal(48000),
    channels: z.literal(2),
    bitrateKbps: z.number().positive(),
    targetLufs: z.number(),
    truePeakDbtp: z.number(),
    loudnessToleranceLu: z.number().positive(),
  }),
  presets: z.record(z.string().regex(/^[a-z0-9-]+$/), presetSchema),
});
export type PlatformsConfig = z.infer<typeof platformsSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type SafeZone = z.infer<typeof safeZoneSchema>;

// ── Canon ───────────────────────────────────────────────────────────────

export const canonSchema = z.object({
  dates: z.object({
    reversal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    refiled: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    remittitur: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  facts: z.record(
    z.string().regex(/^[a-zA-Z]+$/),
    z.object({
      statement: z.string().min(1),
      forms: z.array(z.string()),
      realNames: z.array(z.string()).optional(),
      derivedDays: z.enum(['erasureDays', 'overDetentionDays']).optional(),
      note: z.string().optional(),
      outOfScope: z.boolean().optional(),
    }),
  ),
  derived: z.object({ erasureDays: z.number().int(), overDetentionDays: z.number().int() }),
  numberWords: z.record(
    z.string(),
    z.object({ meaning: z.string(), neverNear: z.array(z.string()).optional() }),
  ),
  bannedTerms: z.array(z.string().min(1)),
  proximityRules: z.array(
    z.object({
      term: z.string(),
      near: z.string(),
      withinWords: z.number().int().positive(),
      reason: z.string(),
    }),
  ),
  motiveTerms: z.object({ terms: z.array(z.string()) }),
  names: z.object({
    permitted: z.array(z.string()),
    realNamesCleared: z.array(z.string()),
    knownRealNames: z.array(z.string()),
    roleLabels: z.array(z.string()),
    titleWords: z.array(z.string()),
  }),
  factualSignals: z.object({ terms: z.array(z.string()) }),
});
export type CanonConfig = z.infer<typeof canonSchema>;

// ── Rig ─────────────────────────────────────────────────────────────────

export const RIG_GROUPS = [
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
export const VISEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'] as const;
export type Viseme = (typeof VISEMES)[number];

const pivot = z.object({ x: z.number(), y: z.number() });

export const rigSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  provenance: z.enum(['machine-drafted', 'human-illustrated', 'silhouette']),
  description: z.string(),
  svg: z.string().min(1).describe('file name of the rig SVG in the same folder'),
  viewBox: z.object({ width: z.number().positive(), height: z.number().positive() }),
  pivots: z.object({
    head: pivot,
    arm_l: pivot,
    arm_r: pivot,
    hand_l: pivot,
    hand_r: pivot,
    brow_l: pivot,
    brow_r: pivot,
  }),
  poses: z.record(
    z.string(),
    z.object({
      arm_l: z.number(),
      arm_r: z.number(),
      hand_l: z.number(),
      hand_r: z.number(),
      head: z.number().optional(),
      torsoLean: z.number().optional(),
    }),
  ),
  expressions: z.record(
    z.string(),
    z.object({
      brow_l: z.number(),
      brow_r: z.number(),
      browTilt: z.number().optional(),
      eyeOpen: z.number().min(0).max(1),
      headTilt: z.number().optional(),
    }),
  ),
  blink: z.object({ everySeconds: z.number().positive(), durationSeconds: z.number().positive() }),
  likeness: z
    .string()
    .describe('what the drawing is based on; "placeholder" until reference photos are supplied'),
});
export type RigConfig = z.infer<typeof rigSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Format zod issues as one readable line each: "cast[0].rig: …". */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path
      .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
      .join('')
      .replace(/^\./, '');
    return `${where || '(root)'}: ${issue.message}`;
  });
}

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, what: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`${what} is invalid:\n  - ${formatIssues(result.error).join('\n  - ')}`);
  }
  return result.data;
}
