import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { renderVideoFrame } from '../canvas/beatRenderer';
import { STYLE_OPTIONS } from '../data/presets';
import type {
  BeatAudioClip,
  SceneConfig,
  StoryboardBeat,
} from '../types/e2c';
import { SequenceAudioController } from '../utils/audioPlayer';
import { CalmBgmController } from '../utils/bgmPlayer';
import { buildAllSubtitleCues, getBeatAtTime } from '../utils/scriptUtils';

interface Step4VideoProps {
  scene: SceneConfig;
  beats: StoryboardBeat[];
  audioClips: BeatAudioClip[];
  isGeneratingVoice: boolean;
  voiceError: string | null;
  onRetryVoice: () => void;
  onBack: () => void;
  onNextFinal: () => void;
}

export function Step4Video({
  scene,
  beats,
  audioClips,
  isGeneratingVoice,
  voiceError,
  onRetryVoice,
  onBack,
  onNextFinal,
}: Step4VideoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<SequenceAudioController | null>(null);
  const bgmRef = useRef<CalmBgmController | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [stopAtSec, setStopAtSec] = useState<number | null>(null);

  const [browserVoiceEnabled, setBrowserVoiceEnabled] = useState(false);

  const cues = useMemo(() => buildAllSubtitleCues(beats), [beats]);
  const styleLabel =
    STYLE_OPTIONS.find((s) => s.id === scene.style)?.label ?? scene.style;
  const activeBeat = getBeatAtTime(beats, Math.min(29.99, currentTime));

  // Initialize BGM Controller
  useEffect(() => {
    const bgm = new CalmBgmController();
    bgmRef.current = bgm;
    return () => {
      bgm.dispose();
      bgmRef.current = null;
    };
  }, []);

  // Initialize Audio Controller when clips change
  useEffect(() => {
    const ctrl = new SequenceAudioController();
    ctrl.loadClips(audioClips);
    ctrl.setMuted(muted);
    ctrl.setBrowserSpeechFallback(browserVoiceEnabled);
    audioRef.current = ctrl;
    return () => {
      ctrl.stopAll();
    };
  }, [audioClips]);

  useEffect(() => {
    audioRef.current?.setBrowserSpeechFallback(browserVoiceEnabled);
  }, [browserVoiceEnabled]);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
    bgmRef.current?.setMuted(muted || !bgmEnabled);
  }, [muted, bgmEnabled]);

  // Draw canvas frame whenever currentTime, scene, or beats change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderVideoFrame(ctx, canvas.width, canvas.height, currentTime, scene, beats, cues, [], false);
  }, [currentTime, scene, beats, cues]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTsRef.current = null;
      audioRef.current?.pauseAll();
      bgmRef.current?.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (bgmEnabled && !muted) {
      bgmRef.current?.start();
    }

    const tick = (now: number) => {
      if (lastFrameTsRef.current === null) {
        lastFrameTsRef.current = now;
      }
      const dt = Math.min(0.1, (now - lastFrameTsRef.current) / 1000);
      lastFrameTsRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        const limit = stopAtSec ?? 30;
        if (next >= limit) {
          setIsPlaying(false);
          setStopAtSec(null);
          audioRef.current?.stopAll();
          bgmRef.current?.stop();
          return stopAtSec ? stopAtSec - 0.05 : 30;
        }
        audioRef.current?.syncToTime(next, beats, true);
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, stopAtSec, beats, bgmEnabled, muted]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setStopAtSec(null);
    if (currentTime >= 29.9) {
      setCurrentTime(0);
    }
    setIsPlaying(true);
  };

  const handleRestart = () => {
    setStopAtSec(null);
    setCurrentTime(0);
    audioRef.current?.stopAll();
    setIsPlaying(true);
  };

  const handlePlayBeatClip = (beat: StoryboardBeat) => {
    setCurrentTime(beat.startSec);
    setStopAtSec(beat.endSec);
    audioRef.current?.stopAll();
    setIsPlaying(true);
  };

  return (
    <section aria-labelledby="step4-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-sm font-medium text-[#4B5B6B]">
            Step 4 of 5 · 4 Beat Clips & 30-Second Playback
          </p>
          <h1
            id="step4-heading"
            className="text-3xl sm:text-4xl font-bold text-[#1D2733] tracking-tight"
          >
            Preview your 30-second animated clip
          </h1>
          <p className="text-base text-[#4B5B6B]">
            Style: {styleLabel} · Place: {scene.place} · Voice + burned-in 2-line English subtitles
          </p>
        </div>

        {/* Character Outfit & Palette Lock Summary */}
        <div className="bg-white rounded-xl border border-[#DCE3EC] px-4 py-2.5 flex items-center gap-4 text-sm shrink-0">
          {scene.characters.map((c) => (
            <div key={c.id} className="flex items-center gap-2 whitespace-nowrap">
              <span
                className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                style={{ backgroundColor: c.outfitColor }}
                aria-hidden="true"
              />
              <span className="font-medium text-[#1D2733]">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main 16:9 Video Stage */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#DCE3EC] p-3 sm:p-5 space-y-4">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1D2733]">
          <canvas
            ref={canvasRef}
            width={854}
            height={480}
            data-testid="video-stage-canvas"
            className="w-full h-full block"
          />

          {isGeneratingVoice && (
            <div className="absolute inset-0 bg-[#1D2733]/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-white p-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-lg font-semibold">
                Generating natural English voices for all 4 beats...
              </p>
            </div>
          )}
        </div>

        {/* Video Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#1D2733] tabular-nums w-12 shrink-0">
              {currentTime.toFixed(1)}s
            </span>
            <input
              type="range"
              aria-label="Video timeline"
              min={0}
              max={30}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const nextT = Number(e.target.value);
                setStopAtSec(null);
                setCurrentTime(nextT);
                audioRef.current?.stopAll();
              }}
              className="w-full accent-[#2B5B84] h-2 cursor-pointer"
            />
            <span className="text-sm font-medium text-[#4B5B6B] tabular-nums w-12 text-right shrink-0">
              30.0s
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={isGeneratingVoice}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#2B5B84] hover:bg-[#1F4566] disabled:opacity-60 text-white text-base font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Play 30s Film
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#D4DCE6] bg-[#F8FAFC] hover:bg-[#EDF1F5] text-base font-medium text-[#1D2733] whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>

              <button
                type="button"
                aria-label={bgmEnabled ? 'Turn background music off' : 'Turn background music on'}
                onClick={() => setBgmEnabled((v) => !v)}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors ${
                  bgmEnabled
                    ? 'border-[#2B5B84] bg-[#EFF5FA] text-[#2B5B84]'
                    : 'border-[#D4DCE6] bg-white text-[#4B5B6B]'
                }`}
              >
                <Music className="w-4 h-4" />
                {bgmEnabled ? 'Music On' : 'Music Off'}
              </button>

              <button
                type="button"
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                onClick={() => setMuted((m) => !m)}
                className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] text-[#1D2733] shrink-0 flex items-center justify-center transition-colors"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            <div className="text-sm font-medium text-[#4B5B6B] whitespace-nowrap">
              {activeBeat ? `Beat: ${activeBeat.label} (${activeBeat.timeRange})` : ''}
            </div>
          </div>
        </div>
      </div>

      {voiceError && (
        <div
          role="alert"
          className="max-w-4xl mx-auto rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-base text-[#92400E]"
        >
          <span className="leading-snug">{voiceError}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setBrowserVoiceEnabled(true)}
              className={`min-h-[44px] px-4 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap ${
                browserVoiceEnabled
                  ? 'bg-[#2B5B84] border-[#2B5B84] text-white'
                  : 'bg-white border-[#F59E0B] text-[#92400E]'
              }`}
            >
              {browserVoiceEnabled ? 'Browser Voice Active' : 'Use Browser Voice'}
            </button>
            <button
              type="button"
              onClick={onRetryVoice}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-white border border-[#D4DCE6] text-sm font-semibold text-[#1D2733] whitespace-nowrap"
            >
              Retry Gemini Voice
            </button>
          </div>
        </div>
      )}

      {/* 4 Individual Beat Clip Selectors */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[#1D2733]">
          Play Individual Beat Clips
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {beats.map((beat, idx) => {
            const isCurrent = activeBeat?.id === beat.id;
            const hasAudio = audioClips.some((c) => c.beatId === beat.id && c.audioBase64);
            return (
              <button
                key={beat.id}
                type="button"
                onClick={() => handlePlayBeatClip(beat)}
                className={`text-left rounded-xl border p-4 transition-colors space-y-2 min-h-[104px] ${
                  isCurrent
                    ? 'border-[#2B5B84] bg-[#EFF5FA]'
                    : 'border-[#DCE3EC] bg-white hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-[#2B5B84] tabular-nums">
                  <span>
                    {idx + 1}. {beat.label} · {beat.timeRange}
                  </span>
                  <Play className="w-4 h-4 shrink-0" />
                </div>
                <p className="text-sm text-[#334155] line-clamp-2 leading-snug">
                  {beat.subtitles}
                </p>
                <div className="text-xs text-[#64748B]">
                  {hasAudio ? 'English voice ready' : 'Visual clip ready'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[52px] px-6 py-3 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] text-base font-medium text-[#1D2733] transition-colors"
        >
          Back to Storyboard
        </button>

        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            audioRef.current?.stopAll();
            onNextFinal();
          }}
          className="min-h-[54px] px-8 py-3.5 rounded-xl bg-[#2B5B84] hover:bg-[#1F4566] text-white text-lg font-semibold transition-colors"
        >
          Finish & Export Video
        </button>
      </div>
    </section>
  );
}
