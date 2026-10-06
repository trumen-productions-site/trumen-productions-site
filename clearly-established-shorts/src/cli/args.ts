/**
 * The CLI flag parser. Every flag the engine understands is listed here, so a
 * test can prove none of them touches the release gate.
 */
export const KNOWN_FLAGS = {
  episode: 'string', // --episode 001
  preset: 'string', // --preset youtube-shorts | all
  all: 'boolean', // --all
  id: 'string', // --id 007 (new-episode)
  slug: 'string', // --slug the-phone-call (new-episode)
  title: 'string', // --title "The Phone Call" (new-episode)
  concurrency: 'string', // --concurrency 2 (render)
  quiet: 'boolean', // --quiet
  'skip-probe': 'boolean', // --skip-probe (render)
} as const;

export type FlagName = keyof typeof KNOWN_FLAGS;
export type ParsedArgs = {
  flags: Partial<Record<FlagName, string | boolean>>;
  positional: string[];
};

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Partial<Record<FlagName, string | boolean>> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const [rawName, inlineValue] = arg.slice(2).split('=', 2);
    const name = rawName as FlagName;
    const kind = KNOWN_FLAGS[name];
    if (!kind) {
      throw new Error(
        `Unknown flag "--${rawName}". Known flags: ${Object.keys(KNOWN_FLAGS)
          .map((f) => `--${f}`)
          .join(', ')}`,
      );
    }
    if (kind === 'boolean') {
      flags[name] = true;
    } else {
      const value = inlineValue ?? argv[++i];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`Flag "--${rawName}" needs a value`);
      flags[name] = value;
    }
  }
  return { flags, positional };
}

export function stringFlag(args: ParsedArgs, name: FlagName): string | undefined {
  const v = args.flags[name];
  return typeof v === 'string' ? v : undefined;
}

export function boolFlag(args: ParsedArgs, name: FlagName): boolean {
  return args.flags[name] === true;
}
