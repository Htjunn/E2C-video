import type { ServerResponse } from 'node:http';
import {
  formatGeminiError,
  generateBeatTts,
} from '../server/geminiService.ts';
import type { SceneConfig, StoryboardBeat } from '../src/types/e2c.ts';
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
      beats?: StoryboardBeat[];
      scene?: SceneConfig;
    }>(req);
    const { beats, scene } = body;

    if (!Array.isArray(beats) || beats.length === 0 || !scene) {
      return sendJson(res, 400, {
        error: 'Missing storyboard beats for voice generation.',
      });
    }

    const audioClips = await Promise.all(
      beats.map((beat) => generateBeatTts(beat, scene))
    );
    return sendJson(res, 200, { audioClips });
  } catch (err) {
    const apiErr = formatGeminiError(err);
    return sendJson(res, apiErr.statusCode, { error: apiErr.message });
  }
}
