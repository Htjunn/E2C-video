import type {
  BeatVisualSpec,
  CharacterLook,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
  StyleId,
  SubtitleCue,
} from '../types/e2c';
import {
  FINAL_SCREEN_DURATION_SEC,
  getActiveCueAtTime,
  getBeatAtTime,
  STORY_DURATION_SEC,
} from '../utils/scriptUtils';

function quantizeTime(timeSec: number, style: StyleId): number {
  if (style === 'clay') {
    // Classic stop-motion 10fps cadence
    return Math.floor(timeSec * 10) / 10;
  }
  return timeSec;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawStyleFillAndStroke(
  ctx: CanvasRenderingContext2D,
  style: StyleId,
  fillColor: string,
  outlineWidth: number = 2.5
) {
  if (style === 'watercolor') {
    ctx.save();
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#3E4652';
    ctx.lineWidth = Math.max(1.2, outlineWidth * 0.65);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (style === '2d') {
    ctx.strokeStyle = '#25303B';
    ctx.lineWidth = outlineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (style === 'clay') {
    // Soft highlight rim on clay shapes
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(25, 32, 42, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: SceneConfig,
  mood: BeatVisualSpec['mood'],
  t: number
) {
  const { style, placeTheme } = scene;

  // Base sky / wall palette by mood + style
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (style === 'watercolor') {
    grad.addColorStop(0, '#FBF8F1');
    grad.addColorStop(1, '#EDE8DD');
  } else if (style === 'clay') {
    grad.addColorStop(0, mood === 'tense' ? '#EAE4DE' : '#F3EFE9');
    grad.addColorStop(1, '#DFD7CC');
  } else if (style === 'live-action') {
    grad.addColorStop(0, mood === 'celebrate' ? '#E4ECF2' : '#E7ECEF');
    grad.addColorStop(1, '#D3DCE3');
  } else {
    grad.addColorStop(0, mood === 'tense' ? '#EDF0F5' : '#EEF4F7');
    grad.addColorStop(1, '#E0E8EE');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Watercolor paper wash blobs
  if (style === 'watercolor') {
    ctx.save();
    const washes = [
      { x: w * 0.2, y: h * 0.22, r: w * 0.26, c: 'rgba(130, 170, 196, 0.14)' },
      { x: w * 0.78, y: h * 0.25, r: w * 0.24, c: 'rgba(154, 184, 158, 0.14)' },
      { x: w * 0.5, y: h * 0.55, r: w * 0.3, c: 'rgba(224, 188, 134, 0.12)' },
    ];
    for (const wash of washes) {
      const wg = ctx.createRadialGradient(wash.x, wash.y, 10, wash.x, wash.y, wash.r);
      wg.addColorStop(0, wash.c);
      wg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(wash.x, wash.y, wash.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Place-specific architectural background
  if (placeTheme === 'campus') {
    // Soft rolling campus lawn + trees + building silhouette
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.quadraticCurveTo(w * 0.5, h * 0.66, w, h * 0.72);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    drawStyleFillAndStroke(ctx, style, '#C5D9C4', 2);

    // Campus arch building
    roundRectPath(ctx, w * 0.12, h * 0.2, w * 0.28, h * 0.5, 6);
    drawStyleFillAndStroke(ctx, style, '#DFD6C7', 2);
    roundRectPath(ctx, w * 0.22, h * 0.45, w * 0.08, h * 0.25, 22);
    drawStyleFillAndStroke(ctx, style, '#BCC7D1', 2);

    // Trees
    for (const tx of [w * 0.78, w * 0.88]) {
      ctx.beginPath();
      ctx.rect(tx - 8, h * 0.46, 16, h * 0.24);
      drawStyleFillAndStroke(ctx, style, '#8D6F57', 2);
      ctx.beginPath();
      ctx.arc(tx, h * 0.4, 48, 0, Math.PI * 2);
      drawStyleFillAndStroke(ctx, style, '#9EC09C', 2);
    }
  } else {
    // Indoor window light (lab, cafe, library)
    const winX = w * 0.08;
    const winY = h * 0.1;
    const winW = w * 0.34;
    const winH = h * 0.46;
    roundRectPath(ctx, winX, winY, winW, winH, 10);
    drawStyleFillAndStroke(ctx, style, '#D9E8F2', 2.5);

    // Window mullions
    ctx.save();
    ctx.strokeStyle = style === '2d' ? '#25303B' : '#9AA6B2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY);
    ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2);
    ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();
    ctx.restore();

    // Soft sunlight beams in live-action or bright mood
    if (style === 'live-action' || mood === 'bright' || mood === 'celebrate') {
      ctx.save();
      const beam = ctx.createLinearGradient(winX, winY, winX + winW * 1.4, h * 0.85);
      beam.addColorStop(0, 'rgba(255, 248, 224, 0.28)');
      beam.addColorStop(1, 'rgba(255, 248, 224, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(winX, winY);
      ctx.lineTo(winX + winW, winY);
      ctx.lineTo(winX + winW * 1.5, h * 0.85);
      ctx.lineTo(winX + 40, h * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Bookshelf / wall shelf on right
    roundRectPath(ctx, w * 0.64, h * 0.14, w * 0.28, h * 0.38, 8);
    drawStyleFillAndStroke(ctx, style, '#D7C7B2', 2);
    const bookColors = ['#6D8BA6', '#C78570', '#7BA08C', '#D4AC6E', '#897896'];
    for (let i = 0; i < 6; i++) {
      roundRectPath(ctx, w * 0.66 + i * 32, h * 0.2, 22, 62, 3);
      drawStyleFillAndStroke(ctx, style, bookColors[i % bookColors.length], 1.8);
    }
  }

  // Live-action bokeh dots
  if (style === 'live-action') {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const bx = ((i * 157 + t * 8) % (w + 80)) - 40;
      const by = h * 0.15 + (i % 3) * 55;
      ctx.fillStyle = 'rgba(255, 250, 235, 0.22)';
      ctx.beginPath();
      ctx.arc(bx, by, 18 + (i % 3) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Foreground workbench / table (lifted slightly for clean bottom subtitle framing)
  roundRectPath(ctx, w * 0.06, h * 0.61, w * 0.88, h * 0.41, 14);
  drawStyleFillAndStroke(ctx, style, '#C8A582', 2.5);

  // Table top edge highlight
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(w * 0.08, h * 0.62, w * 0.84, 7);
  ctx.restore();

  // Small cozy desk lamp on far left of workbench
  roundRectPath(ctx, w * 0.09, h * 0.59, 34, 9, 4);
  drawStyleFillAndStroke(ctx, style, '#52657A', 2);
  ctx.strokeStyle = '#52657A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.09 + 17, h * 0.59);
  ctx.lineTo(w * 0.09 + 10, h * 0.48);
  ctx.lineTo(w * 0.09 + 26, h * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.09 + 28, h * 0.46, 13, Math.PI * 0.9, Math.PI * 2.1);
  drawStyleFillAndStroke(ctx, style, '#E5B974', 2);

  // Celebration spotlight overlay when mood === 'celebrate'
  if (mood === 'celebrate') {
    ctx.save();
    const spot = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.42);
    spot.addColorStop(0, 'rgba(255, 240, 180, 0.28)');
    spot.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, w, h);

    // Gentle floating confetti dots
    const confettiColors = ['#E5B974', '#4E7D79', '#C57B63', '#5B7C99'];
    for (let i = 0; i < 16; i++) {
      const cx = ((i * 79 + t * 28) % (w * 0.8)) + w * 0.1;
      const cy = ((i * 53 + t * 42) % (h * 0.58)) + 20;
      ctx.fillStyle = confettiColors[i % confettiColors.length];
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  char: CharacterLook,
  x: number,
  y: number,
  scale: number,
  pose: string,
  isSpeaking: boolean,
  style: StyleId,
  t: number,
  facing: 1 | -1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const bob =
    pose === 'excited' || pose === 'cheering'
      ? Math.sin(t * 7) * 5
      : pose === 'panicked'
      ? Math.sin(t * 14) * 3
      : Math.sin(t * 2.5) * 2;

  ctx.translate(0, bob);

  // Shoulders & Torso (locked outfitColor + accentColor)
  roundRectPath(ctx, -46, 36, 92, 95, 28);
  drawStyleFillAndStroke(ctx, style, char.outfitColor, 2.6);

  // Collar / Scarf / Accent Stripe
  roundRectPath(ctx, -20, 36, 40, 18, 8);
  drawStyleFillAndStroke(ctx, style, char.accentColor, 2);

  // Arms based on pose
  ctx.save();
  const leftArmAngle =
    pose === 'proud' || pose === 'cheering' || pose === 'excited'
      ? -0.9 + Math.sin(t * 5) * 0.15
      : pose === 'panicked'
      ? -2.1 + Math.sin(t * 15) * 0.25
      : 0.25;
  const rightArmAngle =
    pose === 'amazed' || pose === 'suggesting'
      ? -1.1 + Math.sin(t * 4) * 0.12
      : pose === 'panicked'
      ? -2.3 - Math.sin(t * 15) * 0.25
      : -0.2;

  // Left arm
  ctx.save();
  ctx.translate(-42, 54);
  ctx.rotate(leftArmAngle);
  roundRectPath(ctx, -10, 0, 20, 56, 10);
  drawStyleFillAndStroke(ctx, style, char.outfitColor, 2.2);
  ctx.beginPath();
  ctx.arc(0, 58, 10, 0, Math.PI * 2);
  drawStyleFillAndStroke(ctx, style, char.skinTone, 2);
  ctx.restore();

  // Right arm
  ctx.save();
  ctx.translate(42, 54);
  ctx.rotate(rightArmAngle);
  roundRectPath(ctx, -10, 0, 20, 56, 10);
  drawStyleFillAndStroke(ctx, style, char.outfitColor, 2.2);
  ctx.beginPath();
  ctx.arc(0, 58, 10, 0, Math.PI * 2);
  drawStyleFillAndStroke(ctx, style, char.skinTone, 2);
  ctx.restore();
  ctx.restore();

  // Neck
  roundRectPath(ctx, -11, 20, 22, 22, 6);
  drawStyleFillAndStroke(ctx, style, char.skinTone, 2);

  // Head
  const headTilt =
    pose === 'curious' || pose === 'skeptical'
      ? 0.08 * facing
      : pose === 'panicked'
      ? Math.sin(t * 12) * 0.06
      : 0;
  ctx.save();
  ctx.rotate(headTilt);

  // Hair back
  ctx.beginPath();
  ctx.arc(0, -14, 41, Math.PI * 0.9, Math.PI * 2.1);
  drawStyleFillAndStroke(ctx, style, char.hairColor, 2.4);

  // Face
  ctx.beginPath();
  ctx.arc(0, -10, 36, 0, Math.PI * 2);
  drawStyleFillAndStroke(ctx, style, char.skinTone, 2.6);

  // Hair fringe
  ctx.beginPath();
  ctx.arc(0, -22, 36, Math.PI * 1.05, Math.PI * 1.95);
  ctx.quadraticCurveTo(10, -24, -18, -32);
  ctx.closePath();
  drawStyleFillAndStroke(ctx, style, char.hairColor, 2.2);

  // Soft cheeks
  ctx.save();
  ctx.fillStyle = 'rgba(225, 130, 120, 0.25)';
  ctx.beginPath();
  ctx.arc(-18, -2, 6, 0, Math.PI * 2);
  ctx.arc(18, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eyes (blink periodically)
  const blink = Math.sin(t * 1.3 + (char.id === 'A' ? 0 : 2)) > 0.96;
  const eyeOffsetX = facing * 3;
  ctx.fillStyle = '#232B35';
  for (const ex of [-12 + eyeOffsetX, 12 + eyeOffsetX]) {
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - 4, -12);
      ctx.lineTo(ex + 4, -12);
      ctx.strokeStyle = '#232B35';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else {
      const eyeRadius = pose === 'panicked' || pose === 'amazed' ? 4.5 : 3.6;
      ctx.beginPath();
      ctx.arc(ex, -12, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex - 1.2, -13.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#232B35';
    }
  }

  // Eyebrows
  ctx.strokeStyle = char.hairColor;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (pose === 'worried' || pose === 'panicked') {
    ctx.moveTo(-17 + eyeOffsetX, -20);
    ctx.lineTo(-8 + eyeOffsetX, -23);
    ctx.moveTo(8 + eyeOffsetX, -23);
    ctx.lineTo(17 + eyeOffsetX, -20);
  } else if (pose === 'skeptical') {
    ctx.moveTo(-17 + eyeOffsetX, -22);
    ctx.lineTo(-8 + eyeOffsetX, -21);
    ctx.moveTo(8 + eyeOffsetX, -24);
    ctx.lineTo(17 + eyeOffsetX, -22);
  } else {
    ctx.moveTo(-17 + eyeOffsetX, -21);
    ctx.lineTo(-8 + eyeOffsetX, -21);
    ctx.moveTo(8 + eyeOffsetX, -21);
    ctx.lineTo(17 + eyeOffsetX, -21);
  }
  ctx.stroke();

  // Accessory: glasses / cap / headphones
  if (char.accessory === 'glasses') {
    ctx.strokeStyle = '#2C3847';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-12 + eyeOffsetX, -12, 9, 0, Math.PI * 2);
    ctx.moveTo(-3 + eyeOffsetX, -12);
    ctx.lineTo(3 + eyeOffsetX, -12);
    ctx.arc(12 + eyeOffsetX, -12, 9, 0, Math.PI * 2);
    ctx.stroke();
  } else if (char.accessory === 'headphones') {
    ctx.strokeStyle = char.accentColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -14, 40, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    roundRectPath(ctx, -44, -20, 10, 22, 5);
    drawStyleFillAndStroke(ctx, style, char.accentColor, 2);
    roundRectPath(ctx, 34, -20, 10, 22, 5);
    drawStyleFillAndStroke(ctx, style, char.accentColor, 2);
  } else if (char.accessory === 'cap') {
    ctx.beginPath();
    ctx.arc(0, -28, 35, Math.PI, Math.PI * 2);
    drawStyleFillAndStroke(ctx, style, char.accentColor, 2);
    roundRectPath(ctx, -6, -32, 46 * facing, 8, 4);
    drawStyleFillAndStroke(ctx, style, char.accentColor, 2);
  }

  // Mouth (animated lip-sync when speaking!)
  const mouthOpen = isSpeaking ? Math.abs(Math.sin(t * 14)) * 6 + 2 : 0;
  ctx.fillStyle = '#B85A56';
  ctx.strokeStyle = '#232B35';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (isSpeaking) {
    ctx.ellipse(eyeOffsetX, 6, 7, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (pose === 'worried' || pose === 'panicked') {
    ctx.arc(eyeOffsetX, 11, 7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.arc(eyeOffsetX, 4, 8, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

function drawSceneProp(
  ctx: CanvasRenderingContext2D,
  propType: SceneConfig['propType'],
  propState: BeatVisualSpec['propState'],
  x: number,
  y: number,
  style: StyleId,
  t: number
) {
  ctx.save();
  ctx.translate(x, y);

  if (propType === 'robot') {
    const spinAngle =
      propState === 'spin'
        ? Math.sin(t * 18) * 0.35
        : propState === 'dance' || propState === 'spotlight'
        ? Math.sin(t * 8) * 0.18
        : 0;
    const bounceY =
      propState === 'dance' || propState === 'spotlight'
        ? -Math.abs(Math.sin(t * 7)) * 18
        : propState === 'spin'
        ? Math.sin(t * 22) * 5
        : Math.sin(t * 2) * 2;
    const slideX = propState === 'spin' ? Math.sin(t * 11) * 18 : 0;

    ctx.translate(slideX, bounceY);
    ctx.rotate(spinAngle);

    // Shadow on table
    ctx.save();
    ctx.fillStyle = 'rgba(30, 40, 50, 0.16)';
    ctx.beginPath();
    ctx.ellipse(0, 42 - bounceY * 0.5, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Antenna
    ctx.strokeStyle = '#3B4856';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(0, -64);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -67, 6, 0, Math.PI * 2);
    drawStyleFillAndStroke(
      ctx,
      style,
      propState === 'spin' ? '#D97757' : '#E5B974',
      2
    );

    // Robot Head
    roundRectPath(ctx, -28, -48, 56, 38, 10);
    drawStyleFillAndStroke(ctx, style, '#8FA8BE', 2.4);

    // Visor / Eyes
    roundRectPath(ctx, -20, -39, 40, 18, 6);
    drawStyleFillAndStroke(ctx, style, '#273444', 1.8);
    ctx.fillStyle = propState === 'spin' ? '#F59E0B' : '#7DD3FC';
    ctx.beginPath();
    ctx.arc(-9, -30, 4.5, 0, Math.PI * 2);
    ctx.arc(9, -30, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Robot Body
    roundRectPath(ctx, -24, -6, 48, 40, 8);
    drawStyleFillAndStroke(ctx, style, '#D4B895', 2.4);

    // Chest meter
    roundRectPath(ctx, -13, 3, 26, 16, 4);
    drawStyleFillAndStroke(ctx, style, '#4E7D79', 1.8);

    // Arms (dancing or flailing)
    const armWave =
      propState === 'dance' || propState === 'spotlight'
        ? Math.sin(t * 10) * 0.7
        : propState === 'spin'
        ? Math.sin(t * 24) * 1.1
        : 0.2;
    ctx.save();
    ctx.translate(-26, 2);
    ctx.rotate(-0.5 + armWave);
    roundRectPath(ctx, -6, 0, 12, 26, 5);
    drawStyleFillAndStroke(ctx, style, '#8FA8BE', 2);
    ctx.restore();

    ctx.save();
    ctx.translate(26, 2);
    ctx.rotate(0.5 + armWave);
    roundRectPath(ctx, -6, 0, 12, 26, 5);
    drawStyleFillAndStroke(ctx, style, '#8FA8BE', 2);
    ctx.restore();

    // Wheels
    ctx.beginPath();
    ctx.arc(-14, 38, 7, 0, Math.PI * 2);
    ctx.arc(14, 38, 7, 0, Math.PI * 2);
    drawStyleFillAndStroke(ctx, style, '#3B4856', 2);

    // Motion lines / musical notes
    if (propState === 'spin') {
      ctx.strokeStyle = '#D97757';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -10, 56, 0.2, 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -10, 56, 3.3, 4.5);
      ctx.stroke();
    } else if (propState === 'dance' || propState === 'spotlight') {
      ctx.fillStyle = '#2B5B84';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('♪', -48, -42 + Math.sin(t * 6) * 5);
      ctx.fillText('♫', 36, -50 + Math.cos(t * 6) * 5);
    }
  } else if (propType === 'coffee') {
    roundRectPath(ctx, -20, -10, 40, 38, 8);
    drawStyleFillAndStroke(ctx, style, '#F5F2EB', 2.4);
    roundRectPath(ctx, -22, -16, 44, 10, 4);
    drawStyleFillAndStroke(ctx, style, '#C57B63', 2);
  } else {
    // Open notebook / trophy
    roundRectPath(ctx, -34, -8, 68, 34, 6);
    drawStyleFillAndStroke(ctx, style, '#F8F6F0', 2.4);
    ctx.strokeStyle = '#9BA8B4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 24);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBurnedInSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cue: SubtitleCue | null
) {
  if (!cue || !cue.lines[0]) return;
  const lines = cue.lines.slice(0, 2);

  // Subtle bottom contrast gradient scrim (measured readability >= 4.5:1)
  ctx.save();
  const scrim = ctx.createLinearGradient(0, h * 0.72, 0, h);
  scrim.addColorStop(0, 'rgba(15, 22, 30, 0)');
  scrim.addColorStop(0.55, 'rgba(15, 22, 30, 0.52)');
  scrim.addColorStop(1, 'rgba(15, 22, 30, 0.78)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  const fontSize = Math.round(w * 0.034); // Crisp, readable on mobile & desktop
  const lineHeight = Math.round(fontSize * 1.28);
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const baseBottomY = h - Math.round(h * 0.055);

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const lineIndexFromBottom = lines.length - 1 - i;
    const y = baseBottomY - lineIndexFromBottom * lineHeight;

    // Thick dark contrast outline + subtle drop shadow + crisp white bold fill
    ctx.strokeStyle = 'rgba(12, 18, 26, 0.92)';
    ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.22));
    ctx.strokeText(text, w / 2, y, w * 0.9);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, w / 2, y, w * 0.9);
  }
  ctx.restore();
}

function renderFinalCreditFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  scene: SceneConfig,
  expressions: ExpressionItem[]
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Calm style-matched gradient backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (scene.style === 'watercolor') {
    bg.addColorStop(0, '#FBF8F1');
    bg.addColorStop(1, '#E7E3D8');
  } else if (scene.style === 'clay') {
    bg.addColorStop(0, '#F3EFE9');
    bg.addColorStop(1, '#DDD4C7');
  } else if (scene.style === 'live-action') {
    bg.addColorStop(0, '#1D2733');
    bg.addColorStop(1, '#2B3B4E');
  } else {
    bg.addColorStop(0, '#EEF4F7');
    bg.addColorStop(1, '#DAE4EC');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const isDark = scene.style === 'live-action';
  const fadeAlpha = Math.min(1, progress / 0.14);
  ctx.globalAlpha = fadeAlpha;

  // Soft decorative horizon wash
  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(43, 91, 132, 0.06)';
  ctx.beginPath();
  ctx.arc(w * 0.14, h * 0.2, w * 0.18, 0, Math.PI * 2);
  ctx.arc(w * 0.86, h * 0.8, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Central clean summary card
  const cardX = w * 0.09;
  const cardY = h * 0.09;
  const cardW = w * 0.82;
  const cardH = h * 0.82;
  roundRectPath(ctx, cardX, cardY, cardW, cardH, Math.round(w * 0.022));
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.96)' : 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#D4DCE6';
  ctx.lineWidth = Math.max(1.5, w * 0.0025);
  ctx.stroke();

  // Header
  const headerSize = Math.round(w * 0.036);
  ctx.font = `700 ${headerSize}px "Outfit", "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#2B5B84';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('E2C · Expressions in Action', w / 2, cardY + cardH * 0.075);

  const subSize = Math.round(w * 0.021);
  ctx.font = `500 ${subSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#4B5B6B';
  ctx.fillText(`${scene.place} · Featured Movie Expressions`, w / 2, cardY + cardH * 0.205, cardW * 0.88);

  // Subtle divider line
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.1, cardY + cardH * 0.285);
  ctx.lineTo(cardX + cardW * 0.9, cardY + cardH * 0.285);
  ctx.stroke();

  // Featured Expressions List (clean 2-column or centered list, up to 6 items)
  const activeExpressions = expressions.filter((e) => e.phrase.trim().length > 0).slice(0, 6);
  const expFontSize = Math.round(w * 0.0215);
  ctx.font = `600 ${expFontSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const listTop = cardY + cardH * 0.365;
  const rowStep = cardH * 0.088;
  const useTwoCols = activeExpressions.length > 3;

  activeExpressions.forEach((exp, idx) => {
    const col = useTwoCols ? idx % 2 : 0;
    const row = useTwoCols ? Math.floor(idx / 2) : idx;
    const x = useTwoCols
      ? cardX + cardW * (col === 0 ? 0.065 : 0.525)
      : cardX + cardW * 0.16;
    const y = listTop + row * rowStep;
    const maxW = useTwoCols ? cardW * 0.39 : cardW * 0.68;

    // Color accent dot
    ctx.fillStyle = '#2B5B84';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3, w * 0.0042), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1D2733';
    const label = exp.movie ? `${exp.phrase} (${exp.movie})` : exp.phrase;
    ctx.fillText(label, x + w * 0.014, y, maxW);
  });

  // Prominent Required Credit Banner at bottom of Final screen
  const creditY = cardY + cardH * 0.74;
  const creditH = cardH * 0.18;
  roundRectPath(ctx, cardX + cardW * 0.06, creditY, cardW * 0.88, creditH, Math.round(w * 0.014));
  ctx.fillStyle = '#EDF1F5';
  ctx.fill();
  ctx.strokeStyle = '#DCE3EC';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const creditFontSize = Math.round(w * 0.026);
  ctx.font = `700 ${creditFontSize}px "Outfit", "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#1D2733';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    'Made with Google AI Studio · Script by Seojun Hwang',
    w / 2,
    creditY + creditH / 2,
    cardW * 0.84
  );

  ctx.restore();
}

export function renderVideoFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  scene: SceneConfig,
  beats: StoryboardBeat[],
  cues: SubtitleCue[],
  expressions: ExpressionItem[] = [],
  showFinalScreen: boolean = true
) {
  if (showFinalScreen && timeSec >= STORY_DURATION_SEC) {
    const progress = Math.max(
      0,
      Math.min(1, (timeSec - STORY_DURATION_SEC) / FINAL_SCREEN_DURATION_SEC)
    );
    renderFinalCreditFrame(ctx, width, height, progress, scene, expressions);
    return;
  }

  const clampedTime = Math.max(0, Math.min(STORY_DURATION_SEC - 0.001, timeSec));
  const beat = getBeatAtTime(beats, clampedTime);
  if (!beat) return;

  const activeCue = getActiveCueAtTime(cues, clampedTime);
  const t = quantizeTime(clampedTime, scene.style);

  // Camera zoom framing per beat
  const camScale =
    beat.visual.camera === 'closeup'
      ? 1.07
      : beat.visual.camera === 'medium'
      ? 1.03
      : 1.0;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Subtle camera center zoom
  ctx.translate(width / 2, height / 2);
  ctx.scale(camScale, camScale);
  ctx.translate(-width / 2, -height / 2);

  drawEnvironment(ctx, width, height, scene, beat.visual.mood, t);

  const speakingA = activeCue?.speaker === 'A';
  const speakingB = activeCue?.speaker === 'B';

  // Consistent Student A (left) and Student B (right) with locked outfits & colors
  drawCharacter(
    ctx,
    scene.characters[0],
    width * 0.25,
    height * 0.45,
    width / 854,
    beat.visual.poseA,
    speakingA,
    scene.style,
    t,
    1
  );

  drawCharacter(
    ctx,
    scene.characters[1],
    width * 0.75,
    height * 0.45,
    width / 854,
    beat.visual.poseB,
    speakingB,
    scene.style,
    t,
    -1
  );

  // Central focal prop on the desk
  drawSceneProp(
    ctx,
    scene.propType,
    beat.visual.propState,
    width * 0.5,
    height * 0.55,
    scene.style,
    t
  );

  ctx.restore();

  // Live-action cinematic vignette
  if (scene.style === 'live-action') {
    ctx.save();
    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.28,
      width / 2,
      height / 2,
      width * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(18, 24, 32, 0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Burned-in white bold English subtitles (bottom, max 2 lines, word-for-word)
  drawBurnedInSubtitles(ctx, width, height, activeCue);
}
