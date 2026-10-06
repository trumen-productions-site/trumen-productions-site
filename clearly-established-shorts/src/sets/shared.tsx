import React from 'react';
import type { BrandConfig } from '../lib/schema.js';

export interface SetProps {
  seconds: number;
  /** 1 = full light; the room's reaction can dim it. */
  dim: number;
  variant: string | null;
  width: number;
  height: number;
  brand: BrandConfig;
}

/** A paper plane with a hard offset shadow. */
export const Paper: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  shadow?: string;
  dx?: number;
  dy?: number;
  rx?: number;
}> = ({ x, y, w, h, fill, shadow = '#0A0A0A', dx = 14, dy = 14, rx = 0 }) => (
  <g>
    <rect x={x + dx} y={y + dy} width={w} height={h} fill={shadow} opacity={0.9} rx={rx} />
    <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx} />
  </g>
);

/** Dim overlay for reactions. */
export const Dim: React.FC<{ dim: number; width: number; height: number }> = ({
  dim,
  width,
  height,
}) =>
  dim < 0.999 ? <rect width={width} height={height} fill="#0A0A0A" opacity={1 - dim} /> : null;

export const SetFrame: React.FC<{ width: number; height: number; children: React.ReactNode }> = ({
  width,
  height,
  children,
}) => (
  <svg
    width={width}
    height={height}
    viewBox={`0 0 ${width} ${height}`}
    style={{ position: 'absolute', inset: 0, display: 'block' }}
    aria-hidden
  >
    {children}
  </svg>
);

/** Darken a hex colour by a factor 0..1 (1 = unchanged). */
export function shade(hex: string, f: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`;
}
