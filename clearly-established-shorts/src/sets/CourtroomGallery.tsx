import React from 'react';
import { Dim, Paper, SetFrame, shade, type SetProps } from './shared.js';

/** 003 — the courtroom, from the well, facing the gallery. The lead has turned to tell the room. */
export const CourtroomGallery: React.FC<SetProps> = ({ dim, width, height, brand }) => {
  const { navy, cream, brass, ink } = brand.palette;
  const wainscotY = height * 0.46;
  return (
    <SetFrame width={width} height={height}>
      {/* panelled wall */}
      <rect width={width} height={height} fill={shade(cream, 0.88)} />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={40 + i * 260}
          y={120}
          width={200}
          height={wainscotY - 200}
          fill={shade(cream, 0.8)}
          stroke={shade(navy, 0.9)}
          strokeWidth={6}
        />
      ))}
      {/* the seal: a plain brass disc, no emblem */}
      <circle cx={width / 2} cy={260} r={92} fill={brass} />
      <circle cx={width / 2} cy={260} r={70} fill={shade(cream, 0.88)} />
      <circle cx={width / 2} cy={260} r={50} fill={brass} />
      {/* wainscot and rail */}
      <rect
        x={0}
        y={wainscotY}
        width={width}
        height={height - wainscotY}
        fill={shade(navy, 0.95)}
      />
      <rect x={0} y={wainscotY} width={width} height={22} fill={brass} />
      {/* benches, receding */}
      {[0, 1, 2].map((i) => (
        <Paper
          key={i}
          x={30 + i * 40}
          y={height * 0.56 + i * 80}
          w={width - 60 - i * 80}
          h={46}
          fill={shade(navy, 1.25 - i * 0.12)}
          dx={10}
          dy={10}
        />
      ))}
      {/* the bar */}
      <rect x={0} y={height * 0.835} width={width} height={34} fill={shade(navy, 1.2)} />
      <rect x={0} y={height * 0.835} width={width} height={8} fill={brass} />
      {[...Array(9)].map((_, i) => (
        <rect
          key={i}
          x={40 + i * 125}
          y={height * 0.85}
          width={16}
          height={height * 0.1}
          fill={shade(navy, 1.1)}
        />
      ))}
      {/* floor */}
      <rect x={0} y={height * 0.95} width={width} height={height * 0.05} fill={ink} />
      <Dim dim={dim} width={width} height={height} />
    </SetFrame>
  );
};
