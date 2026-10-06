import React, { useMemo } from 'react';
import { availableVisemes, prefixSvgIds, rigStyle, type RigPoseState } from '../lib/rig.js';
import type { RigConfig } from '../lib/schema.js';
import type { RigBundle } from '../lib/types.js';

export interface RigProps {
  bundle: RigBundle;
  /** Unique per instance on the page. */
  instanceId: string;
  state: RigPoseState;
  poseOverride?: RigConfig['poses'][string];
  /** Rendered height in canvas pixels. */
  heightPx: number;
  /** Bottom-centre anchor in canvas pixels. */
  x: number;
  bottom: number;
  /** 1 faces the viewer's right (as drawn), -1 mirrors. */
  facing?: 1 | -1;
  opacity?: number;
  /** Extra transform applied to the whole figure, e.g. a step forward. */
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

export const Rig: React.FC<RigProps> = ({
  bundle,
  instanceId,
  state,
  poseOverride,
  heightPx,
  x,
  bottom,
  facing = 1,
  opacity = 1,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
}) => {
  const prefix = `rig-${instanceId}`;
  const svg = useMemo(() => prefixSvgIds(bundle.svg, prefix), [bundle.svg, prefix]);
  const visemes = useMemo(() => availableVisemes(bundle.svg), [bundle.svg]);
  const css = rigStyle(prefix, bundle.config, state, visemes, poseOverride);
  const ratio = bundle.config.viewBox.width / bundle.config.viewBox.height;
  const widthPx = heightPx * ratio;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - widthPx / 2 + offsetX,
        top: bottom - heightPx + offsetY,
        width: widthPx,
        height: heightPx,
        opacity,
        transform: `scale(${scale * facing}, ${scale})`,
        transformOrigin: '50% 100%',
      }}
    >
      <style>{css}</style>
      <div
        style={{ width: '100%', height: '100%' }}
        dangerouslySetInnerHTML={{
          __html: svg.replace(/<svg /, '<svg style="width:100%;height:100%;display:block" '),
        }}
      />
    </div>
  );
};
