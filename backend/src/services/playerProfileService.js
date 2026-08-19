/**
 * playerProfileService.js
 *
 * Service de suivi du profil joueur et d'apprentissage adaptatif.
 * - TTL Redis : 30 jours
 * - Règle de 2 erreurs consécutives pour rétrograder la difficulté
 * - Ajustement automatique du niveau si difficulté === 'Auto'
 */

import { redis, memoryStore } from '../config/redis.js';

const TTL_PLAYER_PROFILE = 2_592_000; // 30 jours (30 * 24 * 3600 secondes)

const LEVELS = ['Débutant', 'Intermédiaire', 'Expert'];

/**
 * Lit le profil joueur depuis Redis.
 */
export async function getPlayerProfile(sessionId) {
  const key = `sess:${sessionId}:profile`;
  let data = null;
  if (redis) {
    data = await redis.get(key);
  } else {
    data = memoryStore.get(key) ?? null;
  }

  return data || {
    recommendedLevel: 'Débutant',
    consecutiveErrors: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    categoryStats: {},
  };
}

/**
 * Enregistre le profil mis à jour dans Redis (TTL 30j).
 */
export async function savePlayerProfile(sessionId, profile) {
  const key = `sess:${sessionId}:profile`;
  if (redis) {
    await redis.set(key, profile, { ex: TTL_PLAYER_PROFILE });
  } else {
    memoryStore.set(key, profile);
  }
}

/**
 * Détermine la difficulté recommandée pour un joueur.
 * @param {string} sessionId
 * @param {string} requestedDifficulty - 'Auto', 'Débutant', 'Intermédiaire', ou 'Expert'
 * @returns {Promise<string>} La difficulté finale à utiliser
 */
export async function resolveDifficulty(sessionId, requestedDifficulty) {
  if (requestedDifficulty && requestedDifficulty !== 'Auto') {
    return requestedDifficulty; // Respect du choix manuel de l'utilisateur
  }

  const profile = await getPlayerProfile(sessionId);
  console.log(`🎯 [Adaptive Agent] Niveau auto déterminé pour session ${sessionId} : ${profile.recommendedLevel} (Série d'erreurs : ${profile.consecutiveErrors})`);
  return profile.recommendedLevel || 'Débutant';
}

/**
 * Enregistre les résultats d'un quiz pour mettre à jour l'apprentissage adaptatif.
 * @param {string} sessionId
 * @param {Array<{ questionId: number, isCorrect: boolean, category: string }>} results
 */
export async function updatePlayerProfile(sessionId, results) {
  if (!Array.isArray(results) || results.length === 0) return;

  const profile = await getPlayerProfile(sessionId);

  let currentLevelIdx = LEVELS.indexOf(profile.recommendedLevel);
  if (currentLevelIdx === -1) currentLevelIdx = 0;

  let consecutiveErrors = profile.consecutiveErrors || 0;

  for (const item of results) {
    profile.totalAnswered += 1;
    if (item.isCorrect) {
      profile.totalCorrect += 1;
      consecutiveErrors = 0; // Réinitialise la série d'erreurs
    } else {
      consecutiveErrors += 1;
    }

    // Statistiques par catégorie
    const cat = item.category || 'Général';
    if (!profile.categoryStats[cat]) {
      profile.categoryStats[cat] = { answered: 0, correct: 0 };
    }
    profile.categoryStats[cat].answered += 1;
    if (item.isCorrect) profile.categoryStats[cat].correct += 1;
  }

  profile.consecutiveErrors = consecutiveErrors;

  // 🔴 Règle : 2 erreurs consécutives = baisse d'un niveau de difficulté
  if (consecutiveErrors >= 2 && currentLevelIdx > 0) {
    currentLevelIdx -= 1;
    profile.recommendedLevel = LEVELS[currentLevelIdx];
    profile.consecutiveErrors = 0; // Réinitialiser après rétrogradation
    console.log(`📉 [Adaptive Agent] 2 erreurs consécutives atteintes ! Niveau abaissé à : ${profile.recommendedLevel}`);
  }
  // 🟢 Règle : Taux de réussite >= 80% sur au moins 5 questions = montée d'un niveau
  else if (profile.totalAnswered >= 5) {
    const accuracy = profile.totalCorrect / profile.totalAnswered;
    if (accuracy >= 0.8 && currentLevelIdx < LEVELS.length - 1) {
      currentLevelIdx += 1;
      profile.recommendedLevel = LEVELS[currentLevelIdx];
      console.log(`📈 [Adaptive Agent] Excellent taux de réussite (${Math.round(accuracy * 100)}%) ! Niveau augmenté à : ${profile.recommendedLevel}`);
    }
  }

  await savePlayerProfile(sessionId, profile);
  return profile;
}
