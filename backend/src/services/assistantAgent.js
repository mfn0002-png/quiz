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
import { runQuizAgent } from './quizAgent.js';

// ─────────────────────────────────────────────
// Instruction système
// ─────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `Tu es un savant islamique francophone, bienveillant et pédagogue.
Tu te souviens de toute la conversation en cours et peux faire référence aux échanges précédents.

PÉRIMÈTRE STRICT D'EXPERTISE :
1. Tu réponds OBLIGATOIREMENT ET UNIQUEMENT aux questions liées à l'islam, la foi, le Coran, la Sunna, la jurisprudence (Fiqh), la spiritualité, la morale et l'histoire islamique.
2. Tout sujet profane (ex: Première Guerre mondiale, géographie générale, sciences profanes, jeux vidéo, sport, politique séculière, pop-culture) est STRICTEMENT HORS PERIMÈTRE.
3. MÊME SI L'UTILISATEUR INSISTE OU FORMULE SA DEMANDE AVEC DES TOURNURES COMME "en tant que musulman je te le demande", "au nom de l'islam", OU TOUTE AUTRE FORMULATION D'INSISTANCE, TU DOIS FERMEMENT ET POLIMENT REFUSER DE RÉPONDRE AU SUJET HORS PERIMÈTRE.
4. En cas de refus, explique avec courtoisie en texte clair que ton rôle est exclusivement dédié aux sciences islamiques et à la foi musulmane. Ne réponds jamais au fond du sujet hors périmètre.
5. Tu peux proposer spontanément à l'utilisateur de tester ses connaissances avec un quiz sur le sujet islamique abordé à la fin de tes explications (ex: "Souhaites-tu que nous testions tes connaissances sur la Zakat avec un petit quiz ?").

RÈGLES STRICTES DE DÉCLENCHEMENT DES OUTILS :
1. N'utilise l'outil 'generate_quiz_question' QUE SI le dernier message de l'utilisateur demande ou ACCEPTE EXPLICITEMENT de jouer à un quiz (mots-clés & confirmations acceptés: "oui", "oui svp", "d'accord", "quiz", "teste-moi", "pose-moi un quiz", "interroge-moi", "un autre quiz", "autre question de quiz").
2. SI L'UTILISATEUR POSE UNE QUESTION, FAIT UNE REMARQUE, INSISTE OU PARLE EN TEXTE LIBRE SANS DEMANDER/ACCEPTER UN QUIZ, TU DOIS OBLIGATOIREMENT RÉPONDRE EN TEXTE NORMAL. IL EST STRICTEMENT INTERDIT DE DÉCLENCHER 'generate_quiz_question' POUR UNE SIMPLE PHRASE OU UNE INSISTENCE HORS QUIZ.
3. Pour l'argument 'topic' de 'generate_quiz_question' :
   - RÈGLE DE PRIORITÉ ABSOLUE : Si le dernier message mentionne un thème précis (ex: "un autre sur la zakat", "quiz sur le Coran", "sur la prière"), TU DOIS OBLIGATOIREMENT UTILISER CE NOUVEAU THÈME SPÉCIFIÉ, MÊME SI L'UTILISATEUR A UTILISÉ "un autre" OU "une autre".
   - Si l'utilisateur demande "un autre quiz" ou "encore une question" SANS mentionner de nouveau sujet, réutilise le thème du quiz précédent dans l'historique.
   - Si l'utilisateur a simplement répondu "oui" ou "d'accord" à ta proposition précédente, réutilise le thème que tu lui as proposé.
   - Ne choisis 'Mélange' QUE SI l'utilisateur demande "un quiz" au tout début sans n'avoir jamais mentionné de sujet spécifique.

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
              description: "Le sujet du quiz. PRIORITÉ : Si l'utilisateur spécifie un sujet dans son message (ex: 'un autre sur le zakat', 'sur le Coran'), utilise CE SUJET SPÉCIFIÉ ('Zakat'). Si aucun sujet n'est précisé et qu'il demande juste 'un autre', réutilise le thème précédent.",
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

