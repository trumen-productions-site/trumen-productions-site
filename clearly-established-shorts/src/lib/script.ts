/**
 * The approved script: Michael's dictated lines, exactly as recorded.
 *
 * Format of script.approved.txt:
 *   - lines beginning with "#" are comments (the beat list ships this way)
 *   - blank lines are ignored
 *   - every other line is one spoken line, verbatim
 *
 * Caption text comes from here and from nowhere else.
 */

export interface ApprovedScript {
  /** Spoken lines in order, whitespace-normalised, NFC. */
  lines: string[];
  /** Comment lines without the leading "#", for the beat list. */
  comments: string[];
  /** True when the file holds no spoken lines yet. */
  awaitingTake: boolean;
}

/** Unicode NFC, collapse runs of whitespace, trim. The only normalisation captions apply. */
export function normalizeText(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function parseScript(raw: string): ApprovedScript {
  const lines: string[] = [];
  const comments: string[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;
    if (trimmed.startsWith('#')) {
      comments.push(trimmed.replace(/^#\s?/, ''));
      continue;
    }
    lines.push(normalizeText(trimmed));
  }
  return { lines, comments, awaitingTake: lines.length === 0 };
}

/** Words of a line, for captions and alignment. Punctuation stays attached to its word. */
export function wordsOf(line: string): string[] {
  return normalizeText(line)
    .split(' ')
    .filter((w) => w.length > 0);
}

/** Lower-case letters and digits only, for matching recognised speech to script words. */
export function matchKey(word: string): string {
  return word
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
