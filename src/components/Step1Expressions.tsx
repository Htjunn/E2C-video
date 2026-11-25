import { Plus, Trash2 } from 'lucide-react';
import type { ExpressionItem } from '../types/e2c';
import { MIN_EXPRESSIONS, validateExpressionCount } from '../utils/scriptUtils';

interface Step1ExpressionsProps {
  expressions: ExpressionItem[];
  validationError: string | null;
  onChangeExpression: (id: string, field: keyof ExpressionItem, value: string) => void;
  onAddExpression: () => void;
  onRemoveExpression: (id: string) => void;
  onClearAll: () => void;
  onLoadExample: () => void;
  onNext: () => void;
}

export function Step1Expressions({
  expressions,
  validationError,
  onChangeExpression,
  onAddExpression,
  onRemoveExpression,
  onClearAll,
  onLoadExample,
  onNext,
}: Step1ExpressionsProps) {
  const { filledCount } = validateExpressionCount(expressions, MIN_EXPRESSIONS);

  return (
    <section aria-labelledby="step1-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm font-medium text-[#4B5B6B]">
            Step 1 of 5 · Movie Expressions
          </p>
          <h1
            id="step1-heading"
            className="text-3xl sm:text-4xl font-bold text-[#1D2733] tracking-tight"
          >
            Enter 5+ English expressions from movies
          </h1>
          <p className="text-base sm:text-lg text-[#4B5B6B] leading-relaxed">
            Type the exact phrases you learned. Every expression will appear verbatim in your 30-second animated clip.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLoadExample}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] text-sm font-semibold text-[#1D2733] whitespace-nowrap transition-colors"
          >
            Reset to Sample 5
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] text-sm font-medium text-[#4B5B6B] whitespace-nowrap transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Expression list container */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#EDF1F5]">
          <span className="text-base font-semibold text-[#1D2733]">
            Your Expressions
          </span>
          <span
            className={`text-sm font-medium tabular-nums ${
              filledCount >= MIN_EXPRESSIONS ? 'text-[#216E50]' : 'text-[#9A5B13]'
            }`}
          >
            {filledCount} of {MIN_EXPRESSIONS}+ required filled
          </span>
        </div>

        <div className="space-y-4">
          {expressions.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-xl bg-[#F8FAFC] border border-[#E3E9F0] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#2B5B84] tabular-nums">
                  Expression {idx + 1}
                </span>
                {expressions.length > MIN_EXPRESSIONS && (
                  <button
                    type="button"
                    aria-label={`Remove expression ${idx + 1}`}
                    onClick={() => onRemoveExpression(item.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#B91C1C] hover:bg-[#FEE2E2]/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 space-y-1.5">
                  <label
                    htmlFor={`phrase-${item.id}`}
                    className="block text-sm font-medium text-[#334155]"
                  >
                    English expression
                  </label>
                  <input
                    id={`phrase-${item.id}`}
                    type="text"
                    value={item.phrase}
                    onChange={(e) => onChangeExpression(item.id, 'phrase', e.target.value)}
                    placeholder="e.g. Worth an absolute fortune."
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-base text-[#1D2733] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2B5B84] focus:ring-2 focus:ring-[#2B5B84]/20"
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label
                    htmlFor={`movie-${item.id}`}
                    className="block text-sm font-medium text-[#334155]"
                  >
                    Source movie
                  </label>
                  <input
                    id={`movie-${item.id}`}
                    type="text"
                    value={item.movie}
                    onChange={(e) => onChangeExpression(item.id, 'movie', e.target.value)}
                    placeholder="e.g. Notting Hill"
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-base text-[#1D2733] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2B5B84] focus:ring-2 focus:ring-[#2B5B84]/20"
                  />
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label
                    htmlFor={`meaning-${item.id}`}
                    className="block text-sm font-medium text-[#334155]"
                  >
                    Korean meaning (optional)
                  </label>
                  <input
                    id={`meaning-${item.id}`}
                    type="text"
                    value={item.meaningKo}
                    onChange={(e) => onChangeExpression(item.id, 'meaningKo', e.target.value)}
                    placeholder="예: 엄청난 가치가 있는"
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-base text-[#1D2733] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2B5B84] focus:ring-2 focus:ring-[#2B5B84]/20"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onAddExpression}
          className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl border border-dashed border-[#94A3B8] bg-[#F8FAFC] hover:bg-[#EDF1F5] text-base font-medium text-[#2B5B84] flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Another Expression
        </button>
      </div>

      {validationError && (
        <div
          role="alert"
          className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-base font-medium text-[#991B1B]"
        >
          {validationError}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto min-h-[54px] px-8 py-3.5 rounded-xl bg-[#2B5B84] hover:bg-[#1F4566] text-white text-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B5B84]"
        >
          Next: Scene & Style
        </button>
      </div>
    </section>
  );
}
