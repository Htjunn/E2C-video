import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiJson } from './apiClient';

test('readApiJson turns plain-text 404 HTML/text errors into a clear message instead of JSON SyntaxError', async () => {
  const res = new Response('The page could not be found\nNOT_FOUND', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' },
  });

  await assert.rejects(() => readApiJson(res), {
    message:
      'API endpoint was not found (404). Please make sure the server API routes are deployed.',
  });
});

test('readApiJson extracts JSON error message when server returns structured JSON error', async () => {
  const res = new Response(
    JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  await assert.rejects(() => readApiJson(res), {
    message: 'GEMINI_API_KEY is not configured.',
  });
});

test('readApiJson parses valid JSON payloads cleanly', async () => {
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await readApiJson<{ ok: boolean }>(res);
  assert.equal(data.ok, true);
});
