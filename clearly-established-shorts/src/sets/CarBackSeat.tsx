import React from 'react';
import { Dim, SetFrame, shade, type SetProps } from './shared.js';

/** 002 — inside the car at the drive-thru, seen from the dashboard looking back. */
export const CarBackSeat: React.FC<SetProps> = ({ dim, width, height, brand, seconds }) => {
  const { navy, cream, brass, ink } = brand.palette;
  const flicker = 0.85 + 0.15 * Math.sin(seconds * 3.1);
  return (
    <SetFrame width={width} height={height}>
      <rect width={width} height={height} fill={shade(navy, 0.55)} />
      {/* night outside the rear window, with the menu board glow */}
      <rect x={120} y={360} width={width - 240} height={520} fill={shade(navy, 0.35)} />
      <rect
        x={width * 0.58}
        y={430}
        width={260}
        height={300}
        fill={brass}
        opacity={0.22 * flicker}
      />
      <rect
        x={width * 0.6}
        y={450}
        width={220}
        height={240}
        fill={shade(cream, 0.95)}
        opacity={0.08 * flicker}
      />
      {/* rear window frame and headliner */}
      <path d={`M0 0 H${width} V380 L${width - 120} 360 H120 L0 380 Z`} fill={shade(navy, 0.75)} />
      <path d={`M120 360 H${width - 120} V880 H120 Z`} fill="none" stroke={ink} strokeWidth={26} />
      {/* rear bench */}
      <rect x={100} y={880} width={width - 200} height={420} fill={shade(navy, 0.9)} />
      <rect x={100} y={880} width={width - 200} height={30} fill={ink} opacity={0.7} />
      {/* side pillars */}
      <rect x={0} y={360} width={120} height={height} fill={shade(navy, 0.6)} />
      <rect x={width - 120} y={360} width={120} height={height} fill={shade(navy, 0.6)} />
      {/* front seat backs: the two silhouettes sit in front of these */}
      <rect x={-40} y={1180} width={520} height={800} rx={60} fill={shade(navy, 1.1)} />
      <rect x={width - 480} y={1180} width={520} height={800} rx={60} fill={shade(navy, 1.1)} />
      {/* dashboard glow line */}
      <rect x={0} y={height - 120} width={width} height={120} fill={ink} />
      <rect x={60} y={height - 112} width={width - 120} height={6} fill={brass} opacity={0.5} />
      <Dim dim={dim} width={width} height={height} />
    </SetFrame>
  );
};
