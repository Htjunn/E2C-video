/**
 * Generates a calm, warm, 100% original non-copyrighted background music WAV buffer
 * (24kHz, 16-bit mono PCM) using soft Rhodes-like electric piano chords and gentle
 * marimba-style arpeggio plucks.
 */
export function generateCalmBgmWavBuffer(durationSec: number): Buffer {
  const sampleRate = 24000;
  const totalSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const samples = new Float32Array(totalSamples);

  // Calm Cmaj7 -> Am7 -> Fmaj7 -> G6 progression (2 seconds per chord = 8s loop)
  const chordProgression: number[][] = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7 (C4, E4, G4, B4)
    [220.0, 261.63, 329.63, 392.0],  // Am7   (A3, C4, E4, G4)
    [174.61, 220.0, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
    [196.0, 246.94, 293.66, 329.63], // G6    (G3, B3, D4, E4)
  ];

  const melodyNotes = [
    523.25, 659.25, 587.33, 493.88, // C5 E5 D5 B4
    440.0, 523.25, 659.25, 523.25,  // A4 C5 E5 C5
    349.23, 440.0, 523.25, 659.25,  // F4 A4 C5 E5
    392.0, 493.88, 587.33, 659.25,  // G4 B4 D5 E5
  ];

  const chordLenSec = 2.0;
  const pluckLenSec = 0.5;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / chordLenSec) % chordProgression.length;
    const localChordT = t % chordLenSec;
    const chord = chordProgression[chordIdx];

    // Warm electric-piano pad envelope
    const padAttack = Math.min(1, localChordT / 0.12);
    const padDecay = Math.exp(-localChordT * 0.85);
    const padEnv = padAttack * (0.35 + 0.65 * padDecay);

    let padSample = 0;
    for (let n = 0; n < chord.length; n++) {
      const f = chord[n];
      padSample += Math.sin(2 * Math.PI * f * t) * 0.22;
      padSample += Math.sin(2 * Math.PI * (f * 2) * t) * 0.04;
    }

    // Soft marimba-style top arpeggio note every 0.5s
    const pluckIdx = Math.floor(t / pluckLenSec) % melodyNotes.length;
    const localPluckT = t % pluckLenSec;
    const pluckFreq = melodyNotes[pluckIdx];
    const pluckEnv =
      Math.min(1, localPluckT / 0.015) * Math.exp(-localPluckT * 6.5);
    const pluckSample =
      (Math.sin(2 * Math.PI * pluckFreq * t) * 0.85 +
        Math.sin(2 * Math.PI * pluckFreq * 2 * t) * 0.15) *
      pluckEnv *
      0.26;

    // Gentle global fade-in (0.8s) and fade-out (1.5s)
    const fadeIn = Math.min(1, t / 0.8);
    const fadeOut = Math.min(1, Math.max(0, (durationSec - t) / 1.5));

    samples[i] = (padSample * padEnv * 0.55 + pluckSample) * fadeIn * fadeOut;
  }

  // Encode 16-bit PCM WAV buffer (44-byte RIFF header)
  const dataBytes = totalSamples * 2;
  const wav = Buffer.alloc(44 + dataBytes);

  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); // PCM chunk size
  wav.writeUInt16LE(1, 20);  // PCM format
  wav.writeUInt16LE(1, 22);  // Mono
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  wav.writeUInt16LE(2, 32);  // Block align
  wav.writeUInt16LE(16, 34); // Bits per sample
  wav.write('data', 36);
  wav.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < totalSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    wav.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return wav;
}
