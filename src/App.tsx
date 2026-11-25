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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beats: EXAMPLE_BEATS,
            scene: DEFAULT_SCENE,
          }),
        });
        const data = await readApiJson<{ audioClips?: BeatAudioClip[] }>(response);
        if (!cancelled && Array.isArray(data.audioClips)) {
          setAudioClips(data.audioClips);
        }
      } catch {
        // Browser English Voice handles playback seamlessly without blocking UI
      }
    })();
    return () => {
      cancelled = true;
    };
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
        />
      </main>
    </div>
  );
}
