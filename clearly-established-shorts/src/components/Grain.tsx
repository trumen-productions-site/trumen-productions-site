import React from 'react';

/** Paper grain over the whole frame. feTurbulence with a fixed seed is deterministic frame to frame. */
export const Grain: React.FC<{ opacity: number; seed: number; width: number; height: number }> = ({
  opacity,
  seed,
  width,
  height,
}) => (
  <svg
    width={width}
    height={height}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply' }}
    aria-hidden
  >
    <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.9"
        numOctaves="2"
        seed={seed}
        stitchTiles="stitch"
      />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="linear" slope={opacity} />
      </feComponentTransfer>
    </filter>
    <rect width={width} height={height} filter="url(#paper-grain)" />
  </svg>
);
