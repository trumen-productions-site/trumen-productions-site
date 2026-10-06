import React from 'react';
import { Dim, Paper, SetFrame, shade, type SetProps } from './shared.js';

/** 001 — the showroom floor. Tall windows, a long low sedan, the board. */
export const CadillacShowroom: React.FC<SetProps> = ({ dim, width, height, brand, seconds }) => {
  const { navy, cream, brass, ink } = brand.palette;
  const floorY = height * 0.62;
  const glint = 0.5 + 0.5 * Math.sin(seconds * 0.6);
  return (
    <SetFrame width={width} height={height}>
      <rect width={width} height={height} fill={navy} />
      {/* window wall */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={60 + i * 330}
            y={120}
            width={280}
            height={floorY - 220}
            fill={shade(cream, 0.92)}
          />
          <rect x={60 + i * 330 + 134} y={120} width={12} height={floorY - 220} fill={brass} />
          <rect
            x={60 + i * 330}
            y={120 + (floorY - 220) * 0.45}
            width={280}
            height={12}
            fill={brass}
          />
        </g>
      ))}
      {/* floor */}
      <rect x={0} y={floorY} width={width} height={height - floorY} fill={shade(cream, 0.86)} />
      <rect x={0} y={floorY} width={width} height={28} fill={shade(navy, 0.8)} />
      {/* the sedan, long and low, cut from navy paper */}
      <g transform={`translate(-120 ${floorY - 190})`}>
        <path
          d="M40 230 L120 230 L170 140 L480 120 L700 130 L800 190 L860 230 L920 236 L920 262 L40 262 Z"
          fill={ink}
          opacity="0.85"
          transform="translate(18 16)"
        />
        <path
          d="M40 230 L120 230 L170 140 L480 120 L700 130 L800 190 L860 230 L920 236 L920 262 L40 262 Z"
          fill={shade(navy, 1.35)}
        />
        <path d="M200 150 L470 136 L470 212 L160 212 Z" fill={shade(cream, 0.9)} />
        <path d="M500 136 L690 142 L770 210 L500 212 Z" fill={shade(cream, 0.9)} />
        <circle cx={240} cy={262} r={46} fill={ink} />
        <circle cx={240} cy={262} r={18} fill={brass} />
        <circle cx={760} cy={262} r={46} fill={ink} />
        <circle cx={760} cy={262} r={18} fill={brass} />
        <rect x={860} y={212} width={44} height={14} fill={brass} opacity={0.6 + 0.4 * glint} />
      </g>
      {/* the board: bars only, the top one longest */}
      <Paper x={width - 330} y={floorY - 560} w={260} h={330} fill={shade(navy, 0.7)} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={width - 300}
          y={floorY - 520 + i * 58}
          width={[200, 118, 96, 80, 62][i]!}
          height={22}
          fill={i === 0 ? brass : shade(cream, 0.85)}
        />
      ))}
      <Dim dim={dim} width={width} height={height} />
    </SetFrame>
  );
};
