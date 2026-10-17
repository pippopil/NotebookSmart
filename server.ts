import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Ensure HMR is disabled in AI Studio dev environment to prevent WebSocket errors
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Route: AI Auto-Tagging for notes
  app.post('/api/auto-tag', async (req, res) => {
    try {
      const { title = '', content = '', category = 'note' } = req.body;
      const combinedText = `${title}\n${content}`.trim();

      if (!combinedText) {
        return res.json({ tags: [], isAiGenerated: false });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured, signaling client fallback');
        return res.status(503).json({
          error: 'GEMINI_API_KEY not configured',
          fallback: true,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `You are a smart note auto-tagging assistant in NotebookSmart.
Analyze the following note and suggest 3 to 5 concise, highly relevant organization tags.
Common category tag examples:
- Work & Professional: "work", "project", "meeting", "client", "business"
- Personal & Life: "personal", "home", "family", "routine"
- Urgency: "urgent", "priority", "deadline", "today"
- Shopping & Supplies: "shopping", "groceries", "order"
- Finances & Budget: "finances", "budget", "expenses", "income", "taxes"
- Health & Wellness: "health", "fitness", "medicine", "doctor"
- Travel & Events: "travel", "event", "trip", "vacation"
- Study & Ideas: "study", "idea", "notes", "reading"

Choose tags that accurately describe this specific note. Use lowercase words without spaces or special characters (letters, numbers, hyphens allowed).
If the note is primarily in Russian, provide Russian or bilingual tag equivalents (e.g., "work", "срочно", "личное", "покупки", "бюджет").

Note Category: ${category}
Note Title: ${title || 'Untitled'}
Note Content:
${content}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of 3 to 5 concise tags',
              },
            },
            required: ['tags'],
          },
        },
      });

      let parsedTags: string[] = [];
      try {
        const text = response.text || '{}';
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.tags)) {
          parsedTags = parsed.tags;
        } else if (Array.isArray(parsed)) {
          parsedTags = parsed;
        }
      } catch (err) {
        console.error('Failed to parse Gemini output', err);
      }

      // Clean tags: trim, lowercase, strip any existing #
      const cleaned = parsedTags
        .map((t) => String(t).trim().toLowerCase().replace(/^[#@]+/, '').replace(/\s+/g, '-'))
        .filter((t) => t.length > 1 && t.length < 25)
        .slice(0, 5);

      return res.json({
        tags: cleaned,
        isAiGenerated: true,
      });
    } catch (error: any) {
      console.error('Error in /api/auto-tag:', error);
      return res.status(500).json({
        error: error.message || 'Failed to auto-tag note',
        fallback: true,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NotebookSmart server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
