import type { AppStep } from '../types/e2c';

interface TopNavProps {
  currentStep: AppStep;
  maxReachedStep: AppStep;
  onSelectStep: (step: AppStep) => void;
  onResetToExample: () => void;
}

const STEPS: Array<{ step: AppStep; label: string }> = [
  { step: 1, label: 'Expressions' },
  { step: 2, label: 'Scene' },
  { step: 3, label: 'Storyboard' },
  { step: 4, label: 'Video' },
  { step: 5, label: 'Final' },
];

export function TopNav({
  currentStep,
  maxReachedStep,
  onSelectStep,
  onResetToExample,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-[#DCE3EC]">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-element Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectStep(1)}
          className="text-xl font-bold tracking-tight text-[#1D2733] font-display whitespace-nowrap shrink-0 min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#2B5B84]"
        >
          E2C
        </button>

        {/* Zone 2: Clean single-line navigation step links */}
        <nav aria-label="Creation steps" className="hidden md:flex items-center gap-6">
          {STEPS.map(({ step, label }) => {
            const isActive = step === currentStep;
            const isAvailable = step <= maxReachedStep;
            return (
              <button
                key={step}
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelectStep(step)}
                aria-current={isActive ? 'step' : undefined}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-2 border-b-2 transition-colors min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#2B5B84] ${
                  isActive
                    ? 'border-[#2B5B84] text-[#1D2733] font-semibold'
                    : isAvailable
                    ? 'border-transparent text-[#4B5B6B] hover:text-[#1D2733] hover:border-[#B6C3D1]'
                    : 'border-transparent text-[#98A4B3] cursor-not-allowed'
                }`}
              >
                <span className="tabular-nums mr-1.5">{step}.</span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Mobile compact step label */}
        <div className="md:hidden text-sm font-semibold text-[#334155] whitespace-nowrap truncate tabular-nums">
          Step {currentStep} of 5 · {STEPS[currentStep - 1]?.label}
        </div>

        {/* Zone 3: 1 primary utility action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onResetToExample}
            className="px-4 py-2 min-h-[40px] rounded-lg border border-[#D4DCE6] bg-[#F6F7F9] hover:bg-[#EAEFF5] text-sm font-medium text-[#1D2733] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[#2B5B84]"
          >
            Load Example
          </button>
        </div>
      </div>
    </header>
  );
}
