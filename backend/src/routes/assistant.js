import { Router } from 'express';
import { SchemaType } from '@google/generative-ai';
import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';

const router = Router();

// POST /api/assistant/chat
router.post('/chat', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: "Une question valide est requise." });
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            answer: {
              type: SchemaType.STRING,
              description: "La réponse complète, claire et pédagogique à la question de l'utilisateur."
            },
            keywords: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  term: { type: SchemaType.STRING, description: "Le terme islamique (ex: Zakat, Hawl, Nisab)" },
                  definition: { type: SchemaType.STRING, description: "Une définition brève et claire du terme en 1 ou 2 phrases." }
                },
                required: ["term", "definition"]
              }
            }
          },
          required: ["answer", "keywords"]
        }
      }
    });

    const prompt = `Tu es un savant islamique francophone, bienveillant et pédagogue.
      Un utilisateur te pose la question suivante : "${question}".
      Si la question n'a AUCUN rapport avec l'islam, la religion, la spiritualité, la morale ou l'application du quiz, refuse poliment d'y répondre en expliquant que tu es un assistant dédié uniquement aux sujets islamiques (dans la propriété "answer" et renvoie une liste vide pour "keywords").
      Sinon, réponds de manière claire, précise et respectueuse.
      Identifie également les termes islamiques clés (en arabe ou techniques) d'un seul coup pas deux fois afin d'eviter la duplication que tu as utilisés dans ta réponse,
      et fournis une définition brève pour chacun. Ne liste que les termes importants, pas les mots courants.
      IMPORTANT : Rédige TOUT le texte (réponse et définitions) en français correct avec des accents normaux (é, à, è, ô, ç, etc.). N'utilise JAMAIS d'entités HTML (comme &eacute;, &agrave;, &ocirc;) ou de caractères d'échappement Web étranges. Le texte doit être du texte brut UTF-8 propre.`;

    const assistantData = await withRetry(async () => {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    });

    console.log("result", assistantData);
    res.json(assistantData);
  } catch (error) {
    console.error("Erreur lors de la réponse de l'assistant :", error);

    const isQuota = error?.message && (error.message.includes('429') || error.message.toLowerCase().includes('quota'));
    if (isQuota) {
      return res.status(429).json({
        error: "Le quota quotidien de l'IA est atteint. Réessayez dans quelques heures.",
        retryAfter: 3600
      });
    }

    res.status(500).json({ error: error.message || "Erreur serveur de l'assistant IA." });
  }
});

export default router;
