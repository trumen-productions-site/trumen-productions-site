import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { POPPINS, serifStack } from '../lib/fonts.js';
import type { BrandConfig, SeriesConfig } from '../lib/schema.js';
import type { Typeface } from '../lib/types.js';

export const WrittenBy: React.FC<{
  brand: BrandConfig;
  series: SeriesConfig;
  typeface: Typeface;
  progress: number;
}> = ({ brand, series, typeface, progress }) => {
  const [lead, ...rest] = series.writtenBy.split(/\s+by\s+/i);
  const names = rest.join(' by ');
  return (
    <AbsoluteFill
      style={{
        background: brand.palette.navy,
        color: brand.palette.cream,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: serifStack(typeface),
        opacity: Math.min(1, progress),
        textAlign: 'center',
        padding: '0 90px',
      }}
    >
      <div style={{ fontSize: 40, letterSpacing: '0.3em', opacity: 0.85 }}>
        {names ? `${lead} by`.toUpperCase() : ''}
      </div>
      <div style={{ marginTop: 34, fontSize: 64, lineHeight: 1.25, fontWeight: 700 }}>
        {(names || series.writtenBy).split(' & ').map((n, i) => (
          <div key={i}>{n}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/**
 * The company mark: the supplied lockup, as-is. If the file is missing, a
 * typeset placeholder in Poppins Bold Italic with the star never smaller than
 * the letters — and the manifest says so.
 */
export const CompanyMark: React.FC<{
  brand: BrandConfig;
  series: SeriesConfig;
  lockupAvailable: boolean;
  progress: number;
}> = ({ brand, series, lockupAvailable, progress }) => {
  const [pre, post] = series.company.split('★');
  return (
    <AbsoluteFill
      style={{
        background: brand.palette.navy,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: Math.min(1, progress),
      }}
    >
      {lockupAvailable ? (
        <Img
          src={staticFile('marks/trumen-lockup.png')}
          style={{ width: brand.companyMark.lockupWidthPx, display: 'block' }}
        />
      ) : (
        <div
          style={{
            color: brand.palette.cream,
            textAlign: 'center',
            fontFamily: `${POPPINS}, sans-serif`,
            fontWeight: 700,
            fontStyle: 'italic',
          }}
        >
          <div
            style={{
              fontSize: 120,
              lineHeight: 1,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>{pre}</span>
            <span style={{ color: brand.palette.gold, fontSize: 132, fontStyle: 'normal' }}>★</span>
            <span>{post?.split(' ')[0]}</span>
          </div>
          <div style={{ fontSize: 44, letterSpacing: '0.45em', marginTop: 10 }}>
            {post?.split(' ').slice(1).join(' ').toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 34,
              letterSpacing: '0.5em',
              marginTop: 40,
              color: brand.palette.brass,
              fontStyle: 'normal',
              fontFamily: 'Gelasio, Georgia, serif',
              fontWeight: 400,
            }}
          >
            {series.motto}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
