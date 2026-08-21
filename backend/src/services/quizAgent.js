/**
 * quizAgent.js
 *
 * Agent de génération de questions avec pipeline multi-étapes agentique :
 *   ① Contexte RAG authentique (Coran / Hadiths) via ragService
 *   ② Résolution adaptative de la difficulté (playerProfileService)
 *   ③ Génération du draft de questions (Gemini) avec consigne anti-doublon renforcée
 *   ④ Déduplication intelligente sémantique & par réponse (Session Redis)
 *   ⑤ Réflexion / auto-vérification (Reflection Agent)
 *   ⑥ Sauvegarde Redis (anti-doublon + pool de secours quizCacheService)
 */

import { SchemaType } from '@google/generative-ai';
import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';
import { getSeenQuestions, addSeenQuestions } from './sessionService.js';
import { fetchIslamicRAGContext } from './ragService.js';
import { resolveDifficulty } from './playerProfileService.js';
import { saveQuestionsToPool, getQuestionsFromPool, getStaticFallbackQuestions } from './quizCacheService.js';

// ─────────────────────────────────────────────
// Schema de réponse
// ─────────────────────────────────────────────

const QUESTION_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id:                 { type: SchemaType.INTEGER },
      text:               { type: SchemaType.STRING },
      options:            { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      correctAnswerIndex: { type: SchemaType.INTEGER },
      explanation:        { type: SchemaType.STRING },
      difficulty:         { type: SchemaType.STRING },
      category:           { type: SchemaType.STRING },
      keywords: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            term:       { type: SchemaType.STRING },
            definition: { type: SchemaType.STRING },
          },
          required: ['term', 'definition'],
        },
      },
    },
    required: ['id', 'text', 'options', 'correctAnswerIndex', 'explanation', 'difficulty', 'category', 'keywords'],
  },
};

const DIFFICULTY_GUIDE = {
  'Débutant':      'Notions de base : les 5 piliers, définitions simples, vocabulaire islamique courant.',
  'Intermédiaire': 'Contexte historique, pratiques détaillées, biographies des Prophètes, jurisprudence simple.',
  'Expert':        'Jurisprudence avancée, tafsir précis, hadiths avec références, numération exacte des versets.',
};

// ─────────────────────────────────────────────
// Helpers de Déduplication Sémantique & Conceptuelle
// ─────────────────────────────────────────────

function extractSignificantWords(str) {
  if (!str) return new Set();
  const stopWords = new Set([
    'quel', 'quelle', 'quels', 'quelles', 'est', 'le', 'la', 'les', 'un', 'une', 'des',
    'du', 'de', 'd', 'dans', 'en', 'pour', 'par', 'sur', 'avec', 'et', 'ou', 'qui', 'que',
    'quoi', 'dont', 'combien', 'nom', 'nomme', 'nommes', 'nommer', 'premiere', 'premier',
    'fois', 'jour', 'musulmans', 'musulman', 'islam', 'islamique', 'religion', 'dieu', 'allah'
  ]);

  const clean = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

  const words = clean
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return new Set(words);
}

function isDuplicateQuestion(newQ, seenItem) {
  const newText = newQ.text.trim().toLowerCase();
  const seenText = (seenItem.text || '').trim().toLowerCase();

  // 1. Égalité exacte de la question
  if (newText === seenText) return true;

  // 2. Égalité exacte de la réponse correcte (ex: si la bonne réponse est "La Shahada" ou "5 fois", c'est le même concept !)
  if (seenItem.answer && newQ.options && newQ.correctAnswerIndex !== undefined) {
    const newAnswer = (newQ.options[newQ.correctAnswerIndex] || '').trim().toLowerCase();
    const seenAnswer = seenItem.answer.trim().toLowerCase();
    if (newAnswer && seenAnswer && newAnswer === seenAnswer) {
      return true;
    }
  }

  // 3. Chevauchement sémantique des mots clés (> 50% de mots identiques)
  const words1 = extractSignificantWords(newText);
  const words2 = extractSignificantWords(seenText);
  if (words1.size > 0 && words2.size > 0) {
    let common = 0;
    for (const w of words1) {
      if (words2.has(w)) common++;
    }
    const minSize = Math.min(words1.size, words2.size);
    if (minSize > 0 && (common / minSize) >= 0.5) {
      return true;
    }
  }

  return false;
}

