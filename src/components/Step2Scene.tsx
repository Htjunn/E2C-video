import { Check, Loader2 } from 'lucide-react';
import {
  OUTFIT_SWATCHES,
  PLACE_PRESETS,
  STYLE_OPTIONS,
} from '../data/presets';
import type { CharacterLook, SceneConfig, StyleId } from '../types/e2c';

interface Step2SceneProps {
  scene: SceneConfig;
  isGenerating: boolean;
  errorMessage: string | null;
  onUpdateScene: (patch: Partial<SceneConfig>) => void;
  onUpdateCharacter: (index: 0 | 1, patch: Partial<CharacterLook>) => void;
  onBack: () => void;
  onGenerateStoryboard: () => void;
}

export function Step2Scene({
  scene,
  isGenerating,
  errorMessage,
  onUpdateScene,
  onUpdateCharacter,
  onBack,
  onGenerateStoryboard,
}: Step2SceneProps) {
  return (
    <section aria-labelledby="step2-heading" className="space-y-6">
      <div className="space-y-2 max-w-2xl">
        <p className="text-sm font-medium text-[#4B5B6B]">
          Step 2 of 5 · Scene & Visual Style
        </p>
        <h1
          id="step2-heading"
          className="text-3xl sm:text-4xl font-bold text-[#1D2733] tracking-tight"
        >
          Set your place, characters, and film style
        </h1>
        <p className="text-base sm:text-lg text-[#4B5B6B] leading-relaxed">
          Your characters, outfits, and color palette stay locked across all 4 beats of the 30-second clip.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Place, Situation & Characters */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="scene-place"
                className="block text-base font-semibold text-[#1D2733]"
              >
                Place
              </label>
              <div className="flex flex-wrap gap-2 pb-1">
                {PLACE_PRESETS.map((preset) => {
                  const active = scene.place === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        onUpdateScene({
                          place: preset.label,
                          placeTheme: preset.theme,
                          propType: preset.propType,
                        })
                      }
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-[#2B5B84] text-white'
                          : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <input
                id="scene-place"
                type="text"
                value={scene.place}
                onChange={(e) => onUpdateScene({ place: e.target.value })}
                placeholder="e.g. University Robotics Lab"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-base text-[#1D2733] focus:outline-none focus:border-[#2B5B84] focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="scene-situation"
                className="block text-base font-semibold text-[#1D2733]"
              >
                Situation
              </label>
              <textarea
                id="scene-situation"
                rows={3}
                value={scene.situation}
                onChange={(e) => onUpdateScene({ situation: e.target.value })}
                placeholder="Describe what happens in the 30-second scene..."
                className="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-base text-[#1D2733] leading-relaxed focus:outline-none focus:border-[#2B5B84] focus:bg-white"
              />
            </div>
          </div>

          {/* Characters with locked outfit colors */}
          <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1D2733]">
                Characters & Consistent Outfits
              </h2>
              <p className="text-sm text-[#4B5B6B] mt-0.5">
                Original fictional students · Outfits and colors stay identical in every beat
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scene.characters.map((char, idx) => {
                const charIdx = idx as 0 | 1;
                return (
                  <div
                    key={char.id}
                    className="rounded-xl bg-[#F8FAFC] border border-[#E3E9F0] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#2B5B84]">
                        Character {char.id}
                      </span>
                      <span
                        className="w-5 h-5 rounded-md border border-black/15"
                        style={{ backgroundColor: char.outfitColor }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`char-name-${char.id}`}
                        className="block text-sm font-medium text-[#334155]"
                      >
                        Name
                      </label>
                      <input
                        id={`char-name-${char.id}`}
                        type="text"
                        value={char.name}
                        onChange={(e) =>
                          onUpdateCharacter(charIdx, { name: e.target.value })
                        }
                        className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-base text-[#1D2733]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`char-role-${char.id}`}
                        className="block text-sm font-medium text-[#334155]"
                      >
                        Role
                      </label>
                      <input
                        id={`char-role-${char.id}`}
                        type="text"
                        value={char.role}
                        onChange={(e) =>
                          onUpdateCharacter(charIdx, { role: e.target.value })
                        }
                        className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-base text-[#1D2733]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-sm font-medium text-[#334155]">
                        Outfit Color
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {OUTFIT_SWATCHES.map((swatch) => {
                          const selected = char.outfitColor === swatch.value;
                          return (
                            <button
                              key={swatch.value}
                              type="button"
                              aria-label={`Set ${char.name} outfit to ${swatch.label}`}
                              aria-pressed={selected}
                              onClick={() =>
                                onUpdateCharacter(charIdx, { outfitColor: swatch.value })
                              }
                              className={`min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center border-2 transition-transform ${
                                selected
                                  ? 'border-[#1D2733] scale-105'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: swatch.value }}
                            >
                              {selected && <Check className="w-4 h-4 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Style Menu */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE3EC] p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1D2733]">
              Visual Style Menu
            </h2>
            <p className="text-sm text-[#4B5B6B] mt-0.5">
              Choose one consistent visual style for all 4 clips
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            {STYLE_OPTIONS.map((opt) => {
              const selected = scene.style === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onUpdateScene({ style: opt.id as StyleId })}
                  className={`w-full text-left rounded-xl border-2 overflow-hidden transition-all focus-visible:outline-2 focus-visible:outline-[#2B5B84] ${
                    selected
                      ? 'border-[#2B5B84] bg-[#F2F7FB]'
                      : 'border-[#E2E8F0] bg-white hover:border-[#B6C3D1]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 p-2.5">
                    <div className="w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-[#EDF1F5] shrink-0">
                      <img
                        src={opt.imageUrl}
                        alt={`${opt.label} style preview`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-[#1D2733]">
                          {opt.label}
                        </span>
                        {selected && (
                          <span className="text-xs font-semibold text-[#2B5B84]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#4B5B6B] leading-snug">
                        {opt.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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
          Back to Expressions
        </button>

        <button
          type="button"
          disabled={isGenerating}
          onClick={onGenerateStoryboard}
          className="min-h-[54px] px-8 py-3.5 rounded-xl bg-[#2B5B84] hover:bg-[#1F4566] disabled:opacity-70 text-white text-lg font-semibold flex items-center justify-center gap-2.5 transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Writing 4-Beat Storyboard...
            </>
          ) : (
            'Generate 4-Beat Storyboard'
          )}
        </button>
      </div>
    </section>
  );
}
