import React from 'react';
import { Composition } from 'remotion';
import { Episode } from './compositions/Episode.js';
import type { RootProps } from './lib/types.js';

// Remotion types composition props as Record<string, unknown>; the engine's props are RootProps.
const EpisodeComponent = Episode as unknown as React.FC<Record<string, unknown>>;

/**
 * One composition. Its props are the prepared render data for an episode
 * (see src/lib/prepare.ts); duration follows the data, so the take governs.
 */
export const Root: React.FC = () => (
  <Composition
    id="Episode"
    component={EpisodeComponent}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={{ kind: 'empty' }}
    calculateMetadata={({ props }) => {
      const p = props as unknown as RootProps;
      if (p.kind === 'episode') {
        return {
          durationInFrames: p.durationInFrames,
          fps: p.fps,
          width: p.width,
          height: p.height,
        };
      }
      return {};
    }}
  />
);
