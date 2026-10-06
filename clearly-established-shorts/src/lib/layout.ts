/** Safe zones and caption geometry. Browser-safe. */
import type { PlatformsConfig, SafeZone } from './schema.js';

/** The largest margin on each side across every preset: a layout inside this is inside all of them. */
export function safeZoneUnion(platforms: PlatformsConfig): SafeZone {
  const zones = Object.values(platforms.presets).map((p) => p.safeZone);
  const max = (k: keyof SafeZone) => Math.max(...zones.map((z) => z[k]));
  return { top: max('top'), bottom: max('bottom'), left: max('left'), right: max('right') };
}

export interface SafeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function safeBox(zone: SafeZone, width: number, height: number): SafeBox {
  const x = Math.round(zone.left * width);
  const y = Math.round(zone.top * height);
  return {
    x,
    y,
    width: Math.round(width - x - zone.right * width),
    height: Math.round(height - y - zone.bottom * height),
  };
}

/** Where the caption plate sits: centred in the safe box, its bottom edge `gap` above the safe box's bottom. */
export function captionAnchor(
  box: SafeBox,
  gap = 36,
): { centerX: number; bottom: number; maxWidth: number } {
  return { centerX: box.x + box.width / 2, bottom: box.y + box.height - gap, maxWidth: box.width };
}
