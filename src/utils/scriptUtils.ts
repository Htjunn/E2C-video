import type {
  BeatId,
  DialogueLine,
  ExpressionItem,
  StoryboardBeat,
  SubtitleCue,
} from '../types/e2c';

export const MIN_EXPRESSIONS = 5;
export const TARGET_WORD_MIN = 60;
export const TARGET_WORD_MAX = 70;
export const TOTAL_VIDEO_SEC = 30;
export const FINAL_SCREEN_DURATION_SEC = 3;
export const STORY_DURATION_SEC = TOTAL_VIDEO_SEC - FINAL_SCREEN_DURATION_SEC;

export function countWords(text: string): number {
  const cleaned = text
    .replace(/\b[AB]:\s*/g, '')
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function formatDialogueLines(lines: DialogueLine[]): string {
  return lines
    .map((line) => `${line.speaker}: ${line.text.trim()}`)
    .filter((s) => s.length > 3)
    .join('\n');
}

export function parseDialogueLines(rawText: string): DialogueLine[] {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return rawLines.map((line, index) => {
    const match = line.match(/^([AB])\s*:\s*(.+)$/i);
    if (match) {
      return {
        speaker: match[1].toUpperCase() === 'B' ? 'B' : 'A',
        text: match[2].trim(),
      };
    }
    return {
      speaker: index % 2 === 0 ? 'A' : 'B',
      text: line,
    };
  });
}

export function countBeatWords(beat: Pick<StoryboardBeat, 'lines' | 'subtitles'>): number {
  const spokenText =
    beat.lines.length > 0
      ? beat.lines.map((l) => l.text).join(' ')
      : beat.subtitles;
  return countWords(spokenText);
}

export function countStoryboardWords(beats: StoryboardBeat[]): number {
  return beats.reduce((sum, beat) => sum + countBeatWords(beat), 0);
}

export function validateExpressionCount(
  expressions: ExpressionItem[],
  minCount: number = MIN_EXPRESSIONS
): { valid: boolean; filledCount: number; message: string | null } {
  const filled = expressions.filter((e) => e.phrase.trim().length > 0);
  if (filled.length < minCount) {
    return {
      valid: false,
      filledCount: filled.length,
      message: `Please enter at least ${minCount} English expressions (${filled.length}/${minCount} entered).`,
    };
  }
  return { valid: true, filledCount: filled.length, message: null };
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
  matchedPhrase?: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits text into plain and highlighted segments matching each typed expression
 * verbatim (preserving exact typed phrase matching, ignoring only optional trailing
 * punctuation sensitivity only when exact full string matches first).
 */
export function splitTextByExpressions(
  text: string,
  phrases: string[]
): TextSegment[] {
  const cleanPhrases = Array.from(
    new Set(phrases.map((p) => p.trim()).filter(Boolean))
  ).sort((a, b) => b.length - a.length);

  if (!text || cleanPhrases.length === 0) {
    return text ? [{ text, highlighted: false }] : [];
  }

  const pattern = new RegExp(`(${cleanPhrases.map(escapeRegExp).join('|')})`, 'g');
  const parts = text.split(pattern);
  const phraseSet = new Set(cleanPhrases);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: phraseSet.has(part),
      matchedPhrase: phraseSet.has(part) ? part : undefined,
    }));
}

export function checkExpressionCoverage(
  beats: StoryboardBeat[],
  expressions: ExpressionItem[]
): {
  covered: string[];
  missing: string[];
  allCovered: boolean;
} {
  const fullScript = beats
    .map((b) => `${b.lines.map((l) => l.text).join(' ')} ${b.subtitles}`)
    .join('\n');

  const required = expressions.map((e) => e.phrase.trim()).filter(Boolean);
  const covered: string[] = [];
  const missing: string[] = [];

  for (const phrase of required) {
    if (fullScript.includes(phrase)) {
      covered.push(phrase);
    } else {
      missing.push(phrase);
    }
  }

  return {
    covered,
    missing,
    allCovered: missing.length === 0,
  };
}

/**
 * Wraps a subtitle string into at most 2 balanced lines for bottom-of-screen display.
 */
export function formatSubtitleLines(
  text: string,
  maxCharsPerLine: number = 42
): [string] | [string, string] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  if (normalized.length <= maxCharsPerLine) {
    return [normalized];
  }

  const words = normalized.split(' ');
  const mid = Math.ceil(normalized.length / 2);
  let bestSplitIndex = 1;
  let bestDiff = Infinity;
  let runningLen = 0;

  for (let i = 0; i < words.length - 1; i++) {
    runningLen += (i > 0 ? 1 : 0) + words[i].length;
    const diff = Math.abs(runningLen - mid);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplitIndex = i + 1;
    }
  }

  const line1 = words.slice(0, bestSplitIndex).join(' ');
  const line2 = words.slice(bestSplitIndex).join(' ');

  if (!line2) return [line1];
  return [line1, line2];
}

