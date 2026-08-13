/**
 * assistantAgent.js
 *
 * Agent conversationnel islamique avec :
 *   - Mémoire de conversation (Redis via sessionService)
 *   - Function calling (generate_quiz_question, calculate_zakat)
 *   - Extraction de mots-clés après la réponse finale
 *   - Logging structuré complet
 */

import { SchemaType } from '@google/generative-ai';
import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';
import { getHistory, saveHistory } from './sessionService.js';

// ─────────────────────────────────────────────
// Instruction système
// ─────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `Tu es un savant islamique francophone, bienveillant et pédagogue.
Tu te souviens de toute la conversation en cours et peux faire référence aux échanges précédents.
Tu réponds UNIQUEMENT aux questions liées à l'islam, la spiritualité, la morale islamique, ou à l'application Quiz Islamique.
Si une question est hors sujet, refuses poliment en restant courtois.
Quand l'utilisateur veut être interrogé ou testé, utilise l'outil generate_quiz_question.
Quand il demande un calcul de Zakat, utilise l'outil calculate_zakat.
Réponds toujours en français correct avec des accents (é, à, è, ô, ç). JAMAIS d'entités HTML.`;

// ─────────────────────────────────────────────
// Définition des outils (Function Calling)
// ─────────────────────────────────────────────

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'generate_quiz_question',
        description: "Génère une question de quiz islamique formatée quand l'utilisateur veut être interrogé ou testé sur un sujet précis.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            topic: {
              type: SchemaType.STRING,
              description: "Le sujet de la question (ex: Zakat, Prophètes, Piliers de l'Islam, Coran, Histoire)",
            },
            difficulty: {
              type: SchemaType.STRING,
              description: "Niveau de difficulté souhaité",
              enum: ['Débutant', 'Intermédiaire', 'Expert'],
            },
          },
          required: ['topic', 'difficulty'],
        },
      },
      {
        name: 'calculate_zakat',
        description: "Calcule la Zakat obligatoire sur un montant d'argent ou d'actifs.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            amount: { type: SchemaType.NUMBER, description: "Le montant sur lequel calculer la Zakat" },
            currency: { type: SchemaType.STRING, description: "La devise (ex: EUR, USD, XOF, MAD)" },
          },
          required: ['amount'],
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Exécution des outils
// ─────────────────────────────────────────────

async function executeTool(name, args) {
  console.log(`🔧 [Assistant Agent] Appel de l'outil "${name}" avec args :`, JSON.stringify(args));

  if (name === 'generate_quiz_question') {
    const { topic, difficulty } = args;
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(
      `Génère UNE question de quiz islamique de niveau "${difficulty}" sur le sujet "${topic}".
Présente-la ainsi :
📝 **Question :** [ta question]
A) [option 1]  B) [option 2]  C) [option 3]  D) [option 4]
✅ **Bonne réponse :** [lettre) texte]
💡 **Explication :** [explication pédagogique en 2-3 phrases]
Réponds en français correct.`
    );
    const output = result.response.text();
    console.log(`📤 [Assistant Agent] Outil "${name}" a produit :`, output.slice(0, 100) + '...');
    return output;
  }

  if (name === 'calculate_zakat') {
    const { amount, currency = 'EUR' } = args;
    const zakatAmount = (amount * 0.025).toFixed(2);
    const nisabOr = (amount >= 0 ? '85g d\'or (~5 500 EUR)' : 'non applicable');
    const output = (
      `La Zakat sur ${amount} ${currency} est de **${zakatAmount} ${currency}** ` +
      `(taux de 2,5% — applicable si le montant dépasse le Nisab : ${nisabOr}, ` +
      `détenu pendant un an lunaire complet — la Hawl).`
    );
    console.log(`📤 [Assistant Agent] Outil "${name}" a produit :`, output);
    return output;
  }

  return `Outil "${name}" inconnu.`;
}

// ─────────────────────────────────────────────
// Extraction des mots-clés islamiques
// ─────────────────────────────────────────────

