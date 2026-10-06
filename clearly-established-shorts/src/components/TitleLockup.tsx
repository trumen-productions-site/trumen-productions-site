import React from 'react';
import { AbsoluteFill } from 'remotion';
import { serifStack } from '../lib/fonts.js';
import type { BrandConfig, SeriesConfig } from '../lib/schema.js';
import type { Typeface } from '../lib/types.js';
import { Scales } from './Scales.js';

/**
 * The title lockup: green § above the title, scales beneath, per the locked identity.
 * `progress` 0..1 fades the pieces in over the first third of a second.
 */
export const TitleLockup: React.FC<{
  brand: BrandConfig;
  series: SeriesConfig;
  typeface: Typeface;
  episodeTitle: string;
  episodeId: string;
  progress: number;
}> = ({ brand, series, typeface, episodeTitle, episodeId, progress }) => {
  const [a, b] = series.workingTitle.split(':').map((s) => s.trim());
  const ease = Math.min(1, progress);
  return (
    <AbsoluteFill
      style={{
        background: brand.palette.navy,
        color: brand.palette.cream,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: serifStack(typeface),
        opacity: ease,
      }}
    >
      <div
        style={{
          color: brand.palette.sectionGreen,
          fontSize: 150,
          lineHeight: 1,
          fontWeight: 400,
          transform: `translateY(${(1 - ease) * -20}px)`,
        }}
      >
        {brand.titleLockup.sectionMark}
      </div>
      <div
        style={{
          marginTop: 30,
          fontSize: 92,
          letterSpacing: '0.12em',
          lineHeight: 1.05,
          textAlign: 'center',
          fontWeight: 700,
        }}
      >
        {a}
      </div>
      {b ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 46,
            letterSpacing: '0.32em',
            lineHeight: 1.1,
            textAlign: 'center',
            fontWeight: 400,
            color: brand.palette.brass,
          }}
        >
          {b}
        </div>
      ) : null}
      <div style={{ marginTop: 56 }}>
        <Scales width={200} color={brand.palette.brass} />
      </div>
      <div
        style={{
          marginTop: 60,
          fontSize: 36,
          letterSpacing: '0.08em',
          fontStyle: 'italic',
          opacity: 0.9,
        }}
      >
        No. {episodeId} · {episodeTitle}
      </div>
    </AbsoluteFill>
  );
};
