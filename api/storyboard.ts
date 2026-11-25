import type { ServerResponse } from 'node:http';
import {
  formatGeminiError,
  generateStoryboard,
} from '../server/geminiService.ts';
import type { ExpressionItem, SceneConfig } from '../src/types/e2c.ts';
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
      expressions?: ExpressionItem[];
      scene?: SceneConfig;
    }>(req);
    const { expressions, scene } = body;

    if (
      !Array.isArray(expressions) ||
      expressions.filter((e) => e.phrase?.trim()).length < 5
    ) {
      return sendJson(res, 400, {
        error: 'Please provide at least 5 English expressions.',
      });
    }
    if (!scene) {
      return sendJson(res, 400, { error: 'Missing scene configuration.' });
    }

    const beats = await generateStoryboard(expressions, scene);
    return sendJson(res, 200, { beats });
  } catch (err) {
    const apiErr = formatGeminiError(err);
    return sendJson(res, apiErr.statusCode, { error: apiErr.message });
  }
}
