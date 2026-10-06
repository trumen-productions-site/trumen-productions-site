import React from 'react';
import { activeWordIndex } from '../lib/captions.js';
import { serifStack } from '../lib/fonts.js';
import { captionAnchor, type SafeBox } from '../lib/layout.js';
import type { BrandConfig } from '../lib/schema.js';
import type { CaptionPlate, Typeface } from '../lib/types.js';

/**
 * One caption plate: cream plate, ink text, the active word in brass, inside
 * the safe box of every preset. Text is the approved script, verbatim.
 */
export const Captions: React.FC<{
  plate: CaptionPlate | null;
  seconds: number;
  brand: BrandConfig;
  typeface: Typeface;
  box: SafeBox;
  probe?: boolean;
}> = ({ plate, seconds, brand, typeface, box, probe }) => {
  if (!plate) return null;
  const c = brand.captions;
  const anchor = captionAnchor(box);
  const active = activeWordIndex(plate, seconds);
  const maxWidth = Math.round(anchor.maxWidth * c.maxPlateWidthFraction);
  return (
    <div
      style={{
        position: 'absolute',
        left: anchor.centerX - maxWidth / 2,
        width: maxWidth,
        top: 0,
        height: anchor.bottom,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        data-probe="caption"
        style={{
          display: 'inline-block',
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: `${c.platePaddingPx}px ${c.platePaddingPx * 1.5}px`,
          borderRadius: c.plateRadiusPx,
          background: probe ? '#FF00FF' : brand.palette.cream,
          color: probe ? '#FF00FF' : brand.palette.ink,
          boxShadow: probe ? 'none' : `8px 8px 0 ${brand.palette.ink}`,
          fontFamily: serifStack(typeface),
          fontSize: c.fontSizePx,
          lineHeight: 1.2,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: plate.placeholder ? '0.08em' : undefined,
          fontStyle: plate.placeholder ? 'italic' : undefined,
          opacity: plate.placeholder ? 0.85 : 1,
        }}
      >
        {plate.placeholder
          ? plate.placeholder
          : plate.words.map((w, i) => (
              <span
                key={i}
                style={{
                  color: probe ? '#FF00FF' : i === active ? brand.palette.brass : brand.palette.ink,
                }}
              >
                {w.text}
                {i < plate.words.length - 1 ? ' ' : ''}
              </span>
            ))}
      </div>
    </div>
  );
};
