/**
 * The footnote engine.
 *
 * Sections call `fn.mark('id')` where a claim needs its note, and `fn.flush()`
 * at the end of the section to print the notes that section used — the way
 * the reference page keeps every aggressive number's caveat in view beneath
 * it. Numbering is by first appearance across the whole page, so a note
 * referenced in two sections keeps one number.
 *
 * Two failures are deliberate and loud: an unknown id, and a definition that
 * nothing on the page used (unless it belongs to a deliberately hidden tile).
 */

import { esc } from '../../lib/html.mjs';

export class FootnoteError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FootnoteError';
  }
}

export function createFootnotes(definitions) {
  const defs = definitions ?? {};
  const order = []; // ids, in order of first appearance
  let pendingFlush = []; // ids referenced since the last flush
  const anchored = new Set(); // ids whose first reference carries the back-link id
  const printed = new Set(); // ids whose note has been printed once (and so owns the id)

  return {
    /** A superscript reference. Returns HTML. */
    mark(id) {
      if (!Object.prototype.hasOwnProperty.call(defs, id)) {
        throw new FootnoteError(`Unknown footnote id "${id}". Add it to legal.footnotes or remove the reference.`);
      }
      if (!order.includes(id)) order.push(id);
      if (!pendingFlush.includes(id)) pendingFlush.push(id);
      const n = order.indexOf(id) + 1;
      const anchor = anchored.has(id) ? '' : ` id="fnref-${esc(id)}"`;
      anchored.add(id);
      return `<sup class="fn-ref"><a href="#fn-${esc(id)}"${anchor} aria-label="Footnote ${n}">${n}</a></sup>`;
    },

    /** The number a note has (or would have). */
    number(id) {
      const i = order.indexOf(id);
      return i === -1 ? null : i + 1;
    },

    /** Print the notes referenced since the last flush, numbered as on the page. */
    flush({ heading = 'Notes' } = {}) {
      if (!pendingFlush.length) return '';
      const items = pendingFlush
        .map((id) => {
          const n = order.indexOf(id) + 1;
          const back = anchored.has(id) ? ` <a class="fn-back" href="#fnref-${esc(id)}" aria-label="Back to reference ${n}">↩</a>` : '';
          // A note printed in a second section repeats the text but not the id.
          const idAttr = printed.has(id) ? '' : ` id="fn-${esc(id)}"`;
          printed.add(id);
          return `<li${idAttr} value="${n}">${esc(defs[id])}${back}</li>`;
        })
        .join('\n');
      pendingFlush = [];
      return `<aside class="footnotes" aria-label="${esc(heading)}"><ol class="footnotes__list">\n${items}\n</ol></aside>`;
    },

    /** Ids used so far, in order. */
    used() {
      return [...order];
    },

    /** Fail if a definition went unused, except those listed. */
    assertAllUsed(exempt = []) {
      const unused = Object.keys(defs).filter((id) => !order.includes(id) && !exempt.includes(id));
      if (unused.length) {
        throw new FootnoteError(`Footnote(s) defined but never used: ${unused.join(', ')}. Remove them or reference them.`);
      }
    },

    /** Fail if a flush was forgotten. */
    assertFlushed() {
      if (pendingFlush.length) {
        throw new FootnoteError(`Footnote(s) referenced but never printed: ${pendingFlush.join(', ')}. Call flush() at the end of the section.`);
      }
    },
  };
}

export default createFootnotes;
