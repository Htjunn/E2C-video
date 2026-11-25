import { GoogleGenAI, Type } from '@google/genai';
import type {
  BeatId,
  BeatVisualSpec,
  DialogueLine,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
} from '../src/types/e2c.ts';

export class ApiServiceError extends Error {
  public statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function formatGeminiError(err: unknown): ApiServiceError {
  if (err instanceof ApiServiceError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return new ApiServiceError(
      429,
      'Daily free-tier Gemini quota was reached. You can select a billing-enabled key in Settings > Secrets, or preview using Browser English Voice.'
    );
  }
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return new ApiServiceError(
      403,
      'Your Gemini API key could not be verified. Please check Settings > Secrets in AI Studio.'
    );
  }
  return new ApiServiceError(500, 'Could not complete Gemini request. Please try again.');
}

const ttsCache = new Map<
  string,
  { beatId: BeatId; audioBase64: string; mimeType: string; durationSec: number }
>();

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ApiServiceError(
      400,
      'GEMINI_API_KEY is not configured. Please check Settings > Secrets in AI Studio.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const BEAT_META: Array<{
  id: BeatId;
  label: string;
  timeRange: string;
  startSec: number;
  endSec: number;
}> = [
  { id: 'hook', label: 'Hook', timeRange: '0–7s', startSec: 0, endSec: 7 },
  { id: 'problem', label: 'Problem', timeRange: '7–15s', startSec: 7, endSec: 15 },
  { id: 'turn', label: 'Turn', timeRange: '15–23s', startSec: 15, endSec: 23 },
  { id: 'close', label: 'Close', timeRange: '23–30s', startSec: 23, endSec: 30 },
];

const STORYBOARD_BEAT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    beatId: {
      type: Type.STRING,
      description: 'One of: hook, problem, turn, close',
    },
    sceneDescription: {
      type: Type.STRING,
      description: '1 short sentence describing visual action in this beat.',
    },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: {
            type: Type.STRING,
            description: 'Must be "A" or "B".',
          },
          text: {
            type: Type.STRING,
            description: 'Natural everyday English dialogue line spoken in this beat.',
          },
        },
        required: ['speaker', 'text'],
      },
    },
    usedExpressions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Exact strings from the required expression list used in this beat.',
    },
    visual: {
      type: Type.OBJECT,
      properties: {
        poseA: {
          type: Type.STRING,
          description: 'One of: proud, worried, panicked, excited, talking',
        },
        poseB: {
          type: Type.STRING,
          description: 'One of: curious, skeptical, amazed, suggesting, cheering',
        },
        propState: {
          type: Type.STRING,
          description: 'One of: idle, spin, dance, spotlight',
        },
        camera: {
          type: Type.STRING,
          description: 'One of: wide, medium, closeup',
        },
        mood: {
          type: Type.STRING,
          description: 'One of: bright, tense, playful, celebrate',
        },
      },
      required: ['poseA', 'poseB', 'propState', 'camera', 'mood'],
    },
  },
  required: ['beatId', 'sceneDescription', 'lines', 'usedExpressions', 'visual'],
};