/**
 * Splits a beat's spoken lines into word-for-word subtitle cues sized so every cue
 * fits cleanly in max 2 lines at the bottom of the screen.
 */
export function buildBeatSubtitleCues(beat: StoryboardBeat): SubtitleCue[] {
  const duration = Math.max(1, beat.endSec - beat.startSec);
  const lines =
    beat.lines.length > 0
      ? beat.lines
      : [{ speaker: 'A' as const, text: beat.subtitles }];

  // Split each spoken line into natural sentence/clause chunks so every cue
  // fits cleanly in max 2 lines without breaking mid-sentence.
  const chunks: Array<{ speaker: 'A' | 'B'; text: string; words: number }> = [];
  for (const line of lines) {
    const clean = line.text.replace(/\s+/g, ' ').trim();
    if (!clean) continue;

    // Group short sentences together up to 74 chars, or keep separate cues
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    let buffer = '';

    const flushBuffer = () => {
      const trimmed = buffer.trim();
      if (!trimmed) return;
      if (trimmed.length <= 76) {
        chunks.push({ speaker: line.speaker, text: trimmed, words: countWords(trimmed) });
      } else {
        const words = trimmed.split(' ');
        const half = Math.ceil(words.length / 2);
        const part1 = words.slice(0, half).join(' ');
        const part2 = words.slice(half).join(' ');
        if (part1) chunks.push({ speaker: line.speaker, text: part1, words: countWords(part1) });
        if (part2) chunks.push({ speaker: line.speaker, text: part2, words: countWords(part2) });
      }
      buffer = '';
    };

    for (const sentence of sentences) {
      if (!buffer) {
        buffer = sentence;
      } else if (`${buffer} ${sentence}`.length <= 70) {
        buffer = `${buffer} ${sentence}`;
      } else {
        flushBuffer();
        buffer = sentence;
      }
    }
    flushBuffer();
  }

  const totalWords = chunks.reduce((s, c) => s + Math.max(1, c.words), 0);
  if (totalWords === 0 || chunks.length === 0) return [];

  let cursor = beat.startSec;
  return chunks.map((chunk, idx) => {
    const share = Math.max(1, chunk.words) / totalWords;
    const isLast = idx === chunks.length - 1;
    const cueStart = cursor;
    const cueEnd = isLast ? beat.endSec : Number((cursor + duration * share).toFixed(2));
    cursor = cueEnd;

    return {
      startSec: cueStart,
      endSec: cueEnd,
      speaker: chunk.speaker,
      lines: formatSubtitleLines(chunk.text, 40),
      fullText: chunk.text,
    };
  });
}

export function buildAllSubtitleCues(beats: StoryboardBeat[]): SubtitleCue[] {
  return beats.flatMap((beat) => buildBeatSubtitleCues(beat));
}

export function getActiveCueAtTime(
  cues: SubtitleCue[],
  timeSec: number
): SubtitleCue | null {
  if (timeSec < 0 || timeSec >= STORY_DURATION_SEC) {
    return null;
  }
  return (
    cues.find((cue) => timeSec >= cue.startSec && timeSec < cue.endSec) ??
    (cues.length > 0 && timeSec >= cues[cues.length - 1].startSec ? cues[cues.length - 1] : null)
  );
}

export function getBeatAtTime(
  beats: StoryboardBeat[],
  timeSec: number
): StoryboardBeat | null {
  if (timeSec < 0 || timeSec >= STORY_DURATION_SEC) {
    return null;
  }
  return (
    beats.find((b) => timeSec >= b.startSec && timeSec < b.endSec) ??
    beats[beats.length - 1] ??
    null
  );
}

export function mapBeatsToFilmTimeline(
  beats: StoryboardBeat[],
  storyDurationSec: number = STORY_DURATION_SEC
): StoryboardBeat[] {
  if (beats.length === 0) return [];
  const rawEnd = Math.max(1, beats[beats.length - 1].endSec);
  const scale = storyDurationSec / rawEnd;

  return beats.map((beat, idx) => {
    const startSec = Number((beat.startSec * scale).toFixed(2));
    const endSec =
      idx === beats.length - 1
        ? storyDurationSec
        : Number((beat.endSec * scale).toFixed(2));
    return {
      ...beat,
      startSec,
      endSec,
    };
  });
}

export const BEAT_TIME_SLOTS: Array<{
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
