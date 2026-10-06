import React from 'react';
import { Dim, Paper, SetFrame, shade, type SetProps } from './shared.js';

/** 004 — a cell, a wall calendar. Bars throw their shadow across the wall. No numbers on the grid: the count is on the card. */
export const CellCalendar: React.FC<SetProps> = ({ dim, width, height, brand, seconds }) => {
  const { navy, cream, brass, ink } = brand.palette;
  const marks = Math.min(21, Math.floor(seconds * 1.4));
  const cols = 7;
  const cellW = 54;
  const cellH = 50;
  const gx = width - 60 - cols * cellW;
  const gy = 300;
  return (
    <SetFrame width={width} height={height}>
      <rect width={width} height={height} fill={shade(navy, 0.75)} />
      {/* cinder block courses */}
      {[...Array(14)].map((_, r) => (
        <rect key={r} x={0} y={120 + r * 96} width={width} height={2} fill={ink} opacity={0.35} />
      ))}
      {/* bar shadows, from a window off-frame */}
      {[...Array(6)].map((_, i) => (
        <path
          key={i}
          d={`M${-200 + i * 230} 0 L${-120 + i * 230} 0 L${300 + i * 230} ${height} L${220 + i * 230} ${height} Z`}
          fill={ink}
          opacity={0.28}
        />
      ))}
      {/* the calendar */}
      <Paper
        x={gx - 24}
        y={gy - 110}
        w={cols * cellW + 48}
        h={5 * cellH + 150}
        fill={shade(cream, 0.94)}
        dx={12}
        dy={12}
      />
      <rect
        x={gx - 24}
        y={gy - 110}
        width={cols * cellW + 48}
        height={64}
        fill={shade(navy, 0.9)}
      />
      {[...Array(5)].map((_, r) =>
        [...Array(cols)].map((_, c) => {
          const i = r * cols + c;
          const x = gx + c * cellW;
          const y = gy + r * cellH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                fill="none"
                stroke={ink}
                strokeWidth={2}
              />
              {i < marks ? (
                <path
                  d={`M${x + 12} ${y + 12} L${x + cellW - 12} ${y + cellH - 12} M${x + cellW - 12} ${y + 12} L${x + 12} ${y + cellH - 12}`}
                  stroke={brass}
                  strokeWidth={5}
                />
              ) : null}
            </g>
          );
        }),
      )}
      {/* cot */}
      <Paper x={40} y={height * 0.7} w={560} h={70} fill={shade(navy, 1.2)} />
      <rect x={60} y={height * 0.7 + 70} width={24} height={190} fill={ink} />
      <rect x={540} y={height * 0.7 + 70} width={24} height={190} fill={ink} />
      {/* floor */}
      <rect x={0} y={height * 0.86} width={width} height={height * 0.14} fill={shade(navy, 0.5)} />
      <Dim dim={dim} width={width} height={height} />
    </SetFrame>
  );
};