function sanitizeVisual(raw: Partial<BeatVisualSpec> | undefined, beatId: BeatId): BeatVisualSpec {
  const validA = ['proud', 'worried', 'panicked', 'excited', 'talking'] as const;
  const validB = ['curious', 'skeptical', 'amazed', 'suggesting', 'cheering'] as const;
  const validProp = ['idle', 'spin', 'dance', 'spotlight'] as const;
  const validCam = ['wide', 'medium', 'closeup'] as const;
  const validMood = ['bright', 'tense', 'playful', 'celebrate'] as const;

  const fallbackByBeat: Record<BeatId, BeatVisualSpec> = {
    hook: { poseA: 'proud', poseB: 'curious', propState: 'idle', camera: 'wide', mood: 'bright' },
    problem: { poseA: 'worried', poseB: 'skeptical', propState: 'spin', camera: 'medium', mood: 'tense' },
    turn: { poseA: 'panicked', poseB: 'amazed', propState: 'dance', camera: 'closeup', mood: 'playful' },
    close: { poseA: 'excited', poseB: 'cheering', propState: 'spotlight', camera: 'wide', mood: 'celebrate' },
  };
  const fb = fallbackByBeat[beatId];

  return {
    poseA: validA.includes(raw?.poseA as (typeof validA)[number])
      ? (raw!.poseA as BeatVisualSpec['poseA'])
      : fb.poseA,
    poseB: validB.includes(raw?.poseB as (typeof validB)[number])
      ? (raw!.poseB as BeatVisualSpec['poseB'])
      : fb.poseB,
    propState: validProp.includes(raw?.propState as (typeof validProp)[number])
      ? (raw!.propState as BeatVisualSpec['propState'])
      : fb.propState,
    camera: validCam.includes(raw?.camera as (typeof validCam)[number])
      ? (raw!.camera as BeatVisualSpec['camera'])
      : fb.camera,
    mood: validMood.includes(raw?.mood as (typeof validMood)[number])
      ? (raw!.mood as BeatVisualSpec['mood'])
      : fb.mood,
  };
}

function normalizeLines(rawLines: unknown): DialogueLine[] {
  if (!Array.isArray(rawLines)) return [];
  return rawLines
    .map((item) => {
      const rec = item as { speaker?: string; text?: string };
      const speaker: 'A' | 'B' = String(rec?.speaker ?? 'A').toUpperCase().includes('B')
        ? 'B'
        : 'A';
      const text = String(rec?.text ?? '').trim();
      return { speaker, text };
    })
    .filter((l) => l.text.length > 0);
}

