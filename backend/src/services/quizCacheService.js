/**
 * quizCacheService.js
 *
 * Service de cache et banque de questions de secours pour Redis.
 * Permet d'alimenter une réserve de questions complètes (avec explications & mots-clés)
 * et d'y piocher immédiatement si le quota Gemini (429) est dépassé.
 */

import { redis, memoryStore } from '../config/redis.js';

const TTL_CACHE_POOL = 2_592_000; // 30 jours dans Redis

/**
 * Normalise la clé de stockage pour la banque de questions.
 */
function getPoolKey(difficulty, topic) {
  const normDiff = (difficulty || 'Débutant').toLowerCase().trim();
  const normTopic = (topic || 'Mélange').toLowerCase().trim();
  return `quiz:pool:${normDiff}:${normTopic}`;
}

/**
 * Enregistre un lot de questions entièrement vérifiées dans la banque de secours Redis.
 * @param {Array} questions - Questions complètes (text, options, correctAnswerIndex, explanation, keywords...)
 * @param {string} difficulty
 * @param {string} topic
 */
export async function saveQuestionsToPool(questions, difficulty, topic) {
  if (!Array.isArray(questions) || questions.length === 0) return;

  const key = getPoolKey(difficulty, topic);
  console.log(`💾 [Quiz Cache] Sauvegarde de ${questions.length} questions complètes dans le pool Redis : "${key}"`);

  let existing = [];
  if (redis) {
    existing = (await redis.get(key)) || [];
  } else {
    existing = memoryStore.get(key) || [];
  }

  // Éviter les doublons exacts par le texte de la question
  const existingTexts = new Set(existing.map(q => q.text.trim().toLowerCase()));
  const newQuestions = questions.filter(q => !existingTexts.has(q.text.trim().toLowerCase()));

  const updatedPool = [...existing, ...newQuestions].slice(-100); // Conserver jusqu'à 100 questions par catégorie

  if (redis) {
    await redis.set(key, updatedPool, { ex: TTL_CACHE_POOL });
  } else {
    memoryStore.set(key, updatedPool);
  }
}

/**
 * Récupère des questions de secours depuis le pool Redis (en cas d'erreur 429 Gemini).
 * @param {string} difficulty
 * @param {string} topic
 * @param {number} count
 * @returns {Promise<Array>} Liste de questions complètes avec explications
 */
export async function getQuestionsFromPool(difficulty, topic, count = 5) {
  const key = getPoolKey(difficulty, topic);
  const fallbackKey = getPoolKey('débutant', 'mélange');

  let pool = [];
  if (redis) {
    pool = (await redis.get(key)) || (await redis.get(fallbackKey)) || [];
  } else {
    pool = memoryStore.get(key) || memoryStore.get(fallbackKey) || [];
  }

  if (pool.length === 0) {
    console.warn(`⚠️ [Quiz Cache] Aucun fallback disponible dans "${key}".`);
    return [];
  }

  // Mélanger le pool et prendre le nombre demandé
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  console.log(`📦 [Quiz Cache Fallback] ${selected.length} questions complètes avec explications extraites du pool Redis ("${key}")`);
  return selected;
}
