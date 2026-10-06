/**
 * Remotion configuration.
 *
 * Two things live here and nothing else:
 *   1. The browser Remotion renders with. A locally installed headless Chromium
 *      is used when one is found at a known path, so no download is attempted
 *      on machines without network access. Otherwise Remotion's default applies.
 *   2. Chromium's default GL. The software renderer ("swangle") was measured at a
 *      tenth of the speed with no visible difference; see docs/CHANGELOG.md.
 *
 * Nothing here touches the release gate. The gate is config/gate.json and
 * src/lib/gate.ts, and tests/gate.test.ts proves no flag or variable reaches it.
 */
import { Config } from '@remotion/cli/config';
import { findLocalBrowser } from './src/lib/browser.js';
import { webpackOverride } from './src/lib/webpack-override.js';

const browser = findLocalBrowser();
if (browser) {
  Config.setBrowserExecutable(browser);
}
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(webpackOverride);
Config.setPublicDir('./public');
