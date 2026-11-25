import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllSubtitleCues,
  checkExpressionCoverage,
  countStoryboardWords,
  countWords,
  formatSubtitleLines,
  getActiveCueAtTime,
  getBeatAtTime,
  parseDialogueLines,
  splitTextByExpressions,
  validateExpressionCount,
} from './scriptUtils';
import { EXAMPLE_BEATS, EXAMPLE_EXPRESSIONS } from '../data/presets';

test('validateExpressionCount enforces at least 5 non-empty expressions', () => {
  const fourItems = EXAMPLE_EXPRESSIONS.slice(0, 4);
  const resFail = validateExpressionCount(fourItems);
  assert.equal(resFail.valid, false);
  assert.equal(resFail.filledCount, 4);

  const fiveWithBlank = [
    ...EXAMPLE_EXPRESSIONS.slice(0, 4),
    { id: 'x', phrase: '   ', movie: '', meaningKo: '' },
  ];
  assert.equal(validateExpressionCount(fiveWithBlank).valid, false);

  const resPass = validateExpressionCount(EXAMPLE_EXPRESSIONS);
  assert.equal(resPass.valid, true);
  assert.equal(resPass.filledCount, 5);
});

test('countWords ignores speaker labels and counts spoken words accurately', () => {
  assert.equal(countWords('A: This robot is worth an absolute fortune.'), 7);
  assert.equal(countWords('B: Should we fix it?'), 4);
  const total = countStoryboardWords(EXAMPLE_BEATS);
  assert.ok(total >= 60 && total <= 70, `Expected 60-70 words, got ${total}`);
});

test('splitTextByExpressions highlights exact typed phrases verbatim', () => {
  const segments = splitTextByExpressions(
    'This robot is Worth an absolute fortune. Really!',
    ['Worth an absolute fortune.']
  );
  const highlighted = segments.filter((s) => s.highlighted);
  assert.equal(highlighted.length, 1);
  assert.equal(highlighted[0].text, 'Worth an absolute fortune.');
});

test('checkExpressionCoverage detects missing and covered expressions', () => {
  const coverage = checkExpressionCoverage(EXAMPLE_BEATS, EXAMPLE_EXPRESSIONS);
  assert.equal(coverage.allCovered, true);
  assert.equal(coverage.missing.length, 0);

  const missingCoverage = checkExpressionCoverage(EXAMPLE_BEATS, [
    ...EXAMPLE_EXPRESSIONS,
    { id: 'extra', phrase: 'Out of the blue', movie: 'Test', meaningKo: '갑자기' },
  ]);
  assert.equal(missingCoverage.allCovered, false);
  assert.deepEqual(missingCoverage.missing, ['Out of the blue']);
});

test('formatSubtitleLines caps subtitles to max two balanced lines', () => {
  const shortLines = formatSubtitleLines('Oh, no!');
  assert.equal(shortLines.length, 1);

  const longLines = formatSubtitleLines(
    'Tempting, but no. Let us enter it in a dance contest right now!'
  );
  assert.equal(longLines.length, 2);
  assert.ok(longLines[0].length > 0 && longLines[1].length > 0);
});

test('buildAllSubtitleCues maps 0-30s timeline cues word-for-word without breaking short sentences', () => {
  const cues = buildAllSubtitleCues(EXAMPLE_BEATS);
  assert.ok(cues.length >= 4);
  assert.equal(cues[0].startSec, 0);
  assert.equal(cues[0].fullText, 'This robot is Worth an absolute fortune. It can do anything.');
  assert.equal(cues[cues.length - 1].endSec, 30);
  const cueAt10 = getActiveCueAtTime(cues, 10);
  assert.ok(cueAt10 !== null);
  assert.ok(cueAt10.lines.length <= 2);
});

test('parseDialogueLines parses A: and B: speaker prefixes cleanly', () => {
  const parsed = parseDialogueLines('B: Should we fix it?\nA: Tempting, but no.');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].speaker, 'B');
  assert.equal(parsed[0].text, 'Should we fix it?');
  assert.equal(parsed[1].speaker, 'A');
});

test('getActiveCueAtTime and getBeatAtTime return null on the 30-34s Final screen', () => {
  const cues = buildAllSubtitleCues(EXAMPLE_BEATS);
  assert.equal(getActiveCueAtTime(cues, 30), null);
  assert.equal(getActiveCueAtTime(cues, 32.5), null);
  assert.equal(getBeatAtTime(EXAMPLE_BEATS, 30), null);
  assert.equal(getBeatAtTime(EXAMPLE_BEATS, 33.9), null);
});
