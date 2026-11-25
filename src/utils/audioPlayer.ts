import type { BeatAudioClip, BeatId, StoryboardBeat } from '../types/e2c';

export class SequenceAudioController {
  private audioElements: Map<BeatId, HTMLAudioElement> = new Map();
  private currentPlayingBeatId: BeatId | null = null;
  private muted = false;
  private useBrowserSpeechFallback = true;
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterances: SpeechSynthesisUtterance[] = [];
  private pendingSpeakTimer: number | null = null;
  private keepAliveTimer: number | null = null;
  private speechToken = 0;
  private speechPrimed = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', this.handleVoicesChanged);
    }
  }

  private handleVoicesChanged = () => {
    this.refreshVoices();
  };

  private refreshVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loaded = window.speechSynthesis.getVoices();
    if (loaded.length > 0) {
      this.voices = loaded;
    }
  }

  private pickVoice(speaker: 'A' | 'B'): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.refreshVoices();
    }
    const enVoices = this.voices.filter((v) =>
      v.lang.toLowerCase().startsWith('en')
    );
    if (enVoices.length === 0) return null;

    if (speaker === 'A') {
      return (
        enVoices.find((v) => /google us english|daniel|alex|aaron|david|guy/i.test(v.name)) ??
        enVoices[0]
      );
    }
    return (
      enVoices.find(
        (v) =>
          v !== this.pickVoiceForComparison(enVoices) &&
          /samantha|karen|victoria|google uk english female|aria|zira|jenny/i.test(v.name)
      ) ??
      enVoices[Math.min(1, enVoices.length - 1)]
    );
  }

  private pickVoiceForComparison(enVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice {
    return (
      enVoices.find((v) => /google us english|daniel|alex|aaron|david|guy/i.test(v.name)) ??
      enVoices[0]
    );
  }

  public loadClips(clips: BeatAudioClip[]) {
    this.stopAll();
    this.audioElements.clear();

    for (const clip of clips) {
      if (!clip.audioBase64) continue;
      const audio = new Audio(
        `data:${clip.mimeType || 'audio/wav'};base64,${clip.audioBase64}`
      );
      audio.preload = 'auto';
      audio.muted = this.muted;
      this.audioElements.set(clip.beatId, audio);
    }
  }

  public setBrowserSpeechFallback(enabled: boolean) {
    this.useBrowserSpeechFallback = enabled;
    if (!enabled) {
      this.cancelBrowserSpeech();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    for (const audio of this.audioElements.values()) {
      audio.muted = muted;
    }
    if (muted) {
      this.cancelBrowserSpeech();
    }
  }

  /**
   * Must be called synchronously inside a user click handler so Chrome, Safari,
   * and embedded iframes unlock Web Speech API before rAF playback loops run.
   */
  public primeFromUserGesture() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const synth = window.speechSynthesis;
      this.refreshVoices();
      if (synth.paused) {
        synth.resume();
      }
      this.speechPrimed = true;
    } catch {
      // Ignore if speechSynthesis is restricted
    }
  }

  public speakTestSample() {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.primeFromUserGesture();
    this.cancelBrowserSpeech();
    const token = ++this.speechToken;
    this.pendingSpeakTimer = window.setTimeout(() => {
      if (token !== this.speechToken || this.muted) return;
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();
      const utt = new SpeechSynthesisUtterance('English voice is ready.');
      utt.lang = 'en-US';
      utt.rate = 1.0;
      utt.volume = 1;
      const voice = this.pickVoice('A');
      if (voice) utt.voice = voice;
      this.activeUtterances = [utt];
      utt.onend = () => {
        this.activeUtterances = [];
      };
      synth.speak(utt);
    }, 60);
  }

  private cancelBrowserSpeech() {
    this.speechToken += 1;
    if (this.pendingSpeakTimer !== null) {
      window.clearTimeout(this.pendingSpeakTimer);
      this.pendingSpeakTimer = null;
    }
    if (this.keepAliveTimer !== null) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    this.activeUtterances = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
    }
  }

  private speakBeatWithBrowser(beat: StoryboardBeat) {
    if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const wasBusy = synth.speaking || synth.pending;

    this.cancelBrowserSpeech();
    const token = ++this.speechToken;

    const enqueue = () => {
      if (token !== this.speechToken || this.muted) return;
      this.refreshVoices();
      if (synth.paused) synth.resume();

      const lines = beat.lines.filter((l) => l.text.trim().length > 0);
      if (lines.length === 0) return;

      const utterances: SpeechSynthesisUtterance[] = [];
      for (const line of lines) {
        const utt = new SpeechSynthesisUtterance(line.text);
        utt.lang = 'en-US';
        utt.rate = 0.98;
        utt.pitch = line.speaker === 'A' ? 1.04 : 0.94;
        utt.volume = 1;
        const chosenVoice = this.pickVoice(line.speaker);
        if (chosenVoice) {
          utt.voice = chosenVoice;
        }
        utt.onend = () => {
          this.activeUtterances = this.activeUtterances.filter((u) => u !== utt);
          if (this.activeUtterances.length === 0 && this.keepAliveTimer !== null) {
            window.clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
          }
        };
        utt.onerror = () => {
          this.activeUtterances = this.activeUtterances.filter((u) => u !== utt);
        };
        utterances.push(utt);
      }

      // Hold strong references so Chromium GC doesn't cancel utterances mid-speech
      this.activeUtterances = utterances;
      for (const utt of utterances) {
        synth.speak(utt);
      }

      this.keepAliveTimer = window.setInterval(() => {
        if (synth.speaking && synth.paused) {
          synth.resume();
        }
      }, 4000);
    };

    // Chrome drops utterances if speak() is called synchronously on the same tick as cancel()
    if (wasBusy) {
      this.pendingSpeakTimer = window.setTimeout(enqueue, 65);
    } else {
      enqueue();
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
      this.pauseAudioElementsOnly();
      this.currentPlayingBeatId = activeBeat.id;

      const audio = this.audioElements.get(activeBeat.id);
      if (audio) {
        this.cancelBrowserSpeech();
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

  private pauseAudioElementsOnly() {
    for (const audio of this.audioElements.values()) {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }

  public pauseAll() {
    this.pauseAudioElementsOnly();
    this.cancelBrowserSpeech();
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
    this.cancelBrowserSpeech();
    this.currentPlayingBeatId = null;
  }

  public dispose() {
    this.stopAll();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.removeEventListener?.('voiceschanged', this.handleVoicesChanged);
    }
  }
}
