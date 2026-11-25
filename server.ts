import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  ApiServiceError,
  formatGeminiError,
  generateBeatTts,
  generateStoryboard,
  regenerateSingleBeat,
} from './server/geminiService.ts';
import { renderMp4FromFramesAndAudio } from './server/videoExporter.ts';
import type {
  BeatId,
  ExpressionItem,
  SceneConfig,
  StoryboardBeat,
} from './src/types/e2c.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '60mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/storyboard', async (req, res) => {
    try {
      const { expressions, scene } = req.body as {
        expressions: ExpressionItem[];
        scene: SceneConfig;
      };
      if (!Array.isArray(expressions) || expressions.filter((e) => e.phrase?.trim()).length < 5) {
        return res.status(400).json({ error: 'Please provide at least 5 English expressions.' });
      }
      const beats = await generateStoryboard(expressions, scene);
      return res.json({ beats });
    } catch (err) {
      const apiErr: ApiServiceError = formatGeminiError(err);
      return res.status(apiErr.statusCode).json({ error: apiErr.message });
    }
  });

  app.post('/api/regenerate-beat', async (req, res) => {
    try {
      const { beatId, currentBeats, expressions, scene } = req.body as {
        beatId: BeatId;
        currentBeats: StoryboardBeat[];
        expressions: ExpressionItem[];
        scene: SceneConfig;
      };
      if (!beatId || !Array.isArray(currentBeats)) {
        return res.status(400).json({ error: 'Missing beatId or currentBeats.' });
      }
      const beat = await regenerateSingleBeat(beatId, currentBeats, expressions, scene);
      return res.json({ beat });
    } catch (err) {
      const apiErr: ApiServiceError = formatGeminiError(err);
      return res.status(apiErr.statusCode).json({ error: apiErr.message });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      const { beats, scene } = req.body as {
        beats: StoryboardBeat[];
        scene: SceneConfig;
      };
      if (!Array.isArray(beats) || beats.length === 0) {
        return res.status(400).json({ error: 'Missing storyboard beats for voice generation.' });
      }

      const audioClips = await Promise.all(
        beats.map((beat) => generateBeatTts(beat, scene))
      );
      return res.json({ audioClips });
    } catch (err) {
      const apiErr: ApiServiceError = formatGeminiError(err);
      return res.status(apiErr.statusCode).json({ error: apiErr.message });
    }
  });

  app.post('/api/export-mp4', async (req, res) => {
    try {
      const { frames, fps, totalDurationSec, audioBeats, includeBgm } = req.body;
      const mp4Buffer = await renderMp4FromFramesAndAudio({
        frames,
        fps: Number(fps) || 10,
        totalDurationSec: Number(totalDurationSec) || 30,
        audioBeats: Array.isArray(audioBeats) ? audioBeats : [],
        includeBgm: includeBgm !== false,
      });
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="e2c-30s-clip.mp4"');
      return res.send(mp4Buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export MP4 video.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`E2C server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
