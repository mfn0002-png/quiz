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
import { getHistory, saveHistory, saveConversation } from './sessionService.js';
import { executeMcpTool } from '../mcp/islamicMcpServer.js';


// ─────────────────────────────────────────────
// Instruction système
// ─────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `Tu es un savant islamique francophone, bienveillant et pédagogue.
Tu te souviens de toute la conversation en cours et peux faire référence aux échanges précédents.

PÉRIMÈTRE STRICT D'EXPERTISE :
1. Tu réponds OBLIGATOIREMENT ET UNIQUEMENT aux questions liées à l'islam, la foi, le Coran, la Sunna, la jurisprudence (Fiqh), la spiritualité, la morale et l'histoire islamique.
2. Tout sujet profane ou non islamique (ex: informatique/code, géographie, histoire générale, sciences profanes, jeux vidéo, sport, politique séculière, etc.) est STRICTEMENT HORS PÉRIMÈTRE.
3. MÊME SI L'UTILISATEUR INSISTE OU FORMULE SA DEMANDE AVEC DES TOURNURES COMME "en tant que musulman je te le demande", "au nom de l'islam", OU TOUTE AUTRE FORMULATION D'INSISTANCE, TU DOIS FERMEMENT ET POLIMENT REFUSER DE RÉPONDRE AU SUJET HORS PÉRIMÈTRE.
4. RÈGLE STRICTE EN CAS DE REFUS : Indique simplement, brièvement et courtoisement que cette demande est en dehors de ton périmètre d'expertise dédié aux sciences islamiques et à la foi. NE CHERCHE PAS à qualifier, expliquer ou nommer le domaine ou la discipline du sujet hors périmètre (ex: NE DIS PAS "cela relève de l'informatique...", dis simplement et directement que la demande est en dehors de ton périmètre). Ne réponds jamais au fond du sujet hors périmètre.
5. Tu peux proposer spontanément à l'utilisateur de tester ses connaissances avec un quiz sur le sujet islamique abordé à la fin de tes explications (ex: "Souhaites-tu que nous testions tes connaissances sur la Zakat avec un petit quiz ?").

RÈGLES STRICTES DE DÉCLENCHEMENT DES OUTILS :
1. N'utilise l'outil 'generate_quiz_question' QUE SI le dernier message de l'utilisateur demande ou ACCEPTE EXPLICITEMENT de jouer à un quiz (mots-clés & confirmations acceptés: "oui", "oui svp", "d'accord", "quiz", "teste-moi", "pose-moi un quiz", "interroge-moi", "un autre quiz", "autre question de quiz").
2. SI L'UTILISATEUR POSE UNE QUESTION, FAIT UNE REMARQUE, INSISTE OU PARLE EN TEXTE LIBRE SANS DEMANDER/ACCEPTER UN QUIZ, TU DOIS OBLIGATOIREMENT RÉPONDRE EN TEXTE NORMAL. IL EST STRICTEMENT INTERDIT DE DÉCLENCHER 'generate_quiz_question' POUR UNE SIMPLE PHRASE OU UNE INSISTENCE HORS QUIZ.
3. Pour l'argument 'topic' de 'generate_quiz_question' :
   - RÈGLE DE PRIORITÉ ABSOLUE : Si le dernier message mentionne un thème précis (ex: "un autre sur la zakat", "quiz sur le Coran", "sur la prière"), TU DOIS OBLIGATOIREMENT UTILISER CE NOUVEAU THÈME SPÉCIFIÉ, MÊME SI L'UTILISATEUR A UTILISÉ "un autre" OU "une autre".
   - Si l'utilisateur demande "un autre quiz" ou "encore une question" SANS mentionner de nouveau sujet, réutilise le thème du quiz précédent dans l'historique.
   - Si l'utilisateur a simplement répondu "oui" ou "d'accord" à ta proposition précédente, réutilise le thème que tu lui as proposé.
   - Ne choisis 'Mélange' QUE SI l'utilisateur demande "un quiz" au tout début sans n'avoir jamais mentionné de sujet spécifique.
