import { useEffect, useState } from 'react';
import { Step4Video } from './components/Step4Video';
import { TopNav } from './components/TopNav';
import {
  DEFAULT_SCENE,
  EXAMPLE_BEATS,
  EXAMPLE_EXPRESSIONS,
} from './data/presets';
import type { BeatAudioClip } from './types/e2c';
import { readApiJson } from './utils/apiClient';

export default function App() {
  const [audioClips, setAudioClips] = useState<BeatAudioClip[]>([]);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const generateVoiceForAllBeats = async () => {
    setIsGeneratingVoice(true);
    setVoiceError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beats: EXAMPLE_BEATS,
          scene: DEFAULT_SCENE,
        }),
      });
      const data = await readApiJson<{
        audioClips?: BeatAudioClip[];
        error?: string;
      }>(response);
      if (!data.audioClips) {
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

  useEffect(() => {
    generateVoiceForAllBeats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#1D2733] flex flex-col">
      <TopNav />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Step4Video
          expressions={EXAMPLE_EXPRESSIONS}
          scene={DEFAULT_SCENE}
          beats={EXAMPLE_BEATS}
          audioClips={audioClips}
          isGeneratingVoice={isGeneratingVoice}
          voiceError={voiceError}
          onRetryVoice={generateVoiceForAllBeats}
        />
      </main>
    </div>
  );
}
