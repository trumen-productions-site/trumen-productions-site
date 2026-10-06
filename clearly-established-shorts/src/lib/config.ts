/** Load and validate the five config files. */
import { readFileSync } from 'node:fs';
import {
  brandSchema,
  canonSchema,
  gateSchema,
  parseOrThrow,
  platformsSchema,
  seriesSchema,
  type BrandConfig,
  type CanonConfig,
  type GateConfig,
  type PlatformsConfig,
  type SeriesConfig,
} from './schema.js';
import { configPath } from './paths.js';

/** Parse a config file, dropping "_comment" keys at every level so prose can live beside data. */
function readJson(file: string): unknown {
  return stripComments(JSON.parse(readFileSync(file, 'utf8')));
}

export function stripComments(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripComments);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '_comment') continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return value;
}

export function loadSeries(file = configPath('series.json')): SeriesConfig {
  return parseOrThrow(seriesSchema, readJson(file), 'config/series.json');
}
export function loadBrand(file = configPath('brand.json')): BrandConfig {
  return parseOrThrow(brandSchema, readJson(file), 'config/brand.json');
}
export function loadPlatforms(file = configPath('platforms.json')): PlatformsConfig {
  return parseOrThrow(platformsSchema, readJson(file), 'config/platforms.json');
}
export function loadCanon(file = configPath('canon.json')): CanonConfig {
  return parseOrThrow(canonSchema, readJson(file), 'config/canon.json');
}
export function loadGate(file = configPath('gate.json')): GateConfig {
  return parseOrThrow(gateSchema, readJson(file), 'config/gate.json');
}

export interface AllConfig {
  series: SeriesConfig;
  brand: BrandConfig;
  platforms: PlatformsConfig;
  canon: CanonConfig;
  gate: GateConfig;
}

export function loadAllConfig(): AllConfig {
  return {
    series: loadSeries(),
    brand: loadBrand(),
    platforms: loadPlatforms(),
    canon: loadCanon(),
    gate: loadGate(),
  };
}
