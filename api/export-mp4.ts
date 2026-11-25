import type { ServerResponse } from 'node:http';
import {
  renderMp4FromFramesAndAudio,
  type ExportAudioBeatInput,
} from '../server/videoExporter.ts';
import { readJsonBody, sendJson, type VercelRequestLike } from './_utils.ts';

export default async function handler(
  req: VercelRequestLike,
  res: ServerResponse
) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const body = await readJsonBody<{
      frames?: string[];
      fps?: number;
      totalDurationSec?: number;
      audioBeats?: ExportAudioBeatInput[];
      includeBgm?: boolean;
    }>(req);

    const mp4Buffer = await renderMp4FromFramesAndAudio({
      frames: Array.isArray(body.frames) ? body.frames : [],
      fps: Number(body.fps) || 10,
      totalDurationSec: Number(body.totalDurationSec) || 30,
      audioBeats: Array.isArray(body.audioBeats) ? body.audioBeats : [],
      includeBgm: body.includeBgm !== false,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="e2c-30s-clip.mp4"');
    res.end(mp4Buffer);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to export MP4 video.';
    return sendJson(res, 500, { error: message });
  }
}
