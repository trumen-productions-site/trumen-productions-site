import React from 'react';
import { Dim, SetFrame, shade, type SetProps } from './shared.js';

/** 006 — the curb on release day. A stretch limousine, cut long. */
export const ReleaseCurb: React.FC<SetProps> = ({ dim, width, height, brand }) => {
  const { navy, cream, brass, ink } = brand.palette;
  const horizon = height * 0.55;
  return (
    <SetFrame width={width} height={height}>
      {/* sky: cream paper, a brass sun */}
      <rect width={width} height={height} fill={shade(cream, 0.96)} />
      <circle cx={width * 0.22} cy={height * 0.2} r={120} fill={brass} />
      {/* a low building line */}
      <rect x={0} y={horizon - 240} width={width} height={240} fill={shade(navy, 0.85)} />
      {[...Array(6)].map((_, i) => (
        <rect
          key={i}
          x={60 + i * 175}
          y={horizon - 200}
          width={70}
          height={100}
          fill={shade(cream, 0.8)}
        />
      ))}
      {/* the limousine */}
      <g transform={`translate(-260 ${horizon - 170})`}>
        <path
          d="M20 250 L60 250 L120 160 L520 140 L1180 150 L1300 200 L1380 250 L1560 258 L1560 290 L20 290 Z"
          fill={ink}
          opacity="0.85"
          transform="translate(16 16)"
        />
        <path
          d="M20 250 L60 250 L120 160 L520 140 L1180 150 L1300 200 L1380 250 L1560 258 L1560 290 L20 290 Z"
          fill={navy}
        />
        {[150, 400, 650, 900].map((x) => (
          <rect key={x} x={x} y={158} width={210} height={70} fill={shade(cream, 0.95)} />
        ))}
        <path d="M1180 150 L1300 200 L1300 228 L1170 228 Z" fill={shade(cream, 0.95)} />
        {[220, 1300].map((x) => (
          <g key={x}>
            <circle cx={x} cy={290} r={50} fill={ink} />
            <circle cx={x} cy={290} r={20} fill={brass} />
          </g>
        ))}
        <rect x={1510} y={236} width={40} height={16} fill={brass} />
      </g>
      {/* curb and asphalt */}
      <rect x={0} y={horizon + 120} width={width} height={60} fill={shade(cream, 0.8)} />
      <rect
        x={0}
        y={horizon + 180}
        width={width}
        height={height - horizon - 180}
        fill={shade(navy, 0.4)}
      />
      <Dim dim={dim} width={width} height={height} />
    </SetFrame>
  );
};