export async function generateStoryboard(
  expressions: ExpressionItem[],
  scene: SceneConfig
): Promise<StoryboardBeat[]> {
  const ai = getAiClient();
  const activeExpressions = expressions.filter((e) => e.phrase.trim().length > 0);
  const phraseList = activeExpressions.map((e, i) => `${i + 1}. "${e.phrase.trim()}"`).join('\n');

  const prompt = `Write a 30-second short film storyboard for Korean university students learning everyday English.

CHARACTERS (original fictional students only):
- Student A (${scene.characters[0].name}): ${scene.characters[0].role}
- Student B (${scene.characters[1].name}): ${scene.characters[1].role}

SETTING & SITUATION:
- Place: ${scene.place}
- Situation: ${scene.situation}
- Visual Style: ${scene.style}

REQUIRED ENGLISH EXPRESSIONS (you MUST include EVERY ONE of these EXACT strings verbatim—character-for-character, exact spelling and capitalization—across the 4 beats' dialogue lines):
${phraseList}

STRICT CONSTRAINTS:
1. Split into exactly 4 beats in order:
   - hook (0–7s)
   - problem (7–15s)
   - turn (15–23s)
   - close (23–30s)
2. Total spoken words across ALL dialogue lines in ALL 4 beats combined MUST be between 60 and 70 words (aim for ~64 words). Count carefully!
3. Every required expression above must appear verbatim at least once in the dialogue lines.
4. Keep dialogue natural, conversational, family-friendly, and clear for Korean college learners.
5. NO real people, NO celebrities, NO copyrighted movie characters, NO brand logos.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a friendly short-film screenwriter for Korean university English learners. Return valid JSON matching the schema. Keep total spoken dialogue words strictly between 60 and 70 words.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          beats: {
            type: Type.ARRAY,
            items: STORYBOARD_BEAT_SCHEMA,
          },
        },
        required: ['beats'],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  const parsed = JSON.parse(text) as {
    beats?: Array<{
      beatId?: string;
      sceneDescription?: string;
      lines?: unknown;
      usedExpressions?: string[];
      visual?: Partial<BeatVisualSpec>;
    }>;
  };

  const rawBeats = parsed.beats ?? [];
  return BEAT_META.map((meta, index) => {
    const found =
      rawBeats.find((b) => String(b.beatId).toLowerCase() === meta.id) ?? rawBeats[index];
    const lines = normalizeLines(found?.lines);
    const subtitles = lines.map((l) => l.text).join(' ').trim();
    return {
      id: meta.id,
      label: meta.label,
      timeRange: meta.timeRange,
      startSec: meta.startSec,
      endSec: meta.endSec,
      sceneDescription:
        String(found?.sceneDescription ?? '').trim() ||
        `${scene.characters[0].name} and ${scene.characters[1].name} continue the scene in ${scene.place}.`,
      lines: lines.length > 0 ? lines : [{ speaker: 'A', text: 'Let us try that again!' }],
      subtitles: subtitles || 'Let us try that again!',
      usedExpressions: Array.isArray(found?.usedExpressions) ? found.usedExpressions : [],
      visual: sanitizeVisual(found?.visual, meta.id),
    };
  });
}

export async function regenerateSingleBeat(
  beatId: BeatId,
  currentBeats: StoryboardBeat[],
  expressions: ExpressionItem[],
  scene: SceneConfig
): Promise<StoryboardBeat> {
  const ai = getAiClient();
  const targetMeta = BEAT_META.find((m) => m.id === beatId) ?? BEAT_META[0];
  const targetBeat = currentBeats.find((b) => b.id === beatId);

  const otherWords = currentBeats
    .filter((b) => b.id !== beatId)
    .reduce(
      (sum, b) =>
        sum +
        b.lines
          .map((l) => l.text)
          .join(' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean).length,
      0
    );

  const targetBeatWordsMin = Math.max(10, 60 - otherWords);
  const targetBeatWordsMax = Math.max(targetBeatWordsMin + 4, Math.min(24, 70 - otherWords));

  const otherText = currentBeats
    .filter((b) => b.id !== beatId)
    .map((b) => b.lines.map((l) => l.text).join(' '))
    .join('\n');

  const missingInOtherBeats = expressions
    .map((e) => e.phrase.trim())
    .filter((phrase) => phrase && !otherText.includes(phrase));

  const mustInclude =
    missingInOtherBeats.length > 0
      ? missingInOtherBeats
      : targetBeat?.usedExpressions?.length
      ? targetBeat.usedExpressions
      : [expressions[0]?.phrase.trim()].filter(Boolean);

  const contextSummary = currentBeats
    .map(
      (b) =>
        `${b.label} (${b.timeRange}): ${b.sceneDescription} | Lines: ${b.lines
          .map((l) => `${l.speaker}: ${l.text}`)
          .join(' / ')}`
    )
    .join('\n');

  const prompt = `Rewrite ONLY the "${targetMeta.label} (${targetMeta.timeRange})" beat of this 30-second short film so it feels fresh while fitting seamlessly with the other 3 beats.

Place: ${scene.place}
Situation: ${scene.situation}
Characters: A = ${scene.characters[0].name}, B = ${scene.characters[1].name}

Current 4-beat script context:
${contextSummary}

REQUIRED EXACT EXPRESSIONS in THIS beat (must appear verbatim):
${mustInclude.map((p) => `- "${p}"`).join('\n')}

WORD BUDGET:
The other 3 beats have ${otherWords} words. Write between ${targetBeatWordsMin} and ${targetBeatWordsMax} spoken words for this beat so the total stays 60–70 words.
Family-friendly, no real people, no celebrities, no brand logos.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a friendly short-film writer. Return valid JSON matching the single-beat schema.',
      responseMimeType: 'application/json',
      responseSchema: STORYBOARD_BEAT_SCHEMA,
    },
  });

  const text = (response.text ?? '{}').trim();
  const parsed = JSON.parse(text) as {
    sceneDescription?: string;
    lines?: unknown;
    usedExpressions?: string[];
    visual?: Partial<BeatVisualSpec>;
  };

  const lines = normalizeLines(parsed.lines);
  const subtitles = lines.map((l) => l.text).join(' ').trim();

  return {
    id: targetMeta.id,
    label: targetMeta.label,
    timeRange: targetMeta.timeRange,
    startSec: targetMeta.startSec,
    endSec: targetMeta.endSec,
    sceneDescription:
      String(parsed.sceneDescription ?? '').trim() ||
      targetBeat?.sceneDescription ||
      'The characters react to the twist.',
    lines: lines.length > 0 ? lines : targetBeat?.lines ?? [{ speaker: 'A', text: 'Look at that!' }],
    subtitles: subtitles || targetBeat?.subtitles || 'Look at that!',
    usedExpressions:
      Array.isArray(parsed.usedExpressions) && parsed.usedExpressions.length > 0
        ? parsed.usedExpressions
        : mustInclude,
    visual: sanitizeVisual(parsed.visual, targetMeta.id),
  };
}

