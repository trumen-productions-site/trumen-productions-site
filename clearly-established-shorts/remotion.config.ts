/**
 * Remotion configuration.
 *
 * Two things live here and nothing else:
 *   1. The browser Remotion renders with. A locally installed headless Chromium
 *      is used when one is found at a known path, so no download is attempted
 *      on machines without network access. Otherwise Remotion's default applies.
 *   2. Software OpenGL, so renders are identical on headless machines.
 *
 * Nothing here touches the release gate. The gate is config/gate.json and
 * src/lib/gate.ts, and tests/gate.test.ts proves no flag or variable reaches it.
 */
import { Config } from '@remotion/cli/config';
import { findLocalBrowser } from './src/lib/browser.js';

const browser = findLocalBrowser();
if (browser) {
  Config.setBrowserExecutable(browser);
}
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
