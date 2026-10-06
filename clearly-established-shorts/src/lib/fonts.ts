/**
 * Vendored fonts, loaded from public/fonts (synced from assets/fonts by the
 * prepare step). Nothing is fetched from the network at render time.
 */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const GELASIO = 'Gelasio';
export const POPPINS = 'Poppins';

let promise: Promise<void> | null = null;

export function loadBrandFonts(): Promise<void> {
  if (!promise) {
    promise = Promise.all([
      loadFont({
        family: GELASIO,
        url: staticFile('fonts/gelasio-latin-400-normal.woff2'),
        weight: '400',
        style: 'normal',
      }),
      loadFont({
        family: GELASIO,
        url: staticFile('fonts/gelasio-latin-400-italic.woff2'),
        weight: '400',
        style: 'italic',
      }),
      loadFont({
        family: GELASIO,
        url: staticFile('fonts/gelasio-latin-700-normal.woff2'),
        weight: '700',
        style: 'normal',
      }),
      loadFont({
        family: GELASIO,
        url: staticFile('fonts/gelasio-latin-700-italic.woff2'),
        weight: '700',
        style: 'italic',
      }),
      loadFont({
        family: POPPINS,
        url: staticFile('fonts/poppins-latin-700-italic.woff2'),
        weight: '700',
        style: 'italic',
      }),
    ]).then(() => undefined);
  }
  return promise;
}

/** The serif stack for titles and captions, given the typeface in force. */
export function serifStack(typeface: 'Georgia' | 'Gelasio'): string {
  return typeface === 'Georgia' ? `Georgia, ${GELASIO}, serif` : `${GELASIO}, Georgia, serif`;
}
