import { useEffect, useState } from 'react';
import { Step1Expressions } from './components/Step1Expressions';
import { Step2Scene } from './components/Step2Scene';
import { Step3Storyboard } from './components/Step3Storyboard';
import { Step4Video } from './components/Step4Video';
import { Step5Final } from './components/Step5Final';
import { TopNav } from './components/TopNav';
import {
  DEFAULT_SCENE,
  EXAMPLE_BEATS,
  EXAMPLE_EXPRESSIONS,
} from './data/presets';
import type {
  AppStep,
  BeatAudioClip,
  BeatId,
  CharacterLook,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
} from './types/e2c';
import { MIN_EXPRESSIONS, validateExpressionCount } from './utils/scriptUtils';

export default function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<AppStep>(1);

  const [expressions, setExpressions] = useState<ExpressionItem[]>(EXAMPLE_EXPRESSIONS);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE);
  const [beats, setBeats] = useState<StoryboardBeat[]>(EXAMPLE_BEATS);

  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);

  const [regeneratingBeatId, setRegeneratingBeatId] = useState<BeatId | null>(null);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);

  const [audioClips, setAudioClips] = useState<BeatAudioClip[]>([]);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setCurrentStep(3);
      setMaxReachedStep(5);
    }
  }, []);

  const goToStep = (step: AppStep) => {
    setCurrentStep(step);
    setMaxReachedStep((prev) => (step > prev ? step : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeExpression = (
    id: string,
    field: keyof ExpressionItem,
    value: string
  ) => {
    setStep1Error(null);
    setExpressions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddExpression = () => {
    setExpressions((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}-${prev.length + 1}`,
        phrase: '',
        movie: '',
        meaningKo: '',
      },
    ]);
  };

  const handleRemoveExpression = (id: string) => {
    if (expressions.length <= MIN_EXPRESSIONS) return;
    setExpressions((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    setStep1Error(null);
    setExpressions(
      Array.from({ length: MIN_EXPRESSIONS }, (_, i) => ({
        id: `exp-blank-${i + 1}`,
        phrase: '',
        movie: '',
        meaningKo: '',
      }))
    );
  };

  const handleLoadExample = () => {
    setStep1Error(null);
    setSceneError(null);
    setStoryboardError(null);
    setVoiceError(null);
    setExpressions(EXAMPLE_EXPRESSIONS);
    setScene(DEFAULT_SCENE);
    setBeats(EXAMPLE_BEATS);
    setAudioClips([]);
  };

  const handleStep1Next = () => {
    const validation = validateExpressionCount(expressions, MIN_EXPRESSIONS);
    if (!validation.valid) {
      setStep1Error(validation.message);
      return;
    }
    setStep1Error(null);
    goToStep(2);
  };

  const handleUpdateScene = (patch: Partial<SceneConfig>) => {
    setScene((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateCharacter = (index: 0 | 1, patch: Partial<CharacterLook>) => {
    setScene((prev) => {
      const nextChars: [CharacterLook, CharacterLook] = [
        index === 0 ? { ...prev.characters[0], ...patch } : prev.characters[0],
        index === 1 ? { ...prev.characters[1], ...patch } : prev.characters[1],
      ];
      return { ...prev, characters: nextChars };
    });
  };

  const handleGenerateStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    setSceneError(null);

    try {
      const response = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressions: expressions.filter((e) => e.phrase.trim().length > 0),
          scene,
        }),
      });
      const data = (await response.json()) as {
        beats?: StoryboardBeat[];
        error?: string;
      };
      if (!response.ok || !data.beats) {
        throw new Error(data.error || 'Failed to generate storyboard.');
      }
      setBeats(data.beats);
      setAudioClips([]);
      goToStep(3);
    } catch (err) {
      setSceneError(
        err instanceof Error ? err.message : 'Unable to generate storyboard.'
      );
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleUpdateBeat = (beatId: BeatId, updated: Partial<StoryboardBeat>) => {
    setBeats((prev) =>
      prev.map((beat) => (beat.id === beatId ? { ...beat, ...updated } : beat))
    );
    // Invalidate stale TTS audio for edited script
    setAudioClips([]);
  };

  const handleRegenerateBeat = async (beatId: BeatId) => {
    setRegeneratingBeatId(beatId);
    setStoryboardError(null);

    try {
      const response = await fetch('/api/regenerate-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatId,
          currentBeats: beats,
          expressions: expressions.filter((e) => e.phrase.trim().length > 0),
          scene,
        }),
      });
      const data = (await response.json()) as {
        beat?: StoryboardBeat;
        error?: string;
      };
      if (!response.ok || !data.beat) {
        throw new Error(data.error || 'Failed to regenerate beat.');
      }
      setBeats((prev) =>
        prev.map((b) => (b.id === beatId ? data.beat! : b))
      );
      setAudioClips([]);
    } catch (err) {
      setStoryboardError(
        err instanceof Error ? err.message : 'Unable to regenerate beat.'
      );
    } finally {
      setRegeneratingBeatId(null);
    }
  };

  const generateVoiceForAllBeats = async () => {
    setIsGeneratingVoice(true);
    setVoiceError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beats, scene }),
      });
      const data = (await response.json()) as {
        audioClips?: BeatAudioClip[];
        error?: string;
      };
      if (!response.ok || !data.audioClips) {
        throw new Error(data.error || 'Failed to generate English voice.');
      }
      setAudioClips(data.audioClips);
    } catch (err) {
      setVoiceError(
        err instanceof Error
          ? err.message
          : 'Could not generate English voice audio.'
      );
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleCreateVideo = async () => {
    goToStep(4);
    if (audioClips.length !== beats.length) {
      await generateVoiceForAllBeats();
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#1D2733] flex flex-col">
      <TopNav
        currentStep={currentStep}
        maxReachedStep={maxReachedStep}
        onSelectStep={goToStep}
        onResetToExample={() => {
          handleLoadExample();
          setCurrentStep(1);
          setMaxReachedStep(1);
        }}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {currentStep === 1 && (
          <Step1Expressions
            expressions={expressions}
            validationError={step1Error}
            onChangeExpression={handleChangeExpression}
            onAddExpression={handleAddExpression}
            onRemoveExpression={handleRemoveExpression}
            onClearAll={handleClearAll}
            onLoadExample={handleLoadExample}
            onNext={handleStep1Next}
          />
        )}

        {currentStep === 2 && (
          <Step2Scene
            scene={scene}
            isGenerating={isGeneratingStoryboard}
            errorMessage={sceneError}
            onUpdateScene={handleUpdateScene}
            onUpdateCharacter={handleUpdateCharacter}
            onBack={() => goToStep(1)}
            onGenerateStoryboard={handleGenerateStoryboard}
          />
        )}

        {currentStep === 3 && (
          <Step3Storyboard
            beats={beats}
            expressions={expressions}
            regeneratingBeatId={regeneratingBeatId}
            isPreparingVideo={isGeneratingVoice}
            errorMessage={storyboardError}
            onUpdateBeat={handleUpdateBeat}
            onRegenerateBeat={handleRegenerateBeat}
            onBack={() => goToStep(2)}
            onCreateVideo={handleCreateVideo}
          />
        )}

        {currentStep === 4 && (
          <Step4Video
            expressions={expressions}
            scene={scene}
            beats={beats}
            audioClips={audioClips}
            isGeneratingVoice={isGeneratingVoice}
            voiceError={voiceError}
            onRetryVoice={generateVoiceForAllBeats}
            onBack={() => goToStep(3)}
            onNextFinal={() => goToStep(5)}
          />
        )}

        {currentStep === 5 && (
          <Step5Final
            expressions={expressions}
            scene={scene}
            beats={beats}
            audioClips={audioClips}
            onBackToVideo={() => goToStep(4)}
            onStartNew={() => {
              handleClearAll();
              setCurrentStep(1);
              setMaxReachedStep(1);
            }}
          />
        )}
      </main>
    </div>
  );
}