async function extractKeywords(text) {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              term: { type: SchemaType.STRING },
              definition: { type: SchemaType.STRING },
            },
            required: ['term', 'definition'],
          },
        },
      },
    });

    const prompt = `Dans ce texte : "${text.slice(0, 600)}"
Identifie au maximum 4 termes islamiques techniques ou arabes importants.
Ne retourne PAS les mots courants ni les doublons. Si aucun terme islamique présent, retourne [].
Réponds en UTF-8 propre avec accents normaux (é, à, etc.). JAMAIS d'entités HTML.`;

    const result = await model.generateContent(prompt);
    const rawKeywords = JSON.parse(result.response.text());
    
    // Déduplication des termes (garder uniquement la première occurrence de chaque mot-clé)
    const seenTerms = new Set();
    const uniqueKeywords = [];
    for (const item of rawKeywords) {
      const normalizedTerm = item.term.trim().toLowerCase();
      if (!seenTerms.has(normalizedTerm)) {
        seenTerms.add(normalizedTerm);
        uniqueKeywords.push(item);
      }
    }

    console.log('🔑 [Assistant Agent] Mots-clés uniques extraits :', uniqueKeywords.map(k => k.term));
    return uniqueKeywords;
  } catch (err) {
    console.warn('⚠️ [Assistant Agent] Échec d\'extraction des mots-clés :', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// Convertisseur historique (simplifié ↔ Gemini)
// ─────────────────────────────────────────────

function toGeminiHistory(history) {
  return history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

function toSimpleHistory(geminiHistory, previousSimpleHistory = []) {
  return geminiHistory
    .filter(msg => msg.parts?.[0]?.text)
    .map((msg, i) => {
      const role = msg.role === 'model' ? 'assistant' : 'user';
      const prev = previousSimpleHistory[i];
      return {
        role,
        content: msg.parts[0].text,
        ...(prev && prev.keywords ? { keywords: prev.keywords } : {}),
      };
    });
}

// ─────────────────────────────────────────────
// Point d'entrée principal
// ─────────────────────────────────────────────

/**
 * Exécute un tour de l'agent assistant avec mémoire Redis.
 *
 * @param {string} sessionId  - Identifiant unique de session
 * @param {string} userMessage - Message de l'utilisateur
 * @returns {{ answer: string, keywords: Array }}
 */
export async function runAssistantAgent(sessionId, userMessage) {
  console.log('\n💬 ==================== ASSISTANT AGENT ====================');
  console.log(`🆔 Session ID      : ${sessionId}`);
  console.log(`📥 Question reçue  : "${userMessage}"`);

  // 1. Récupérer l'historique Redis et le convertir au format Gemini
  const simpleHistory = await getHistory(sessionId);
  console.log(`📜 Historique Redis : ${simpleHistory.length} messages en mémoire`);
  if (simpleHistory.length > 0) {
    console.log('   Dernier échange :', simpleHistory.slice(-2).map(m => `[${m.role}] ${m.content.slice(0, 50)}...`));
  }

  const geminiHistory = toGeminiHistory(simpleHistory);

  // 2. Créer le modèle avec outils
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: TOOLS,
  });

  // 3. Démarrer le chat avec l'historique existant
  const chat = model.startChat({ history: geminiHistory });

  // 4. Envoi de la requête à Gemini et traitement direct des outils
  console.log('🤖 Envoi de la requête à Gemini...');
  let response = await withRetry(() => chat.sendMessage(userMessage));

  let answer = '';
  const calls = response.response.functionCalls();
  if (calls && calls.length > 0) {
    const call = calls[0];
    console.log(`🔧 [Assistant Agent] Exécution de l'outil : "${call.name}" avec args :`, JSON.stringify(call.args));
    answer = await executeTool(call.name, call.args);
  } else {
    answer = response.response.text();
  }
  console.log(`✨ Réponse finale générée (${answer.length} caractères) :`);
  console.log(`   "${answer.slice(0, 150)}${answer.length > 150 ? '...' : ''}"`);

  // 5. Extraire les mots-clés de la réponse
  const keywords = await extractKeywords(answer);

  // 6. Sauvegarder l'historique mis à jour en Redis (avec mots-clés conservés)
  const fullHistory = await chat.getHistory();
  const updatedSimple = toSimpleHistory(fullHistory, simpleHistory);
  const lastMsg = updatedSimple[updatedSimple.length - 1];
  if (lastMsg && lastMsg.role === 'assistant') {
    lastMsg.keywords = keywords;
  }
  await saveHistory(sessionId, updatedSimple);
  console.log(`💾 Historique mis à jour dans Redis : ${updatedSimple.length} messages stockés avec mots-clés`);

  console.log('===========================================================\n');

  return { answer, keywords };
}
