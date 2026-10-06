import { config } from '@remotion/eslint-config-flat';

export default [
  ...config,
  {
    ignores: ['node_modules/**', 'out/**', '.cache/**', 'tools/**', 'coverage/**'],
  },
  {
    rules: {
      // The engine must never read the environment to alter behaviour; the one
      // place that does so (browser discovery) is listed in tests/gate.test.ts.
      'no-process-env': 'error',
    },
  },
];
