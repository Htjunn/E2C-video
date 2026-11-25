import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateCalmBgmWavBuffer } from './bgmGenerator.ts';

export interface ExportAudioBeatInput {
  beatId: string;
  startSec: number;
  endSec: number;
  audioBase64: string;
}

export interface ExportMp4Request {
  frames: string[];
  fps: number;
  totalDurationSec: number;
  audioBeats: ExportAudioBeatInput[];
  includeBgm?: boolean;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-600)}`));
      }
    });
  });
}

export async function renderMp4FromFramesAndAudio(
  payload: ExportMp4Request
): Promise<Buffer> {
  const { frames, fps, totalDurationSec, audioBeats, includeBgm = true } = payload;
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error('No video frames provided for MP4 export.');
  }

  const workDir = path.join(os.tmpdir(), `e2c-export-${crypto.randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    await Promise.all(
      frames.map(async (frameStr, idx) => {
        const cleanBase64 = frameStr.includes(',')
          ? frameStr.split(',')[1]
          : frameStr;
        const buf = Buffer.from(cleanBase64, 'base64');
        const filename = `frame_${String(idx).padStart(5, '0')}.jpg`;
        await fs.writeFile(path.join(workDir, filename), buf);
      })
    );

    const validAudioBeats = (audioBeats || []).filter(
      (b) => b.audioBase64 && b.audioBase64.length > 44
    );

    const outPath = path.join(workDir, 'e2c_movie_clip.mp4');
    const args: string[] = [
      '-y',
      '-framerate',
      String(fps || 10),
      '-i',
      path.join(workDir, 'frame_%05d.jpg'),
    ];

    const filterParts: string[] = [];
    const mixInputs: string[] = [];
    let nextInputIndex = 1;

    // 1. Add beat voice tracks timed to exact beat windows
    for (let i = 0; i < validAudioBeats.length; i++) {
      const beat = validAudioBeats[i];
      const wavPath = path.join(workDir, `beat_${i}.wav`);
      await fs.writeFile(wavPath, Buffer.from(beat.audioBase64, 'base64'));
      args.push('-i', wavPath);

      const inputIdx = nextInputIndex++;
      const delayMs = Math.max(0, Math.round(beat.startSec * 1000));
      const maxClipDur = Math.max(1, beat.endSec - beat.startSec);
      filterParts.push(
        `[${inputIdx}:a]atrim=0:${maxClipDur},asetpts=PTS-STARTPTS,aresample=24000,adelay=${delayMs}|${delayMs}[a${i}]`
      );
      mixInputs.push(`[a${i}]`);
    }

    // 2. Add soft calm background music WAV track across entire duration (including Final screen)
    if (includeBgm) {
      const bgmPath = path.join(workDir, 'bgm.wav');
      const bgmWav = generateCalmBgmWavBuffer(totalDurationSec);
      await fs.writeFile(bgmPath, bgmWav);
      args.push('-i', bgmPath);

      const bgmIdx = nextInputIndex++;
      const bgmGain = validAudioBeats.length > 0 ? '0.16' : '0.32';
      filterParts.push(`[${bgmIdx}:a]aresample=24000,volume=${bgmGain}[abgm]`);
      mixInputs.push('[abgm]');
    }

    if (mixInputs.length > 0) {
      // Base silent track ensures exact totalDurationSec audio length
      args.push(
        '-f',
        'lavfi',
        '-t',
        String(totalDurationSec),
        '-i',
        'anullsrc=r=24000:cl=mono'
      );
      const silentIdx = nextInputIndex++;
      mixInputs.push(`[${silentIdx}:a]`);

      const filterComplex = `${filterParts.join(';')};${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:normalize=0[aout]`;

      args.push(
        '-filter_complex',
        filterComplex,
        '-map',
        '0:v',
        '-map',
        '[aout]',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'veryfast',
        '-crf',
        '22',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-t',
        String(totalDurationSec),
        '-movflags',
        '+faststart',
        outPath
      );
    } else {
      args.push(
        '-f',
        'lavfi',
        '-t',
        String(totalDurationSec),
        '-i',
        'anullsrc=r=24000:cl=mono',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'veryfast',
        '-crf',
        '22',
        '-c:a',
        'aac',
        '-shortest',
        '-t',
        String(totalDurationSec),
        '-movflags',
        '+faststart',
        outPath
      );
    }

    await runFfmpeg(args);
    return await fs.readFile(outPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
