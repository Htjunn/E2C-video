export type StyleId = '2d' | 'clay' | 'watercolor' | 'live-action';

export type BeatId = 'hook' | 'problem' | 'turn' | 'close';

export type AppStep = 1 | 2 | 3 | 4 | 5;

export interface ExpressionItem {
  id: string;
  phrase: string;
  movie: string;
  meaningKo: string;
}

export interface CharacterLook {
  id: 'A' | 'B';
  name: string;
  role: string;
  hairColor: string;
  skinTone: string;
  outfitColor: string;
  accentColor: string;
  accessory: 'glasses' | 'headphones' | 'bag' | 'cap' | 'none';
}

export interface SceneConfig {
  place: string;
  placeTheme: 'lab' | 'cafe' | 'campus' | 'library';
  situation: string;
  style: StyleId;
  characters: [CharacterLook, CharacterLook];
  propType: 'robot' | 'notebook' | 'coffee' | 'trophy';
}

export interface DialogueLine {
  speaker: 'A' | 'B';
  text: string;
}

export interface BeatVisualSpec {
  poseA: 'proud' | 'worried' | 'panicked' | 'excited' | 'talking';
  poseB: 'curious' | 'skeptical' | 'amazed' | 'suggesting' | 'cheering';
  propState: 'idle' | 'spin' | 'dance' | 'spotlight';
  camera: 'wide' | 'medium' | 'closeup';
  mood: 'bright' | 'tense' | 'playful' | 'celebrate';
}

export interface StoryboardBeat {
  id: BeatId;
  label: string;
  timeRange: string;
  startSec: number;
  endSec: number;
  sceneDescription: string;
  lines: DialogueLine[];
  subtitles: string;
  usedExpressions: string[];
  visual: BeatVisualSpec;
}

export interface BeatAudioClip {
  beatId: BeatId;
  audioBase64: string;
  mimeType: string;
  durationSec: number;
}

export interface SubtitleCue {
  startSec: number;
  endSec: number;
  speaker: 'A' | 'B';
  lines: [string] | [string, string];
  fullText: string;
}
