/** The engine imports with ".js" extensions (ESM style); point webpack at the TypeScript sources. */
import type { WebpackOverrideFn } from '@remotion/bundler';

export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensionAlias: { '.js': ['.tsx', '.ts', '.js'] },
  },
});