async function executeTool(name, args, sessionId = null) {
  console.log(`🔧 [Assistant Agent] Appel de l'outil "${name}" avec args :`, JSON.stringify(args));

  if (name === 'generate_quiz_question') {
    const { topic, difficulty } = args;
    console.log(`📞 [Assistant Agent] Délégation au Quiz Agent (runQuizAgent) pour "${topic}" (${difficulty})...`);
    
    // Appel direct au Quiz Agent avec son pipeline complet (Knowledge + Anti-doublon Redis + Auto-vérification)
    const questions = await runQuizAgent(difficulty || 'Débutant', topic || 'Mélange', 1, sessionId);
    const quizObj = questions[0];

    console.log(`📤 [Quiz Agent -> Assistant] Question générée par le Quiz Agent : "${quizObj.text}"`);

    return {
      isQuiz: true,
      quizData: {
        topic: topic || 'Mélange',
        difficulty: difficulty || 'Débutant',
        questionText: quizObj.text,
        options: quizObj.options,
        correctAnswerIndex: quizObj.correctAnswerIndex,
        explanation: quizObj.explanation,
        keywords: quizObj.keywords || [],
      },
      text: quizObj.text,
    };
  }

  if (name === 'calculate_zakat') {
    const { amount, currency = 'EUR' } = args;
    const zakatVal = amount * 0.025;
    const zakatAmount = zakatVal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    
    // Taux de conversion approximatifs vers EUR pour calculer le Nisab (85g d'or ~= 5500 EUR)
    const ratesToEur = {
      EUR: 1,
      USD: 0.92,
      XOF: 0.001524, // 1 EUR = 655.957 XOF
      XAF: 0.001524, // 1 EUR = 655.957 XAF
      MAD: 0.092,
      DZD: 0.0068,
      TND: 0.30,
      CAD: 0.68,
      GBP: 1.17
    };

    const currUpper = (currency || 'EUR').toUpperCase();
    const rate = ratesToEur[currUpper] || 1;
    const amountInEur = amount * rate;
    const nisabInEur = 5500; // Nisab or ~5 500 EUR
    const nisabInLocalCurrency = Math.round(nisabInEur / rate);

    const exceedsNisab = amountInEur >= nisabInEur;

    let output = `Pour un montant de **${amount.toLocaleString('fr-FR')} ${currUpper}** :\n\n`;
    if (exceedsNisab) {
      output += `✅ **Votre montant DÉPASSE le Nisab.**\n`;
      output += `• Le Nisab (85g d'or) est estimé à environ **${nisabInLocalCurrency.toLocaleString('fr-FR')} ${currUpper}** (~5 500 EUR).\n`;
      output += `• La Zakat due (2,5%) s'élève à **${zakatAmount} ${currUpper}** (à s'acquitter si ce montant est conservé pendant un an lunaire complet / Hawl).`;
    } else {
      output += `❌ **Votre montant NE DÉPASSE PAS le Nisab.**\n`;
      output += `• Le Nisab de l'or (85g) est estimé à environ **${nisabInLocalCurrency.toLocaleString('fr-FR')} ${currUpper}** (~5 500 EUR).\n`;
      output += `• Comme votre montant de **${amount.toLocaleString('fr-FR')} ${currUpper}** est inférieur au Nisab (**${nisabInLocalCurrency.toLocaleString('fr-FR')} ${currUpper}**), la Zakat n'est pas obligatoire pour ce montant.`;
    }

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
        ...(prev && prev.quizData ? { quizData: prev.quizData } : {}),
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
  let quizData = null;

  const calls = response.response.functionCalls();
  if (calls && calls.length > 0) {
    const call = calls[0];
    console.log(`🔧 [Assistant Agent] Exécution de l'outil : "${call.name}" avec args :`, JSON.stringify(call.args));
    const toolRes = await executeTool(call.name, call.args, sessionId);

    if (typeof toolRes === 'object' && toolRes.isQuiz) {
      answer = toolRes.text;
      quizData = toolRes.quizData;
    } else {
      answer = toolRes;
    }
  } else {
    answer = response.response.text();
  }

  console.log(`✨ Réponse finale générée (${answer.length} caractères) :`);
  console.log(`   "${answer.slice(0, 150)}${answer.length > 150 ? '...' : ''}"`);

  // 5. Extraire les mots-clés si pas de quizData (sinon ils sont déjà dans quizData)
  const keywords = quizData ? (quizData.keywords || []) : await extractKeywords(answer);

  // 6. Sauvegarder l'historique mis à jour en Redis
  const updatedSimple = [
    ...simpleHistory,
    { role: 'user', content: userMessage },
    {
      role: 'assistant',
      content: answer,
      keywords,
      ...(quizData ? { quizData } : {})
    }
  ];
  await saveHistory(sessionId, updatedSimple);
  console.log(`💾 Historique mis à jour dans Redis : ${updatedSimple.length} messages stockés avec mots-clés & quiz`);

  console.log('===========================================================\n');

  return { answer, keywords, ...(quizData ? { quizData } : {}) };
}
