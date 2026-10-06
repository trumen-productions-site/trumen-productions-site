import React from 'react';
import { AbsoluteFill } from 'remotion';
import { serifStack } from '../lib/fonts.js';
import type { BrandConfig } from '../lib/schema.js';
import type { Typeface } from '../lib/types.js';

/** Two seconds of slate before an ungated render. */
export const GateSlate: React.FC<{
  brand: BrandConfig;
  typeface: Typeface;
  episodeLabel: string;
  reasons: string[];
}> = ({ brand, typeface, episodeLabel, reasons }) => (
  <AbsoluteFill
    style={{
      background: brand.palette.navy,
      color: brand.palette.cream,
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: serifStack(typeface),
      textAlign: 'center',
      padding: '0 80px',
    }}
  >
    <div
      style={{ border: `6px solid ${brand.palette.cream}`, padding: '48px 40px', maxWidth: 900 }}
    >
      <div style={{ fontSize: 66, lineHeight: 1.2, fontWeight: 700, letterSpacing: '0.04em' }}>
        {brand.gateMarking.slateText}
      </div>
      <div style={{ marginTop: 36, fontSize: 36, opacity: 0.85 }}>{episodeLabel}</div>
      <div
        style={{ marginTop: 28, fontSize: 28, lineHeight: 1.5, opacity: 0.7, fontStyle: 'italic' }}
      >
        {reasons.map((r, i) => (
          <div key={i}>{r}</div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

/** The persistent corner watermark on every ungated frame. */
export const Watermark: React.FC<{
  brand: BrandConfig;
  typeface: Typeface;
  top: number;
  left: number;
}> = ({ brand, typeface, top, left }) => (
  <div
    style={{
      position: 'absolute',
      top,
      left,
      padding: '10px 18px',
      background: 'rgba(10,10,10,0.55)',
      color: brand.palette.cream,
      fontFamily: serifStack(typeface),
      fontSize: 26,
      letterSpacing: '0.12em',
      fontWeight: 700,
      border: `2px solid ${brand.palette.cream}`,
    }}
  >
    {brand.gateMarking.watermarkText}
  </div>
);
