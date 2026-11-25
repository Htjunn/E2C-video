import type { ServerResponse } from 'node:http';
import { sendJson, type VercelRequestLike } from './_utils.ts';

export default function handler(_req: VercelRequestLike, res: ServerResponse) {
  return sendJson(res, 200, { ok: true });
}
