import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Difficulty, Question, Keyword } from '../data/questions';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is missing in .env.local");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

// ──────────────────────────────────────
// 1. GÉNÉRATION DE QUESTIONS POUR LE QUIZ
// ──────────────────────────────────────
export const generateQuestions = async (difficulty: Difficulty, topic: string = "Mélange", count: number = 5): Promise<Question[]> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
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

    const categoryInstruction = topic === "Mélange" ? "Varie les catégories (ex: Piliers, Coran, Prophètes, Histoire, Pratiques)." : `Toutes les questions doivent porter spécifiquement sur le thème : "${topic}".`;

    const prompt = `Tu es un expert de l'Islam et un excellent pédagogue.
      Génère une liste de ${count} questions à choix multiples (QCM) sur la religion islamique.
      Les questions doivent être en français, respectueuses, et d'un niveau de difficulté : "${difficulty}".
      ${categoryInstruction}
      Assure-toi que les explications sont claires et justes.
      Pour chaque question, identifie également les mots-clés islamiques importants présents dans son explication (comme "Nisab" ou "Zakat") et définis-les brièvement dans le tableau 'keywords'.
      IMPORTANT : Rédige TOUT le texte en français correct avec des accents normaux (é, à, è, ô, ç, etc.). N'utilise JAMAIS d'entités HTML (comme &eacute;, &agrave;, &ocirc;) ou de caractères d'échappement Web étranges. Le texte doit être du texte brut UTF-8 propre.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as Question[];

  } catch (error) {
    console.error("Erreur lors de la génération des questions :", error);
    throw error;
  }
};


// ──────────────────────────────────────
// 2. MODE ASSISTANT : RÉPONSE + MOTS-CLÉS
// ──────────────────────────────────────
export interface AssistantResponse {
  answer: string;
  keywords: Keyword[];
}

export const askQuestion = async (userQuestion: string): Promise<AssistantResponse> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
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
                     Un utilisateur te pose la question suivante : "${userQuestion}".
                     Si la question n'a AUCUN rapport avec l'islam, la religion, la spiritualité, la morale ou l'application du quiz, refuse poliment d'y répondre en expliquant que tu es un assistant dédié uniquement aux sujets islamiques (dans la propriété "answer" et renvoie une liste vide pour "keywords").Sinon,
                     Réponds de manière claire, précise et respectueuse.
                     Identifie également les termes islamiques clés (en arabe ou techniques) que tu as utilisés dans ta réponse,
                     et fournis une définition brève pour chacun. Ne liste que les termes importants, pas les mots courants.
                     IMPORTANT : Rédige TOUT le texte (réponse et définitions) en français correct avec des accents normaux (é, à, è, ô, ç, etc.). N'utilise JAMAIS d'entités HTML (comme &eacute;, &agrave;, &ocirc;) ou de caractères d'échappement Web étranges. Le texte doit être du texte brut UTF-8 propre.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as AssistantResponse;

  } catch (error) {
    console.error("Erreur lors de la réponse de l'assistant :", error);
    throw error;
  }
};