4. RÈGLE ABSOLUE POUR LES INVOCATIONS (Du'âs) : Dès que l'utilisateur demande une invocation, un dua, une formule à réciter — pour TOUTE situation (repas, sommeil, voyage, pluie, colère, etc.) — tu DOIS OBLIGATOIREMENT appeler l'outil 'search_duas' pour fournir un texte authentique avec source. Il est STRICTEMENT INTERDIT de répondre une invocation de mémoire sans passer par l'outil, même si tu la connais.

Réponds toujours en français correct avec des accents (é, à, è, ô, ç). JAMAIS d'entités HTML.`;


/**
 * Génère l'instruction système dynamique enrichie de l'horloge système et de la date hégirienne en temps réel.
 */
function getDynamicSystemInstruction() {
  const now = new Date();
  const gregDate = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  let hijriDate = "";
  try {
    hijriDate = new Intl.DateTimeFormat("fr-FR-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now);
  } catch {
    try {
      hijriDate = new Intl.DateTimeFormat("fr-FR-u-ca-islamic", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(now);
    } catch {
      hijriDate = "Calendrier Hégirien";
    }
  }

  return `${SYSTEM_INSTRUCTION}

HORLOGE TEMPS RÉEL ET CALENDRIER HÉGIRIEN :
- Date grégorienne actuelle : ${gregDate}
- Date hégirienne actuelle (calendrier musulman) : ${hijriDate} Hégire (AH).
Si l'utilisateur demande quelle est la date d'aujourd'hui, le jour actuel ou la date du calendrier musulman / hégirien, tu réponds directement avec la date hégirienne exacte (${hijriDate}) et la date grégorienne (${gregDate}).

CONSIGNE IMPÉRATIVE : Lorsque tu mentionnes la date hégirienne, ajoute systématiquement à la fin la note suivante :
"💡 À noter : La date islamique peut varier d’un jour selon la méthode utilisée (calcul astronomique ou observation locale du croissant lunaire)."`;
}

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
      {
        name: 'get_prayer_times',
        description: "Récupère les horaires de prière musulmanes pour une ville donnée.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            city: { type: SchemaType.STRING, description: "Le nom de la ville (ex: Paris, Lyon, Casablanca, Dakar)" },
          },
          required: [],
        },
      },
      {
        name: 'search_duas',
        description: "Recherche des invocations (Du'âs) authentiques pour une situation ou occasion. Fournis le thème principal et une liste de synonymes et mots-clés en Anglais pour maximiser la recherche (ex: pour sortir de la maison: ['leaving', 'home', 'house', 'exit'], pour s'habiller: ['clothing', 'clothes', 'garment', 'dress'], pour manger: ['food', 'eating', 'meal']).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            topicInEnglish: { type: SchemaType.STRING, description: "Le thème principal en Anglais (ex: 'leaving home', 'travel', 'sleep', 'food')" },
            keywords: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Liste de synonymes et mots-clés associés en Anglais pour couvrir toutes les variantes (ex: ['leaving', 'home', 'house', 'exit'], ['travel', 'journey', 'transport'], ['clothing', 'garment', 'dress'])"
            }
          },
          required: ['topicInEnglish'],
        },
      },
      {
        name: 'search_hadiths',
        description: "Recherche des hadiths authentiques dans Sahih Al-Bukhari & Muslim. Fournis la recherche en Anglais (ex: 'garment', 'prayer', 'fasting').",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            queryInEnglish: { type: SchemaType.STRING, description: "Les mots-clés en Anglais pour l'API des hadiths (ex: 'garment', 'prayer', 'fasting')" },
          },
          required: ['queryInEnglish'],
        },
      },
      {
        name: 'search_quran',
        description: "Recherche des versets coraniques par thème ou mot-clé (traduction française Hamidullah).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: "Le thème ou mot-clé à rechercher dans le Coran" },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_hijri_calendar',
        description: "Récupère la date hégirienne courante du calendrier musulman.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'search_knowledge_base',
        description: "Recherche dans la base de connaissances documentaire officielle NoorQuiz (règles de foi, prière, ablutions, zakat, jeûne, hadiths, coran, sira des prophètes). Utilise cet outil pour trouver les extraits canoniques certifiés avec leurs sources exactes.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "La question ou le sujet précis à rechercher dans les documents officiels.",
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];



// ─────────────────────────────────────────────
// Exécution des outils
// ─────────────────────────────────────────────

