/**
 * Optional tool setup. Downloads happen HERE and only here, at setup time,
 * never at render time:
 *
 *   npm run setup:rhubarb   Rhubarb Lip Sync 1.13.0 (MIT) → tools/rhubarb/
 *   npm run setup:whisper   whisper.cpp + the tiny.en model → tools/whisper/
 *
 * Both are optional. Without Rhubarb the engine uses the amplitude-driven
 * mouth; without whisper.cpp it uses the energy aligner. Every download is
 * GET-only and the Rhubarb archive is checked against a pinned SHA-256.
 */
import { createHash } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLS_DIR } from '../lib/paths.js';

const RHUBARB = {
  version: '1.13.0',
  url: 'https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Linux.zip',
  sha256: 'bd260905e88d0bdadbd4d7b452cae3b78a880fe27d10d51586772f84aac69f71',
  dir: path.join(TOOLS_DIR, 'rhubarb'),
};

const WHISPER = {
  version: '1.7.4',
  model: 'tiny.en',
  modelUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
  dir: path.join(TOOLS_DIR, 'whisper'),
};

function download(url: string, to: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error(`too many redirects for ${url}`));
    https
      .get(url, { headers: { 'user-agent': 'clearly-established-shorts-setup' } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          return resolve(
            download(new URL(res.headers.location, url).toString(), to, redirects + 1),
          );
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`GET ${url} → HTTP ${res.statusCode}`));
        }
        const file = createWriteStream(to);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

async function setupRhubarb(): Promise<void> {
  const bin = path.join(RHUBARB.dir, 'rhubarb');
  if (existsSync(bin)) {
    console.log(`Rhubarb already installed at ${bin}`);
    return;
  }
  mkdirSync(RHUBARB.dir, { recursive: true });
  const zip = path.join(RHUBARB.dir, 'rhubarb.zip');
  console.log(`Downloading Rhubarb Lip Sync ${RHUBARB.version}…`);
  await download(RHUBARB.url, zip);
  const got = sha256(zip);
  if (got !== RHUBARB.sha256) {
    rmSync(zip);
    throw new Error(
      `Rhubarb archive SHA-256 mismatch: expected ${RHUBARB.sha256}, got ${got}. Not installed.`,
    );
  }
  const unzip = spawnSync('unzip', ['-q', '-o', zip, '-d', RHUBARB.dir], { stdio: 'inherit' });
  if (unzip.status !== 0) throw new Error('unzip failed; install unzip and run again');
  const extracted = path.join(RHUBARB.dir, `Rhubarb-Lip-Sync-${RHUBARB.version}-Linux`);
  for (const entry of ['rhubarb', 'res', 'LICENSE.md', 'README.adoc']) {
    renameSync(path.join(extracted, entry), path.join(RHUBARB.dir, entry));
  }
  rmSync(extracted, { recursive: true, force: true });
  rmSync(zip);
  const check = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  console.log(check.stdout.trim());
  console.log(
    `Installed to ${RHUBARB.dir} (SHA-256 of archive ${got}). Licence: ${path.join(RHUBARB.dir, 'LICENSE.md')}`,
  );
}

async function setupWhisper(): Promise<void> {
  mkdirSync(WHISPER.dir, { recursive: true });
  const { installWhisperCpp } = await import('@remotion/install-whisper-cpp');
  console.log(`Building whisper.cpp ${WHISPER.version} (needs git, cmake and a C++ compiler)…`);
  await installWhisperCpp({ to: WHISPER.dir, version: WHISPER.version, printOutput: false });
  const model = path.join(WHISPER.dir, `ggml-${WHISPER.model}.bin`);
  if (!existsSync(model) || readFileSync(model).length < 1_000_000) {
    console.log(`Downloading the ${WHISPER.model} model…`);
    await download(WHISPER.modelUrl, model);
  }
  const size = readFileSync(model).length;
  if (size < 1_000_000) {
    rmSync(model);
    throw new Error(
      `The model download returned ${size} bytes, which is not a model. Is huggingface.co reachable from this machine?`,
    );
  }
  const cli = path.join(WHISPER.dir, 'build', 'bin', 'whisper-cli');
  const check = spawnSync(cli, ['-m', model, '--help'], { encoding: 'utf8' });
  if (check.status !== 0) throw new Error(`whisper-cli did not run: ${check.stderr}`);
  console.log(
    `whisper.cpp ready at ${cli}; model ${WHISPER.model} SHA-256 ${sha256(model)} (${size} bytes).`,
  );
}

const which = process.argv[2];
if (which === 'rhubarb') await setupRhubarb();
else if (which === 'whisper') await setupWhisper();
else {
  console.error('usage: setup-tools <rhubarb|whisper>');
  process.exit(2);
}
