/**
 * Audio I/O through ffmpeg. The engine never parses container formats
 * itself: every WAV, whatever its depth or rate, is decoded to 16-bit mono PCM
 * by ffmpeg, which is a hard requirement of the pipeline anyway.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export interface Pcm {
  sampleRate: number;
  samples: Int16Array;
  durationSeconds: number;
}

export function ffmpegAvailable(): boolean {
  return spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
}

export function decodePcm(file: string, sampleRate = 16000): Pcm {
  const result = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      file,
      '-ac',
      '1',
      '-ar',
      String(sampleRate),
      '-f',
      's16le',
      '-acodec',
      'pcm_s16le',
      '-',
    ],
    { maxBuffer: 1 << 30 },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${file}: ${result.stderr.toString()}`);
  }
  const buf: Buffer = result.stdout;
  const samples = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 2));
  return { sampleRate, samples, durationSeconds: samples.length / sampleRate };
}

export function probeDuration(file: string): number {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`ffprobe failed on ${file}: ${result.stderr}`);
  return Number.parseFloat(result.stdout.trim());
}

/** Write 16-bit PCM mono samples as a WAV file. */
export function writeWav(file: string, samples: Int16Array, sampleRate: number): void {
  const dataBytes = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  const body = Buffer.from(samples.buffer, samples.byteOffset, dataBytes);
  writeFileSync(file, Buffer.concat([header, body]));
}

/** RMS per window of `windowSeconds`, as linear amplitude 0..1. */
export function rmsEnvelope(pcm: Pcm, windowSeconds: number): Float32Array {
  const win = Math.max(1, Math.round(pcm.sampleRate * windowSeconds));
  const n = Math.ceil(pcm.samples.length / win);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const start = i * win;
    const end = Math.min(pcm.samples.length, start + win);
    for (let j = start; j < end; j++) {
      const v = (pcm.samples[j] ?? 0) / 32768;
      sum += v * v;
    }
    out[i] = Math.sqrt(sum / Math.max(1, end - start));
  }
  return out;
}
