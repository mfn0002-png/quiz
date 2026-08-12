import { Router } from 'express';
import { SchemaType } from '@google/generative-ai';
import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';

const router = Router();

// POST /api/quiz/generate
router.post('/generate', async (req, res) => {
  try {
    const { difficulty = "Débutant", topic = "Mélange", count = 5 } = req.body;

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.INTEGER },
              text: { type: SchemaType.STRING },
              options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              correctAnswerIndex: { type: SchemaType.INTEGER },
              explanation: { type: SchemaType.STRING },
              difficulty: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
              keywords: {
                type: SchemaType.ARRAY,
                description: "Liste des termes islamiques clés présents dans l'explication de la question.",
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    term: { type: SchemaType.STRING, description: "Le terme (ex: Zakat, Nisab)" },
                    definition: { type: SchemaType.STRING, description: "Une définition courte." }
                  },
                  required: ["term", "definition"]
                }
              }
            },
            required: ["id", "text", "options", "correctAnswerIndex", "explanation", "difficulty", "category", "keywords"]
          }
        }
      }
    });

    const categoryInstruction = topic === "Mélange"
      ? "Varie les catégories (ex: Piliers, Coran, Prophètes, Histoire, Pratiques)."
      : `Toutes les questions doivent porter spécifiquement sur le thème : "${topic}".`;

    const prompt = `Tu es un expert de l'Islam et un excellent pédagogue.
      Génère une liste de ${count} questions à choix multiples (QCM) sur la religion islamique.
      Les questions doivent être en français, respectueuses, et d'un niveau de difficulté : "${difficulty}".
      ${categoryInstruction}
      Assure-toi que les explications sont claires et justes.
      Pour chaque question, identifie également les mots-clés islamiques importants présents dans son explication (comme "Nisab" ou "Zakat") et définis-les brièvement dans le tableau 'keywords'.
      IMPORTANT : Rédige TOUT le texte en français correct avec des accents normaux (é, à, è, ô, ç, etc.). N'utilise JAMAIS d'entités HTML (comme &eacute;, &agrave;, &ocirc;) ou de caractères d'échappement Web étranges. Le texte doit être du texte brut UTF-8 propre.`;

    const questions = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    });

    res.json(questions);
  } catch (error) {
    console.error("Erreur lors de la génération des questions :", error);

    // Message d'erreur clair pour l'utilisateur si c'est un quota
    const isQuota = error?.message && (error.message.includes('429') || error.message.toLowerCase().includes('quota'));
    if (isQuota) {
      return res.status(429).json({
        error: "Le quota quotidien de l'IA est atteint. Réessayez dans quelques heures ou configurez une clé API avec un plan payant.",
        retryAfter: 3600
      });
    }

    res.status(500).json({ error: error.message || "Erreur serveur lors de la génération du quiz." });
  }
});

export default router;