function deduplicateQuestions(questions, seenItems) {
  const filtered = questions.filter(q => {
    const isDup = seenItems.some(seen => isDuplicateQuestion(q, seen));
    return !isDup;
  });
  console.log(`🔍 [Quiz Agent - Step 3] Déduplication intelligente : ${questions.length} → ${filtered.length} questions inédites`);
  return filtered;
}

// ─────────────────────────────────────────────
// Étape ② : Génération du draft
// ─────────────────────────────────────────────

async function generateDraft(difficulty, topic, count, context, seenItems) {
  console.log(`📝 [Quiz Agent - Step 2] Génération draft Gemini (${count} Q | ${difficulty} | ${topic})`);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: QUESTION_SCHEMA,
    },
  });

  const contextBlock = context
    ? `\n📚 Contexte RAG de référence authentique :\n${context}\n`
    : '';

  const seenBlock = seenItems.length > 0
    ? `\n⛔ INTERDICTION STRICTE : Évite ABSOLUMENT de reposer des questions sur ces sujets ou d'utiliser ces réponses déjà vues par le joueur :\n` +
      seenItems.slice(-25).map(s => `- Question vue : "${s.text}" ${s.answer ? `(Réponse: "${s.answer}")` : ''}`).join('\n') + '\n'
    : '';

  const categoryInstruction = topic === 'Mélange'
    ? 'Varie les catégories (Piliers de l\'Islam, Coran, Prophètes, Histoire islamique, Pratiques).'
    : `Toutes les questions portent spécifiquement sur : "${topic}".`;

  const prompt = `Tu es un expert de l'Islam et un excellent pédagogue.
Génère EXACTEMENT ${count} questions QCM NOUVELLES ET INÉDITES sur la religion islamique.
Niveau : "${difficulty}" — ${DIFFICULTY_GUIDE[difficulty] || ''}
${categoryInstruction}
${contextBlock}${seenBlock}
RÈGLES STRICTES :
- Propose des sujets diversifiés et inédits ! Ne réutilise PAS les mêmes concepts de base que dans la liste d'interdiction.
- Exactement 4 options par question
- La bonne réponse (correctAnswerIndex) doit être INDISCUTABLEMENT correcte
- Les distracteurs doivent être plausibles mais clairement faux
- Explications claires, pédagogiques, en 2-3 phrases citant la référence si possible
- Identifie les mots-clés islamiques dans chaque explication
- Rédige TOUT en français correct avec accents (é, à, è, ô, ç). JAMAIS d'entités HTML.`;

  const result = await withRetry(() => model.generateContent(prompt));
  const questions = JSON.parse(result.response.text());
  console.log(`   ✓ Draft brut généré : ${questions.length} questions`);
  return questions;
}

// ─────────────────────────────────────────────
// Étape ④ : Réflexion / Auto-Vérification
// ─────────────────────────────────────────────

async function reflectAndVerify(questions, difficulty) {
  if (questions.length === 0) return questions;

  console.log(`🔍 [Quiz Agent - Step 4] Auto-vérification (Reflection Agent) sur ${questions.length} questions...`);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: QUESTION_SCHEMA,
    },
  });

  const prompt = `Tu es un savant islamique expert chargé de réviser ces questions de quiz.
${JSON.stringify(questions, null, 2)}

TÂCHE DE RÉVISION (sois rigoureux) :
1. ✅ Vérifie que chaque "correctAnswerIndex" est EXACTEMENT la bonne réponse
2. 📏 Vérifie que le niveau "${difficulty}" est respecté pour chaque question
3. 📝 Vérifie que les explications sont correctes, complètes et pédagogiques
4. 🔧 Corrige toute erreur (réponse incorrecte, explication floue, niveau inadapté)
5. ⚠️  Retourne EXACTEMENT ${questions.length} questions (même nombre qu'en entrée)

Retourne le tableau JSON corrigé.
IMPORTANT : UTF-8 propre avec accents normaux. JAMAIS d'entités HTML.`;

  const result = await withRetry(() => model.generateContent(prompt));
  const verified = JSON.parse(result.response.text());
  console.log(`   ✓ Reflection terminée : ${verified.length} questions validées`);
  return verified;
}

// ─────────────────────────────────────────────
// Point d'entrée principal
// ─────────────────────────────────────────────

/**
 * Pipeline complet de génération de questions avec auto-vérification et déduplication sémantique.
 */
