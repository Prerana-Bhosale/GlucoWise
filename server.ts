import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/analyze-meal', async (req, res) => {
  try {
    const { imageBase64, mimeType, mealNote, profileContext } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      mealNote?: string;
      profileContext?: {
        activityLevel?: string;
        targetA1c?: number;
        glucoseLow?: number;
        glucoseHigh?: number;
        dailyCalories?: number;
      };
    };

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: 'Missing imageBase64 or mimeType in request body.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const profileDetails = profileContext
      ? `User targets: A1C goal ${profileContext.targetA1c ?? 6.5}%, target glucose range ${profileContext.glucoseLow ?? 70}-${profileContext.glucoseHigh ?? 180} mg/dL, activity level ${profileContext.activityLevel ?? 'lightly_active'}, daily calorie budget ~${profileContext.dailyCalories ?? 1900} kcal.`
      : '';

    const promptText = [
      'Analyze this food photo for diabetes-conscious nutrition tracking.',
      'Identify each visible food or beverage item, estimate a realistic portion size, and estimate kcal, carbs (g), fiber (g), sugar (g), protein (g), fat (g), and approximate glycemic index (gi, 0-100).',
      'Also provide 2 to 3 practical, diabetes-friendly swap alternatives tailored to the user profile to lower post-meal glucose spikes, plus a concise 1-2 sentence meal summary.',
      profileDetails,
      mealNote ? `User context note: ${mealNote}` : '',
      'Return strictly valid JSON matching the requested schema. All values are approximate visual estimates.',
    ]
      .filter(Boolean)
      .join(' ');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction:
          'You are a careful nutrition vision assistant for people monitoring blood sugar. Identify every distinct food item visible on the plate or glass. Provide realistic, conservative nutrition estimates and glycemic index values (0-100). If no food is visible in the image, return an empty items array and explain in mealSummary.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: 'List of identified food items with approximate nutritional values.',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Clear name of the food item.' },
                  portion: { type: Type.STRING, description: 'Estimated serving size, e.g. "150g (1 cup)".' },
                  kcal: { type: Type.NUMBER, description: 'Estimated calories in kcal.' },
                  carbs: { type: Type.NUMBER, description: 'Total carbohydrates in grams.' },
                  fiber: { type: Type.NUMBER, description: 'Dietary fiber in grams.' },
                  sugar: { type: Type.NUMBER, description: 'Total sugars in grams.' },
                  protein: { type: Type.NUMBER, description: 'Protein in grams.' },
                  fat: { type: Type.NUMBER, description: 'Total fat in grams.' },
                  gi: { type: Type.NUMBER, description: 'Estimated Glycemic Index (0-100).' },
                },
                required: ['name', 'portion', 'kcal', 'carbs', 'fiber', 'sugar', 'protein', 'fat', 'gi'],
              },
            },
            mealSummary: {
              type: Type.STRING,
              description: 'Brief 1-2 sentence overview of the meal and its glycemic characteristics.',
            },
            alternatives: {
              type: Type.ARRAY,
              description: 'Diabetes-friendly food swaps or pairing tips.',
              items: {
                type: Type.OBJECT,
                properties: {
                  swap: { type: Type.STRING, description: 'Suggested swap or addition.' },
                  reason: { type: Type.STRING, description: 'How this helps steady blood glucose.' },
                  spikeReduction: { type: Type.STRING, description: 'Short label like "Lower GI" or "Added fiber".' },
                },
                required: ['swap', 'reason', 'spikeReduction'],
              },
            },
          },
          required: ['items', 'mealSummary', 'alternatives'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      res.status(502).json({ error: 'The vision model returned an empty response. Please try another photo.' });
      return;
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: unknown) {
    console.error('Meal analysis error:', err);
    const message = err instanceof Error ? err.message : 'Failed to analyze meal image.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const { query, ingredients, mealType, profileContext } = req.body as {
      query?: string;
      ingredients?: string;
      mealType?: string;
      profileContext?: {
        targetA1c?: number;
        glucoseLow?: number;
        glucoseHigh?: number;
        activityLevel?: string;
        dailyCalories?: number;
      };
    };

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const promptParts = [
      'Generate 3 practical, delicious diabetes-friendly recipes with low-to-moderate glycemic impact.',
      query ? `Search focus: "${query}".` : '',
      ingredients ? `Prioritize using these ingredients on hand: ${ingredients}.` : '',
      mealType && mealType !== 'All' ? `Meal category: ${mealType}.` : '',
      profileContext
        ? `Tailor portions and macros to someone targeting A1C ${profileContext.targetA1c ?? 6.5}%, glucose range ${profileContext.glucoseLow ?? 70}-${profileContext.glucoseHigh ?? 180} mg/dL, activity level ${profileContext.activityLevel ?? 'lightly_active'}, daily calorie target ~${profileContext.dailyCalories ?? 1900} kcal.`
        : '',
      'Include exact ingredient quantities, clear step-by-step instructions, approximate per-serving nutritional values (kcal, carbs, fiber, sugar, protein, fat, gi), and a brief diabetes-friendly tip.',
    ]
      .filter(Boolean)
      .join(' ');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptParts,
      config: {
        systemInstruction:
          'You are a registered-dietitian-inspired culinary assistant specializing in blood-sugar-friendly cooking. Keep recipes accessible, realistic (15-35 min prep), high in fiber and protein, and low in refined sugars. All nutrition estimates are approximate.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  mealType: { type: Type.STRING, description: 'One of Breakfast, Lunch, Dinner, Snack' },
                  prepMinutes: { type: Type.NUMBER },
                  servings: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  ingredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  instructions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  kcal: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fiber: { type: Type.NUMBER },
                  sugar: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                  gi: { type: Type.NUMBER },
                  diabetesTip: { type: Type.STRING },
                },
                required: [
                  'title',
                  'mealType',
                  'prepMinutes',
                  'servings',
                  'description',
                  'ingredients',
                  'instructions',
                  'kcal',
                  'carbs',
                  'fiber',
                  'sugar',
                  'protein',
                  'fat',
                  'gi',
                  'diabetesTip',
                ],
              },
            },
          },
          required: ['recipes'],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      res.status(502).json({ error: 'Recipe generator returned an empty response.' });
      return;
    }

    res.json(JSON.parse(rawText));
  } catch (err: unknown) {
    console.error('Recipe generation error:', err);
    const message = err instanceof Error ? err.message : 'Failed to find recipes.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GlucoWise server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
