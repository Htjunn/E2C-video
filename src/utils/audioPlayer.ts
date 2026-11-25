import type { BeatAudioClip, BeatId, StoryboardBeat } from '../types/e2c';

export class SequenceAudioController {
  private audioElements: Map<BeatId, HTMLAudioElement> = new Map();
  private currentPlayingBeatId: BeatId | null = null;
  private muted = false;
  private useBrowserSpeechFallback = false;

  public loadClips(clips: BeatAudioClip[]) {
    this.stopAll();
    this.audioElements.clear();

    for (const clip of clips) {
      if (!clip.audioBase64) continue;
      const audio = new Audio(`data:${clip.mimeType || 'audio/wav'};base64,${clip.audioBase64}`);
      audio.preload = 'auto';
      audio.muted = this.muted;
      this.audioElements.set(clip.beatId, audio);
    }
  }

  public setBrowserSpeechFallback(enabled: boolean) {
    this.useBrowserSpeechFallback = enabled;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    for (const audio of this.audioElements.values()) {
      audio.muted = muted;
    }
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private speakBeatWithBrowser(beat: StoryboardBeat) {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));

    for (const line of beat.lines) {
      const utt = new SpeechSynthesisUtterance(line.text);
      utt.lang = 'en-US';
      utt.rate = 0.96;
      utt.pitch = line.speaker === 'A' ? 1.04 : 0.94;
      if (voices.length > 0) {
        utt.voice = line.speaker === 'A' ? voices[0] : voices[Math.min(1, voices.length - 1)];
      }
      window.speechSynthesis.speak(utt);
    }
  }

  public syncToTime(timeSec: number, beats: StoryboardBeat[], isPlaying: boolean) {
    if (!isPlaying) {
      this.pauseAll();
      return;
    }

    const activeBeat = beats.find((b) => timeSec >= b.startSec && timeSec < b.endSec);
    if (!activeBeat) {
      this.pauseAll();
      return;
    }

    if (this.currentPlayingBeatId !== activeBeat.id) {
      this.pauseAll();
      this.currentPlayingBeatId = activeBeat.id;
      const audio = this.audioElements.get(activeBeat.id);
      if (audio) {
        const localOffset = Math.max(0, timeSec - activeBeat.startSec);
        if (localOffset < (audio.duration || 6)) {
          try {
            audio.currentTime = localOffset;
            audio.play().catch(() => {});
          } catch {
            // Ignore autoplay lock until user gesture
          }
        }
      } else if (this.useBrowserSpeechFallback) {
        this.speakBeatWithBrowser(activeBeat);
      }
    }
  }

  public pauseAll() {
    for (const audio of this.audioElements.values()) {
      if (!audio.paused) {
        audio.pause();
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentPlayingBeatId = null;
  }

  public stopAll() {
    for (const audio of this.audioElements.values()) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // ignore if not loaded yet
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentPlayingBeatId = null;
  }
}
