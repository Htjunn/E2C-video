import { useState } from 'react';
import { CheckCircle2, Edit3, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { BeatId, ExpressionItem, StoryboardBeat } from '../types/e2c';
import {
  TARGET_WORD_MAX,
  TARGET_WORD_MIN,
  checkExpressionCoverage,
  countBeatWords,
  countStoryboardWords,
  formatDialogueLines,
  parseDialogueLines,
  splitTextByExpressions,
} from '../utils/scriptUtils';

interface Step3StoryboardProps {
  beats: StoryboardBeat[];
  expressions: ExpressionItem[];
  regeneratingBeatId: BeatId | null;
  isPreparingVideo: boolean;
  errorMessage: string | null;
  onUpdateBeat: (beatId: BeatId, updated: Partial<StoryboardBeat>) => void;
  onRegenerateBeat: (beatId: BeatId) => void;
  onBack: () => void;
  onCreateVideo: () => void;
}

function HighlightedText({
  text,
  phrases,
}: {
  text: string;
  phrases: string[];
}) {
  const segments = splitTextByExpressions(text, phrases);
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlighted ? (
          <mark
            key={i}
            className="bg-[#FEF3C7] text-[#78350F] font-semibold px-1 py-0.5 rounded underline decoration-[#D97706] decoration-2 underline-offset-2"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export function Step3Storyboard({
  beats,
  expressions,
  regeneratingBeatId,
  isPreparingVideo,
  errorMessage,
  onUpdateBeat,
  onRegenerateBeat,
  onBack,
  onCreateVideo,
}: Step3StoryboardProps) {
  const [editingBeatId, setEditingBeatId] = useState<BeatId | null>(null);

  const activePhrases = expressions.map((e) => e.phrase.trim()).filter(Boolean);
  const totalWords = countStoryboardWords(beats);
  const inWordRange = totalWords >= TARGET_WORD_MIN && totalWords <= TARGET_WORD_MAX;
  const coverage = checkExpressionCoverage(beats, expressions);

  return (
    <section aria-labelledby="step3-heading" className="space-y-6">
      <div className="space-y-2 max-w-2xl">
        <p className="text-sm font-medium text-[#4B5B6B]">
          Step 3 of 5 · 4-Beat Storyboard
        </p>
        <h1
          id="step3-heading"
          className="text-3xl sm:text-4xl font-bold text-[#1D2733] tracking-tight"
        >
          Review, edit, or regenerate any beat
        </h1>
        <p className="text-base sm:text-lg text-[#4B5B6B] leading-relaxed">
          Your exact expressions are highlighted below. Keep the total spoken script around 60–70 words for a natural 30-second pace.
        </p>
      </div>

      {/* Summary strip: Word Count + Expression Checklist */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {inWordRange ? (
              <CheckCircle2 className="w-5 h-5 text-[#216E50] shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0" />
            )}
            <span className="text-base font-semibold text-[#1D2733] tabular-nums">
              Total Spoken Words: {totalWords}
            </span>
            <span className="text-sm text-[#4B5B6B]">
              · Target {TARGET_WORD_MIN}–{TARGET_WORD_MAX} words
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold tabular-nums ${
                coverage.allCovered ? 'text-[#216E50]' : 'text-[#B45309]'
              }`}
            >
              {coverage.covered.length}/{activePhrases.length} exact expressions used
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm pt-2 border-t border-[#EDF1F5]">
          {activePhrases.map((phrase) => {
            const isUsed = coverage.covered.includes(phrase);
            return (
              <span
                key={phrase}
                className={`inline-flex items-center gap-1.5 ${
                  isUsed ? 'text-[#1D2733] font-medium' : 'text-[#B45309] font-medium'
                }`}
              >
                <span aria-hidden="true">{isUsed ? '✓' : '○'}</span>
                <span>“{phrase}”</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 4 Beat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {beats.map((beat, idx) => {
          const isEditing = editingBeatId === beat.id;
          const isRegenerating = regeneratingBeatId === beat.id;
          const beatWords = countBeatWords(beat);

          return (
            <article
              key={beat.id}
              data-testid={`beat-card-${beat.id}`}
              className="bg-white rounded-2xl border border-[#DCE3EC] p-5 sm:p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EDF1F5]">
                  <div>
                    <div className="text-sm font-medium text-[#2B5B84] tabular-nums">
                      Beat {idx + 1} · {beat.timeRange} · {beatWords} words
                    </div>
                    <h2 className="text-xl font-bold text-[#1D2733] mt-0.5">
                      {beat.label}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingBeatId(isEditing ? null : beat.id)
                      }
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D4DCE6] bg-[#F8FAFC] hover:bg-[#EDF1F5] text-sm font-medium text-[#1D2733] flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      {isEditing ? 'Done' : 'Edit'}
                    </button>

                    <button
                      type="button"
                      disabled={isRegenerating || regeneratingBeatId !== null}
                      onClick={() => onRegenerateBeat(beat.id)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] disabled:opacity-60 text-sm font-medium text-[#2B5B84] flex items-center gap-1.5 transition-colors"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Regenerate
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`scene-${beat.id}`}
                        className="block text-sm font-semibold text-[#334155]"
                      >
                        Scene description
                      </label>
                      <textarea
                        id={`scene-${beat.id}`}
                        rows={2}
                        value={beat.sceneDescription}
                        onChange={(e) =>
                          onUpdateBeat(beat.id, { sceneDescription: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-base text-[#1D2733] focus:outline-none focus:border-[#2B5B84]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`lines-${beat.id}`}
                        className="block text-sm font-semibold text-[#334155]"
                      >
                        English lines (prefix with A: or B:)
                      </label>
                      <textarea
                        id={`lines-${beat.id}`}
                        rows={3}
                        value={formatDialogueLines(beat.lines)}
                        onChange={(e) => {
                          const parsed = parseDialogueLines(e.target.value);
                          onUpdateBeat(beat.id, {
                            lines: parsed,
                            subtitles: parsed.map((l) => l.text).join(' ').trim(),
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-base text-[#1D2733] focus:outline-none focus:border-[#2B5B84]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`sub-${beat.id}`}
                        className="block text-sm font-semibold text-[#334155]"
                      >
                        Subtitles
                      </label>
                      <textarea
                        id={`sub-${beat.id}`}
                        rows={2}
                        value={beat.subtitles}
                        onChange={(e) =>
                          onUpdateBeat(beat.id, { subtitles: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-base text-[#1D2733] focus:outline-none focus:border-[#2B5B84]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-[#64748B] mb-1">
                        Scene
                      </div>
                      <p className="text-base text-[#334155] leading-relaxed">
                        {beat.sceneDescription}
                      </p>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#64748B] mb-1.5">
                        English lines
                      </div>
                      <div className="space-y-2">
                        {beat.lines.map((line, lIdx) => (
                          <p
                            key={lIdx}
                            className="text-base sm:text-lg text-[#1D2733] leading-relaxed"
                          >
                            <span className="font-bold text-[#2B5B84] mr-2">
                              {line.speaker}:
                            </span>
                            <HighlightedText
                              text={line.text}
                              phrases={activePhrases}
                            />
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#F6F7F9] p-3.5 border border-[#E6ECF2]">
                      <div className="text-sm font-semibold text-[#64748B] mb-1">
                        Subtitle text
                      </div>
                      <p className="text-base font-medium text-[#1D2733] leading-relaxed">
                        <HighlightedText
                          text={beat.subtitles}
                          phrases={activePhrases}
                        />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-base font-medium text-[#991B1B]"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[52px] px-6 py-3 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] text-base font-medium text-[#1D2733] transition-colors"
        >
          Back to Scene
        </button>

        <button
          type="button"
          disabled={isPreparingVideo}
          onClick={onCreateVideo}
          className="min-h-[54px] px-8 py-3.5 rounded-xl bg-[#2B5B84] hover:bg-[#1F4566] disabled:opacity-70 text-white text-lg font-semibold flex items-center justify-center gap-2.5 transition-colors"
        >
          {isPreparingVideo ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating English Voice & Clips...
            </>
          ) : (
            'Create 30-Second Video'
          )}
        </button>
      </div>
    </section>
  );
}
