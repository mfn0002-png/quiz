/**
 * quizAgent.js
 *
 * Agent de génération de questions avec pipeline multi-étapes :
 *   ① Analyse + contexte islamique optionnel (Knowledge Tool)
 *   ② Génération du draft de questions
 *   ③ Déduplication Redis (anti-doublon inter-sessions)
 *   ④ Réflexion / auto-vérification (Reflection Agent)
 *   ⑤ Sauvegarde Redis pour les futures sessions
 *   - Logging structuré complet
 */

import { SchemaType } from '@google/generative-ai';
import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';
import { getSeenQuestions, addSeenQuestions } from './sessionService.js';

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
// Étape ① : Knowledge Tool (contexte islamique)
// ─────────────────────────────────────────────

async function getIslamicContext(topic) {
  if (topic === 'Mélange') return null;

  console.log(`📚 [Quiz Agent - Step 1] Recherche de connaissances pour le thème : "${topic}"`);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(
    `En 4-5 phrases précises, résume les connaissances islamiques fondamentales sur "${topic}".
Inclus des faits vérifiables : dates, nombres, noms, références coraniques si pertinent.
Ce résumé servira de base pour créer des questions de quiz islamique.
Réponds en français correct.`
  );
  const context = result.response.text();
  console.log(`   💡 Contexte extrait (${context.length} car.) : "${context.slice(0, 120)}..."`);
  return context;
}

// ─────────────────────────────────────────────
// Étape ② : Génération du draft
// ─────────────────────────────────────────────

async function generateDraft(difficulty, topic, count, context, seenKeys) {
  console.log(`📝 [Quiz Agent - Step 2] Génération draft Gemini (${count} Q | ${difficulty} | ${topic})`);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: QUESTION_SCHEMA,
    },
  });

  const contextBlock = context
    ? `\n📚 Contexte de référence :\n${context}\n`
    : '';

  const seenBlock = seenKeys.length > 0
    ? `\n⛔ ÉVITE ABSOLUMENT ces sujets déjà posés : ${seenKeys.slice(-30).join(' | ')}\n`
    : '';

  const categoryInstruction = topic === 'Mélange'
    ? 'Varie les catégories (Piliers de l\'Islam, Coran, Prophètes, Histoire islamique, Pratiques).'
    : `Toutes les questions portent spécifiquement sur : "${topic}".`;

  const prompt = `Tu es un expert de l'Islam et un excellent pédagogue.
Génère EXACTEMENT ${count} questions QCM sur la religion islamique.
Niveau : "${difficulty}" — ${DIFFICULTY_GUIDE[difficulty] || ''}
${categoryInstruction}
${contextBlock}${seenBlock}
RÈGLES STRICTES :
- Exactement 4 options par question
- La bonne réponse (correctAnswerIndex) doit être INDISCUTABLEMENT correcte
- Les distracteurs doivent être plausibles mais clairement faux
- Explications claires, pédagogiques, en 2-3 phrases
- Identifie les mots-clés islamiques dans chaque explication
- Rédige TOUT en français correct avec accents (é, à, è, ô, ç). JAMAIS d'entités HTML.`;

  const result = await withRetry(() => model.generateContent(prompt));
  const questions = JSON.parse(result.response.text());
  console.log(`   ✓ Draft brut généré : ${questions.length} questions`);
  return questions;
}

// ─────────────────────────────────────────────
// Étape ③ : Déduplication Redis
// ─────────────────────────────────────────────

function deduplicateQuestions(questions, seenKeys) {
  const filtered = questions.filter(q => {
    const key = q.text.trim().toLowerCase();
    return !seenKeys.some(seen => seen.toLowerCase() === key);
  });
  console.log(`🔍 [Quiz Agent - Step 3] Déduplication Redis : ${questions.length} → ${filtered.length} questions uniques`);
  return filtered;
}

// ─────────────────────────────────────────────
// Étape ④ : Réflexion / auto-vérification
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
 * Pipeline complet de génération de questions avec auto-vérification.
 *
 * @param {string} difficulty - Niveau de difficulté
 * @param {string} topic      - Catégorie / thème
 * @param {number} count      - Nombre de questions
 * @param {string} sessionId  - Session Redis (anti-doublon)
 */
export async function runQuizAgent(difficulty, topic, count, sessionId) {
  console.log('\n🧩 ==================== QUIZ AGENT ====================');
  console.log(`🆔 Session ID : ${sessionId}`);
  console.log(`🎯 Demande    : ${count} questions | Niveau: ${difficulty} | Thème: ${topic}`);

  // ① Contexte islamique (Knowledge Tool)
  const context = await getIslamicContext(topic);

  // ② Questions déjà vues (anti-doublon)
  const seenKeys = await getSeenQuestions(sessionId);
  console.log(`📜 Questions déjà en mémoire Redis pour ce joueur : ${seenKeys.length}`);

  // ③ Génération du draft
  let questions = await generateDraft(difficulty, topic, count, context, seenKeys);

  // ④ Déduplication
  let unique = deduplicateQuestions(questions, seenKeys);

  // Si pas assez de questions uniques, regénérer les manquantes
  if (unique.length < count) {
    const missing = count - unique.length;
    console.log(`🔄 Regénération de ${missing} questions manquantes pour compléter le lot...`);
    const allSeenWithNew = [...seenKeys, ...questions.map(q => q.text.trim().toLowerCase().slice(0, 60))];
    const extra = await generateDraft(difficulty, topic, missing, context, allSeenWithNew);
    unique = [...unique, ...deduplicateQuestions(extra, allSeenWithNew)].slice(0, count);
  }

  // ⑤ Réflexion / auto-vérification
  const verified = await reflectAndVerify(unique.slice(0, count), difficulty);

  // ⑥ Sauvegarder dans Redis (anti-doublon pour les prochaines sessions)
  await addSeenQuestions(sessionId, verified);
  console.log(`💾 ${verified.length} nouvelles questions enregistrées dans Redis (anti-doublon 7 jours)`);

  console.log('📋 Aperçu des questions finales générées :');
  verified.forEach((q, i) => {
    console.log(`   ${i + 1}. [${q.category}] ${q.text} (Rep: ${q.options[q.correctAnswerIndex]})`);
  });
  console.log('=======================================================\n');

  return verified;
}