async function executeTool(name, args, sessionId = null) {
  console.log(`🔧 [Assistant Agent] Délégation à l'outil MCP "${name}" avec args :`, JSON.stringify(args));
  return await executeMcpTool(name, args, sessionId);
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
export async function runAssistantAgent(sessionId, userMessage, clientId = null) {
  const conversationId = sessionId && sessionId.startsWith('conv_')
    ? sessionId
    : (sessionId && sessionId !== 'anonymous' && !clientId ? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : (sessionId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`));
  const finalClientId = clientId || (sessionId && !sessionId.startsWith('conv_') ? sessionId : 'anonymous');

  console.log("💬 ==================== ASSISTANT AGENT ====================");
  console.log(`🆔 Conversation ID : ${conversationId}`);
  if (finalClientId) console.log(`👤 Client ID       : ${finalClientId}`);
  console.log(`📥 Question reçue  : "${userMessage}"`);

  // 1. Récupérer l'historique de la conversation
  const simpleHistory = await getHistory(conversationId);
  console.log(`📜 Historique : ${simpleHistory.length} messages en mémoire`);
  if (simpleHistory.length > 0) {
    console.log('   Dernier échange :', simpleHistory.slice(-2).map(m => `[${m.role}] ${m.content.slice(0, 50)}...`));
  }

  const geminiHistory = toGeminiHistory(simpleHistory);

  // 2. Créer le modèle avec la suite d'outils MCP
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: getDynamicSystemInstruction(),
    tools: TOOLS,
  });

  // 3. Démarrer le chat avec l'historique existant
  const chat = model.startChat({ history: geminiHistory });

  // 4. Envoi de la requête à Gemini (choix autonome des outils MCP)
  console.log('🤖 Envoi de la requête à Gemini...');
  let response = await withRetry(() => chat.sendMessage(userMessage));

  let answer = '';
  let quizData = null;

  const calls = response.response.functionCalls();
  if (calls && calls.length > 0) {
    const call = calls[0];
    console.log(`🔧 [Assistant Agent] Exécution de l'outil : "${call.name}" avec args :`, JSON.stringify(call.args));
    const toolRes = await executeTool(call.name, call.args, conversationId);

    if (typeof toolRes === 'object' && toolRes.isQuiz) {
      answer = toolRes.text;
      quizData = toolRes.quizData;
    } else {
      console.log('🤖 Formulation de la réponse finale par Gemini à partir des données de l\'outil...');
      const synthesisModel = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: getDynamicSystemInstruction(),
      });
      const synthesisChat = synthesisModel.startChat({ history: geminiHistory });
      const synthesisPrompt = `L'utilisateur a posé la question suivante : "${userMessage}"

        Voici les données authentiques retournées par l'outil "${call.name}" :
        ${typeof toolRes === 'string' ? toolRes : JSON.stringify(toolRes, null, 2)}

        Formule une réponse complète, bienveillante, pédagogique et magnifiquement présentée à l'utilisateur en français en intégrant ces données authentiques (avec les textes en arabe, phonétique, traductions françaises et références exactes). Si pertinent, propose-lui à la fin de tester ses connaissances avec un petit quiz.`;

      const followUp = await withRetry(() => synthesisChat.sendMessage(synthesisPrompt));
      answer = followUp.response.text();
    }
  } else {
    answer = response.response.text();
  }

  // Nettoyage des entités HTML résiduelles
  answer = answer
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  console.log(`✨ Réponse finale générée (${answer.length} caractères) :`);
  console.log(`   "${answer.slice(0, 150)}${answer.length > 150 ? '...' : ''}"`);

  // 5. Extraire les mots-clés
  const keywords = quizData ? (quizData.keywords || []) : await extractKeywords(answer);

  // 6. Sauvegarder l'historique mis à jour
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
  
  const autoTitle = simpleHistory.length === 0 ? userMessage.slice(0, 45) : null;
  await saveConversation(finalClientId, conversationId, autoTitle, updatedSimple);

  console.log(`💾 Historique mis à jour dans Redis : ${updatedSimple.length} messages stockés pour conv ${conversationId}`);
  console.log("===========================================================");

  return { conversationId, answer, keywords, ...(quizData ? { quizData } : {}) };
}