function getWavDurationSeconds(wavBuffer: Buffer): number {
  if (wavBuffer.length < 44) return 4;
  // Byte rate at offset 28 (uint32 LE), data chunk size at offset 40 (uint32 LE)
  const byteRate = wavBuffer.readUInt32LE(28);
  const dataSize = wavBuffer.readUInt32LE(40);
  if (byteRate > 0 && dataSize > 0 && dataSize <= wavBuffer.length) {
    return Number((dataSize / byteRate).toFixed(2));
  }
  return Number(((wavBuffer.length - 44) / (24000 * 2)).toFixed(2));
}

export async function generateBeatTts(
  beat: StoryboardBeat,
  scene: SceneConfig
): Promise<{
  beatId: BeatId;
  audioBase64: string;
  mimeType: string;
  durationSec: number;
}> {
  const ai = getAiClient();
  const lines = beat.lines.filter((l) => l.text.trim().length > 0);
  if (lines.length === 0) {
    throw new Error(`Beat ${beat.label} has no spoken dialogue lines.`);
  }

  const speakersPresent = new Set(lines.map((l) => l.speaker));
  const charAName = scene.characters[0]?.name || 'Student A';
  const charBName = scene.characters[1]?.name || 'Student B';
  const cacheKey = JSON.stringify({ id: beat.id, lines, charAName, charBName });
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    if (speakersPresent.size === 2) {
      // Dual-speaker screenplay TTS using gemini-3.8-flash-tts
      const parts = lines.map((line) => ({
        text: `${line.speaker === 'A' ? charAName : charBName}: ${line.text}`,
        speechMetadata: {
          speaker: line.speaker === 'A' ? charAName : charBName,
          style:
            line.speaker === 'A'
              ? 'Friendly, expressive young university student, clear natural English pronunciation'
              : 'Warm, conversational university friend, clear natural English pronunciation',
        },
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: charAName,
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                },
                {
                  speaker: charBName,
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
              ],
            },
          },
        },
      });

      const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) {
        throw new ApiServiceError(500, `TTS returned empty audio for beat ${beat.label}.`);
      }
      const wavBuffer = Buffer.from(inline.data, 'base64');
      const result = {
        beatId: beat.id,
        audioBase64: inline.data,
        mimeType: inline.mimeType || 'audio/wav',
        durationSec: getWavDurationSeconds(wavBuffer),
      };
      ttsCache.set(cacheKey, result);
      return result;
    }

    // Single-speaker TTS using gemini-3.8-flash-lite-tts
    const onlySpeaker = lines[0].speaker;
    const combinedText = lines.map((l) => l.text).join(' ');
    const voiceName = onlySpeaker === 'A' ? 'Puck' : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: combinedText,
              speechMetadata: {
                style:
                  'Friendly university student speaking clear, natural conversational English for learners',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const inline = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inline?.data) {
      throw new ApiServiceError(500, `TTS returned empty audio for beat ${beat.label}.`);
    }
    const wavBuffer = Buffer.from(inline.data, 'base64');
    const result = {
      beatId: beat.id,
      audioBase64: inline.data,
      mimeType: inline.mimeType || 'audio/wav',
      durationSec: getWavDurationSeconds(wavBuffer),
    };
    ttsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    throw formatGeminiError(err);
  }
}
