import React from 'react';
import { Dim, Paper, SetFrame, shade, type SetProps } from './shared.js';

/** 005 — a telephone, split frame: the visiting-room wall phone on the left, an office on the right. */
export const TelephoneSplit: React.FC<SetProps> = ({ dim, width, height, brand }) => {
  const { navy, cream, brass, ink } = brand.palette;
  const split = width * 0.5;
  return (
    <SetFrame width={width} height={height}>
      {/* left: cinder block, a wall phone */}
      <rect x={0} y={0} width={split} height={height} fill={shade(navy, 0.8)} />
      {[...Array(16)].map((_, r) => (
        <rect key={r} x={0} y={r * 120} width={split} height={2} fill={ink} opacity={0.3} />
      ))}
      <Paper
        x={split * 0.16}
        y={height * 0.3}
        w={110}
        h={210}
        fill={shade(navy, 1.3)}
        dx={10}
        dy={10}
      />
      <rect x={split * 0.16 + 36} y={height * 0.3 + 20} width={40} height={60} fill={brass} />
      <path
        d={`M${split * 0.16 + 56} ${height * 0.3 + 210} q 20 90 120 150`}
        stroke={brass}
        strokeWidth={6}
        fill="none"
      />
      {/* right: an office, a desk, a lamp pool */}
      <rect x={split} y={0} width={width - split} height={height} fill={shade(cream, 0.72)} />
      <rect x={split} y={0} width={width - split} height={height * 0.42} fill={shade(navy, 0.9)} />
      <circle cx={width * 0.78} cy={height * 0.5} r={300} fill={cream} opacity={0.5} />
      <Paper
        x={split + 40}
        y={height * 0.72}
        w={width - split - 80}
        h={60}
        fill={shade(navy, 1.1)}
      />
      <rect x={width * 0.9 - 60} y={height * 0.72 - 260} width={14} height={260} fill={ink} />
      <path
        d={`M${width * 0.9 - 130} ${height * 0.72 - 260} L${width * 0.9 + 30} ${height * 0.72 - 260} L${width * 0.9} ${height * 0.72 - 330} L${width * 0.9 - 100} ${height * 0.72 - 330} Z`}
        fill={brass}
      />
      <rect x={split + 80} y={height * 0.72 - 30} width={120} height={30} rx={8} fill={ink} />
      {/* the divider */}
      <rect x={split - 8} y={0} width={16} height={height} fill={ink} />
      {/* floor */}
      <rect x={0} y={height * 0.86} width={width} height={height * 0.14} fill={ink} opacity={0.6} />
      <Dim dim={dim} width={width} height={height} />
    </SetFrame>
  );
};
