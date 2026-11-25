/**
 * Plays gentle, calm, non-copyrighted procedural background music in the browser
 * synchronized with video playback state.
 */
export class CalmBgmController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timerId: number | null = null;
  private isPlaying = false;
  private muted = false;
  private stepIndex = 0;

  private readonly chords = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 329.63], // G6
  ];

  private readonly melody = [
    523.25, 659.25, 587.33, 493.88,
    440.0, 523.25, 659.25, 523.25,
    349.23, 440.0, 523.25, 659.25,
    392.0, 493.88, 587.33, 659.25,
  ];

  private ensureContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.08;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.08,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  private scheduleNote(
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    type: OscillatorType
  ) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private tickStep = () => {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Trigger warm chord every 4 steps (2.0s)
    if (this.stepIndex % 4 === 0) {
      const chordIdx = Math.floor(this.stepIndex / 4) % this.chords.length;
      const chord = this.chords[chordIdx];
      for (const freq of chord) {
        this.scheduleNote(freq, now, 1.9, 0.22, 'sine');
      }
    }

    // Trigger soft marimba pluck every 0.5s
    const melFreq = this.melody[this.stepIndex % this.melody.length];
    this.scheduleNote(melFreq, now, 0.45, 0.2, 'triangle');

    this.stepIndex += 1;
  };

  public start() {
    if (this.isPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.tickStep();
    this.timerId = window.setInterval(this.tickStep, 500);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.stepIndex = 0;
  }

  public dispose() {
    this.stop();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
