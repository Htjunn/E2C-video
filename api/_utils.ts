import type { IncomingMessage, ServerResponse } from 'node:http';

export interface VercelRequestLike extends IncomingMessage {
  body?: unknown;
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: VercelRequestLike
): Promise<T> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return (req.body ? JSON.parse(req.body) : {}) as T;
    }
    return req.body as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown
) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
