export async function readApiJson<T>(response: Response): Promise<T> {
  const rawText = await response.text();
  let parsed: (T & { error?: string }) | null = null;

  if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
    try {
      parsed = JSON.parse(rawText) as T & { error?: string };
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
      throw new Error(parsed.error);
    }
    if (response.status === 404) {
      throw new Error(
        'API endpoint was not found (404). Please make sure the server API routes are deployed.'
      );
    }
    throw new Error(
      `Server request failed (${response.status}). Please try again in a moment.`
    );
  }

  if (parsed === null) {
    throw new Error('Server returned an unexpected non-JSON response. Please try again.');
  }

  return parsed;
}
