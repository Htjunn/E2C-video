import type {
  CharacterLook,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
  StyleId,
} from '../types/e2c';

export interface StyleOption {
  id: StyleId;
  label: string;
  subtitle: string;
  imageUrl: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: '2d',
    label: '2D animation',
    subtitle: 'Clean ink outlines & soft cel shading',
    imageUrl: '/src/assets/images/style_2d_animation_1795579736902.jpg',
  },
  {
    id: 'clay',
    label: 'clay',
    subtitle: 'Warm stop-motion sculpted clay feel',
    imageUrl: '/src/assets/images/style_claymation_1795579737949.jpg',
  },
  {
    id: 'watercolor',
    label: 'watercolor',
    subtitle: 'Hand-painted paper & gentle washes',
    imageUrl: '/src/assets/images/style_watercolor_1795579737808.jpg',
  },
  {
    id: 'live-action',
    label: 'live-action style',
    subtitle: 'Soft natural window light & film depth',
    imageUrl: '/src/assets/images/style_live_action_1795579739498.jpg',
  },
];

export const EXAMPLE_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'exp-1',
    phrase: 'Worth an absolute fortune.',
    movie: 'Notting Hill',
    meaningKo: '엄청난 가치가 있는, 어마어마하게 비싼',
  },
  {
    id: 'exp-2',
    phrase: 'Get ahead of yourself',
    movie: 'Inside Out 2',
    meaningKo: '너무 앞서 나가다, 성급하게 굴다',
  },
  {
    id: 'exp-3',
    phrase: 'Freaking out',
    movie: 'Inside Out 2',
    meaningKo: '완전히 패닉에 빠지다, 기겁하다',
  },
  {
    id: 'exp-4',
    phrase: 'just in case',
    movie: 'Inside Out 2',
    meaningKo: '만약을 대비해서',
  },
  {
    id: 'exp-5',
    phrase: 'Tempting',
    movie: 'Notting Hill',
    meaningKo: '솔깃하네, 구미가 당기네',
  },
];

export const DEFAULT_CHARACTERS: [CharacterLook, CharacterLook] = [
  {
    id: 'A',
    name: 'Student A',
    role: 'Inventor',
    hairColor: '#2C333F',
    skinTone: '#F4D4BA',
    outfitColor: '#4E7D79',
    accentColor: '#E5B974',
    accessory: 'glasses',
  },
  {
    id: 'B',
    name: 'Student B',
    role: 'Best Friend',
    hairColor: '#5B3E31',
    skinTone: '#F7DBC4',
    outfitColor: '#C57B63',
    accentColor: '#5B7C99',
    accessory: 'bag',
  },
];

export const OUTFIT_SWATCHES = [
  { label: 'Sage Teal', value: '#4E7D79' },
  { label: 'Terracotta', value: '#C57B63' },
  { label: 'Slate Blue', value: '#4B6B8A' },
  { label: 'Warm Ochre', value: '#C49A52' },
  { label: 'Soft Plum', value: '#7A6382' },
];

export const PLACE_PRESETS: Array<{
  label: string;
  theme: SceneConfig['placeTheme'];
  propType: SceneConfig['propType'];
}> = [
  { label: 'University Robotics Lab', theme: 'lab', propType: 'robot' },
  { label: 'Sunny Campus Courtyard', theme: 'campus', propType: 'robot' },
  { label: 'Cozy Campus Coffee Shop', theme: 'cafe', propType: 'coffee' },
  { label: 'Quiet Student Library', theme: 'library', propType: 'notebook' },
];

export const DEFAULT_SCENE: SceneConfig = {
  place: 'University Robotics Lab',
  placeTheme: 'lab',
  situation:
    'Student A proudly demonstrates a handmade robot that suddenly malfunctions and spins in circles, until Student B spots its dance moves.',
  style: '2d',
  characters: DEFAULT_CHARACTERS,
  propType: 'robot',
};

// Pre-seeded 64-word storyboard matching the exact 4-beat table & 5 expressions
export const EXAMPLE_BEATS: StoryboardBeat[] = [
  {
    id: 'hook',
    label: 'Hook',
    timeRange: '0–7s',
    startSec: 0,
    endSec: 7,
    sceneDescription: 'Student A shows off the handmade robot they built themselves on the lab desk.',
    lines: [
      {
        speaker: 'A',
        text: 'This robot is Worth an absolute fortune. It can do anything. Want to see it work?',
      },
    ],
    subtitles:
      'This robot is Worth an absolute fortune. It can do anything. Want to see it work?',
    usedExpressions: ['Worth an absolute fortune.'],
    visual: {
      poseA: 'proud',
      poseB: 'curious',
      propState: 'idle',
      camera: 'wide',
      mood: 'bright',
    },
  },
  {
    id: 'problem',
    label: 'Problem',
    timeRange: '7–15s',
    startSec: 7,
    endSec: 15,
    sceneDescription: 'The robot suddenly malfunctions and starts spinning in fast circles.',
    lines: [
      {
        speaker: 'B',
        text: "Don't Get ahead of yourself. It's spinning in circles. Is that supposed to happen?",
      },
      { speaker: 'A', text: 'Oh, no!' },
    ],
    subtitles:
      "Don't Get ahead of yourself. It's spinning in circles. Is that supposed to happen? Oh, no!",
    usedExpressions: ['Get ahead of yourself'],
    visual: {
      poseA: 'worried',
      poseB: 'skeptical',
      propState: 'spin',
      camera: 'medium',
      mood: 'tense',
    },
  },
  {
    id: 'turn',
    label: 'Turn',
    timeRange: '15–23s',
    startSec: 15,
    endSec: 23,
    sceneDescription:
      "Student A panics, but Student B notices that the robot's spinning looks like breakdancing.",
    lines: [
      {
        speaker: 'A',
        text: "I'm Freaking out! I brought a spare battery, just in case.",
      },
      {
        speaker: 'B',
        text: 'Wait. Those moves look like dancing!',
      },
    ],
    subtitles:
      "I'm Freaking out! I brought a spare battery, just in case. Wait. Those moves look like dancing!",
    usedExpressions: ['Freaking out', 'just in case'],
    visual: {
      poseA: 'panicked',
      poseB: 'amazed',
      propState: 'dance',
      camera: 'closeup',
      mood: 'playful',
    },
  },
  {
    id: 'close',
    label: 'Close',
    timeRange: '23–30s',
    startSec: 23,
    endSec: 30,
    sceneDescription:
      'Student B suggests fixing the robot, but Student A decides to enter it in a dance contest instead.',
    lines: [
      { speaker: 'B', text: 'Should we fix it?' },
      {
        speaker: 'A',
        text: "Tempting, but no. Let's enter it in a dance contest!",
      },
    ],
    subtitles:
      "Should we fix it? Tempting, but no. Let's enter it in a dance contest!",
    usedExpressions: ['Tempting'],
    visual: {
      poseA: 'excited',
      poseB: 'cheering',
      propState: 'spotlight',
      camera: 'wide',
      mood: 'celebrate',
    },
  },
];
