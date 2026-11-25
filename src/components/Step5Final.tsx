import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { renderVideoFrame } from '../canvas/beatRenderer';
import type {
  BeatAudioClip,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
} from '../types/e2c';
import { SequenceAudioController } from '../utils/audioPlayer';
import { CalmBgmController } from '../utils/bgmPlayer';
import {
  buildAllSubtitleCues,
  STORY_DURATION_SEC,
  TOTAL_WITH_FINAL_SEC,
} from '../utils/scriptUtils';

interface Step5FinalProps {
  expressions: ExpressionItem[];
  scene: SceneConfig;
  beats: StoryboardBeat[];
  audioClips: BeatAudioClip[];
  onBackToVideo: () => void;
  onStartNew: () => void;
}

export function Step5Final({
  expressions,
  scene,
  beats,
  audioClips,
  onBackToVideo,
  onStartNew,
}: Step5FinalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<SequenceAudioController | null>(null);
  const bgmRef = useRef<CalmBgmController | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const cues = useMemo(() => buildAllSubtitleCues(beats), [beats]);
  const activeExpressions = expressions.filter((e) => e.phrase.trim().length > 0);

  useEffect(() => {
    const bgm = new CalmBgmController();
    bgmRef.current = bgm;
    return () => {
      bgm.dispose();
      bgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctrl = new SequenceAudioController();
    ctrl.loadClips(audioClips);
    ctrl.setMuted(muted);
    audioRef.current = ctrl;
    return () => ctrl.stopAll();
  }, [audioClips]);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
    bgmRef.current?.setMuted(muted || !bgmEnabled);
  }, [muted, bgmEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderVideoFrame(
      ctx,
      canvas.width,
      canvas.height,
      currentTime,
      scene,
      beats,
      cues,
      expressions,
      true
    );
  }, [currentTime, scene, beats, cues, expressions]);

  useEffect(() => {
    if (!isPlaying) {
      lastTsRef.current = null;
      audioRef.current?.pauseAll();
      bgmRef.current?.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (bgmEnabled && !muted) {
      bgmRef.current?.start();
    }

    const tick = (now: number) => {
      if (lastTsRef.current === null) lastTsRef.current = now;
      const dt = Math.min(0.1, (now - lastTsRef.current) / 1000);
      lastTsRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= TOTAL_WITH_FINAL_SEC) {
          setIsPlaying(false);
          audioRef.current?.stopAll();
          bgmRef.current?.stop();
          return TOTAL_WITH_FINAL_SEC;
        }
        if (next < STORY_DURATION_SEC) {
          audioRef.current?.syncToTime(next, beats, true);
        } else {
          audioRef.current?.pauseAll();
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, beats, bgmEnabled, muted]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (currentTime >= TOTAL_WITH_FINAL_SEC - 0.1) setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleDownloadMp4 = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    setExportSuccess(false);

    try {
      const fps = 10;
      const totalDurationSec = TOTAL_WITH_FINAL_SEC;
      const totalFrames = fps * totalDurationSec;

      const offscreen = document.createElement('canvas');
      offscreen.width = 640;
      offscreen.height = 360;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Could not initialize video export canvas.');

      const frames: string[] = [];
      const batchSize = 6;
      for (let i = 0; i < totalFrames; i++) {
        const t = i / fps;
        renderVideoFrame(
          ctx,
          offscreen.width,
          offscreen.height,
          t,
          scene,
          beats,
          cues,
          expressions,
          true
        );
        frames.push(offscreen.toDataURL('image/jpeg', 0.74));

        if ((i + 1) % batchSize === 0 || i === totalFrames - 1) {
          setExportProgress(Math.round(((i + 1) / totalFrames) * 85));
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setExportProgress(90);
      const audioBeats = beats.map((beat) => {
        const clip = audioClips.find((c) => c.beatId === beat.id);
        return {
          beatId: beat.id,
          startSec: beat.startSec,
          endSec: beat.endSec,
          audioBase64: clip?.audioBase64 || '',
        };
      });

      const response = await fetch('/api/export-mp4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          fps,
          totalDurationSec,
          audioBeats,
          includeBgm: bgmEnabled,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Failed to export video.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'e2c-30s-clip.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportProgress(100);
      setExportSuccess(true);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Unable to export MP4 video.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section aria-labelledby="step5-heading" className="space-y-6">
      <div className="space-y-2 max-w-2xl">
        <p className="text-sm font-medium text-[#4B5B6B]">
          Step 5 of 5 · Final 30-Second Film
        </p>
        <h1
          id="step5-heading"
          className="text-3xl sm:text-4xl font-bold text-[#1D2733] tracking-tight"
        >
          Your 30-second English movie clip is ready
        </h1>
        <p className="text-base sm:text-lg text-[#4B5B6B]">
          Play your finished short film, download it as an MP4 with burned-in English subtitles, and review the expressions you mastered.
        </p>
      </div>

      {/* Final Video Player */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#DCE3EC] p-3 sm:p-5 space-y-4">
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-[#1D2733]">
          <canvas
            ref={canvasRef}
            width={854}
            height={480}
            data-testid="final-video-canvas"
            className="w-full h-full block"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#1D2733] tabular-nums w-12 shrink-0">
            {currentTime.toFixed(1)}s
          </span>
          <input
            type="range"
            aria-label="Final video timeline"
            min={0}
            max={TOTAL_WITH_FINAL_SEC}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const nextT = Number(e.target.value);
              setCurrentTime(nextT);
              audioRef.current?.stopAll();
            }}
            className="w-full accent-[#2B5B84] h-2 cursor-pointer"
          />
          <span className="text-sm font-medium text-[#4B5B6B] tabular-nums w-12 text-right shrink-0">
            {TOTAL_WITH_FINAL_SEC.toFixed(1)}s
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="min-h-[50px] px-5 py-3 rounded-xl bg-[#2B5B84] hover:bg-[#1F4566] text-white text-base font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Play Final Video
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentTime(0);
                audioRef.current?.stopAll();
                setIsPlaying(true);
              }}
              className="min-h-[50px] px-4 py-3 rounded-xl border border-[#D4DCE6] bg-[#F8FAFC] hover:bg-[#EDF1F5] text-base font-medium text-[#1D2733] whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Replay
            </button>

            <button
              type="button"
              aria-label={bgmEnabled ? 'Turn background music off' : 'Turn background music on'}
              onClick={() => setBgmEnabled((v) => !v)}
              className={`min-h-[50px] px-4 py-2.5 rounded-xl border text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors ${
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
              className="min-h-[50px] min-w-[50px] px-3.5 py-2.5 rounded-xl border border-[#D4DCE6] bg-white hover:bg-[#EDF1F5] text-[#1D2733] shrink-0 flex items-center justify-center transition-colors"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadMp4}
            className="min-h-[50px] px-6 py-3 rounded-xl bg-[#1D2733] hover:bg-[#2E3C4D] disabled:opacity-70 text-white text-base font-semibold whitespace-nowrap shrink-0 flex items-center justify-center gap-2 transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Rendering MP4 ({exportProgress}%)
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download Video (.mp4)
              </>
            )}
          </button>
        </div>

        <p className="text-sm text-[#4B5B6B]">
          Includes the 30-second animated story plus the 4-second Final credit screen ({currentTime >= STORY_DURATION_SEC ? 'Showing Final screen' : 'Showing story beats'}).
        </p>

        {exportSuccess && (
          <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-base font-medium text-[#065F46] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Downloaded e2c-30s-clip.mp4 with English voice, background music, and the Final credit screen.
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-base font-medium text-[#991B1B]"
          >
            {exportError}
          </div>
        )}
      </div>

      {/* Expression Review List */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#1D2733]">
          Expressions Featured in This Clip
        </h2>
        <div className="divide-y divide-[#EDF1F5]">
          {activeExpressions.map((exp, idx) => (
            <div
              key={exp.id}
              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
            >
              <div className="text-base font-semibold text-[#1D2733]">
                <span className="text-[#2B5B84] tabular-nums mr-2">{idx + 1}.</span>
                {exp.phrase}
              </div>
              <div className="text-sm text-[#4B5B6B]">
                {[exp.movie, exp.meaningKo].filter(Boolean).join(' · ') || 'Everyday English'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Required Credit */}
      <footer className="rounded-2xl bg-[#EDF1F5] border border-[#DCE3EC] px-6 py-5 text-center space-y-3">
        <p className="text-base sm:text-lg font-semibold text-[#1D2733]">
          Made with Google AI Studio · Script by Seojun Hwang
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToVideo}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-base font-medium text-[#1D2733] transition-colors"
          >
            Back to Video Studio
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-base font-medium text-[#2B5B84] transition-colors"
          >
            Create Another Clip
          </button>
        </div>
      </footer>
    </section>
  );
}
