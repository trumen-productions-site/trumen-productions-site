import React from 'react';
import { serifStack } from '../lib/fonts.js';
import type { SafeBox } from '../lib/layout.js';
import type { BrandConfig } from '../lib/schema.js';
import type { Typeface } from '../lib/types.js';

/** A fact card: cream paper, ink text, centred in the safe box. Text is one of the canon's approved forms. */
export const FactCard: React.FC<{
  brand: BrandConfig;
  typeface: Typeface;
  text: string;
  box: SafeBox;
  progress: number;
  probe?: boolean;
}> = ({ brand, typeface, text, box, progress, probe }) => {
  const ease = Math.min(1, progress);
  const width = Math.round(box.width * 0.92);
  return (
    <div
      data-probe="card"
      style={{
        position: 'absolute',
        left: box.x + (box.width - width) / 2,
        top: box.y + box.height * 0.36,
        width,
        boxSizing: 'border-box',
        padding: '54px 56px',
        background: probe ? '#FF00FF' : brand.palette.cream,
        color: probe ? '#FF00FF' : brand.palette.ink,
        boxShadow: probe
          ? 'none'
          : `${brand.look.shadowOffsetPx}px ${brand.look.shadowOffsetPx}px 0 ${brand.palette.ink}`,
        fontFamily: serifStack(typeface),
        fontSize: 60,
        lineHeight: 1.3,
        textAlign: 'center',
        opacity: ease,
        transform: `translateY(${(1 - ease) * 14}px)`,
      }}
    >
      {text}
    </div>
  );
};
