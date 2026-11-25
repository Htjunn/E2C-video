import type { ServerResponse } from 'node:http';
import {
  formatGeminiError,
  regenerateSingleBeat,
} from '../server/geminiService.ts';
import type {
  BeatId,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
} from '../src/types/e2c.ts';
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
      beatId?: BeatId;
      currentBeats?: StoryboardBeat[];
      expressions?: ExpressionItem[];
      scene?: SceneConfig;
    }>(req);
    const { beatId, currentBeats, expressions, scene } = body;

    if (!beatId || !Array.isArray(currentBeats) || !scene) {
      return sendJson(res, 400, {
        error: 'Missing beatId, currentBeats, or scene.',
      });
    }

    const beat = await regenerateSingleBeat(
      beatId,
      currentBeats,
      Array.isArray(expressions) ? expressions : [],
      scene
    );
    return sendJson(res, 200, { beat });
  } catch (err) {
    const apiErr = formatGeminiError(err);
    return sendJson(res, apiErr.statusCode, { error: apiErr.message });
  }
}