export async function runQuizAgent(difficulty, topic, count, sessionId) {
  console.log('\n🧩 ==================== QUIZ AGENT ====================');
  console.log(`🆔 Session ID : ${sessionId}`);

  // ① Détermination adaptative de la difficulté si 'Auto'
  const finalDifficulty = await resolveDifficulty(sessionId, difficulty);
  console.log(`🎯 Demande    : ${count} questions | Niveau demandé: ${difficulty} → Niveau retenu: ${finalDifficulty} | Thème: ${topic}`);

  try {
    // ② Contexte RAG Islamique
    const ragContext = await fetchIslamicRAGContext(topic);
    console.log(`✓ [Quiz Agent - Step 1] Contexte RAG initialisé avec succès.`);

    // ③ Questions & Réponses déjà vues (anti-doublon intelligent)
    const seenItems = await getSeenQuestions(sessionId);
    console.log(`📜 Questions déjà en mémoire Redis pour ce joueur : ${seenItems.length}`);

    // ④ Génération du draft
    let questions = await generateDraft(finalDifficulty, topic, count, ragContext, seenItems);

    // ⑤ Déduplication sémantique & conceptuelle
    let unique = deduplicateQuestions(questions, seenItems);

    // Si pas assez de questions uniques, boucler pour compléter le lot jusqu'à obtenir le nombre exact 'count'
    let retryAttempt = 0;
    while (unique.length < count && retryAttempt < 3) {
      retryAttempt++;
      const missing = count - unique.length;
      console.log(`🔄 [Tentative ${retryAttempt}/3] Regénération de ${missing} question(s) inédite(s) pour compléter le lot...`);

      const currentSeen = [
        ...seenItems,
        ...unique.map(q => ({
          text: q.text.trim(),
          answer: q.options && q.correctAnswerIndex !== undefined ? q.options[q.correctAnswerIndex].trim() : ''
        }))
      ];

      // Demander 1 ou 2 questions de plus pour donner de la marge à la déduplication
      const requestCount = Math.min(missing + 1, 5);
      const extraDraft = await generateDraft(finalDifficulty, topic, requestCount, ragContext, currentSeen);
      const newUnique = deduplicateQuestions(extraDraft, currentSeen);

      unique = [...unique, ...newUnique];
    }

    // Si après 3 tentatives il manque encore des questions, piocher dans le pool de secours pour garantir exactement 'count' questions
    if (unique.length < count) {
      const needed = count - unique.length;
      console.warn(`⚠️ [Quiz Agent] Complétion de ${needed} question(s) via le pool de secours Redis...`);
      const fallbackPool = await getQuestionsFromPool(finalDifficulty, topic, needed * 2);

      const seenTexts = new Set(unique.map(q => q.text.trim().toLowerCase()));
      const poolAdditions = fallbackPool.filter(q => !seenTexts.has(q.text.trim().toLowerCase()));

      unique = [...unique, ...poolAdditions].slice(0, count);
    }

    // ⑥ Réflexion / auto-vérification
    const verified = await reflectAndVerify(unique.slice(0, count), finalDifficulty);

    // ⑦ Enregistrements Redis (Historique joueur + Banque de secours de questions complètes)
    await addSeenQuestions(sessionId, verified);
    saveQuestionsToPool(verified, finalDifficulty, topic).catch(err => console.warn('Échec saveQuestionsToPool :', err.message));

    console.log('📋 Aperçu des questions finales générées :');
    verified.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.category}] ${q.text} (Rep: ${q.options[q.correctAnswerIndex]})`);
    });
    console.log('=======================================================\n');

    return verified;

  } catch (error) {
    console.warn(`⚠️ Indisponibilité IA Gemini (${error?.status || error?.message || 'Erreur'}). Basculement vers le secours Redis/Local...`);

    try {
      const fallbackQuestions = await getQuestionsFromPool(finalDifficulty, topic, count);
      if (fallbackQuestions && fallbackQuestions.length > 0) {
        console.log(`✅ Succès Fallback Redis : ${fallbackQuestions.length} questions restituées depuis le cache !`);
        return fallbackQuestions;
      }
    } catch (cacheErr) {
      console.warn('⚠️ Échec de la lecture du cache Redis :', cacheErr.message);
    }

    // Ultime secours : banque de questions statiques locales si Redis est vide
    const staticFallback = getStaticFallbackQuestions(finalDifficulty, count);
    if (staticFallback && staticFallback.length > 0) {
      console.log(`✅ Succès Fallback Statique : ${staticFallback.length} questions de secours locales restituées !`);
      return staticFallback;
    }

    throw error;
  }
}
