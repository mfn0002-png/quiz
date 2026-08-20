/**
 * livesService.ts
 *
 * Gestionnaire du système de Vies / Énergie Globale (5/5 Vies Max).
 * - Persistance dans localStorage (survit aux rafraîchissements)
 * - Recharge automatique de +1 Vie toutes les 5 minutes (300 secondes)
 */

import { MAX_GLOBAL_LIVES, RECHARGE_TIME_SECONDS } from '../constants';

const LIVES_STORAGE_KEY = 'quiz_global_lives_count';
const LAST_RECHARGE_KEY = 'quiz_global_lives_last_recharge';

export interface LivesState {
  lives: number;
  nextRechargeSeconds: number; // Temps en secondes avant la prochaine vie
  isMaxLives: boolean;
}

/**
 * Calcule l'état actuel des vies globales avec prise en compte du temps écoulé.
 */
export function getGlobalLivesState(): LivesState {
  const now = Date.now();
  let savedLivesStr = localStorage.getItem(LIVES_STORAGE_KEY);
  let savedLastRechargeStr = localStorage.getItem(LAST_RECHARGE_KEY);

  let currentLives = savedLivesStr !== null ? parseInt(savedLivesStr, 10) : MAX_GLOBAL_LIVES;
  let lastRechargeTime = savedLastRechargeStr !== null ? parseInt(savedLastRechargeStr, 10) : now;

  if (isNaN(currentLives) || currentLives > MAX_GLOBAL_LIVES) {
    currentLives = MAX_GLOBAL_LIVES;
  }

  // Si on est déjà au max (5/5 vies), caler la référence temps sur l'instant présent
  if (currentLives >= MAX_GLOBAL_LIVES) {
    localStorage.setItem(LIVES_STORAGE_KEY, MAX_GLOBAL_LIVES.toString());
    localStorage.setItem(LAST_RECHARGE_KEY, now.toString());
    return {
      lives: MAX_GLOBAL_LIVES,
      nextRechargeSeconds: 0,
      isMaxLives: true,
    };
  }

  // Calcul du temps écoulé depuis la dernière recharge (en secondes)
  const elapsedSeconds = Math.floor((now - lastRechargeTime) / 1000);
  const rechargeInterval = RECHARGE_TIME_SECONDS; // 300 secondes = 5 min

  if (elapsedSeconds >= rechargeInterval) {
    const livesToAdd = Math.floor(elapsedSeconds / rechargeInterval);
    currentLives = Math.min(MAX_GLOBAL_LIVES, currentLives + livesToAdd);
    
    // Mettre à jour le timestamp de la dernière recharge résiduelle
    const remainingSeconds = elapsedSeconds % rechargeInterval;
    lastRechargeTime = now - (remainingSeconds * 1000);

    localStorage.setItem(LIVES_STORAGE_KEY, currentLives.toString());
    localStorage.setItem(LAST_RECHARGE_KEY, lastRechargeTime.toString());
  }

  const isMaxLives = currentLives >= MAX_GLOBAL_LIVES;
  let nextRechargeSeconds = 0;
  if (!isMaxLives) {
    const currentElapsed = Math.floor((Date.now() - lastRechargeTime) / 1000);
    nextRechargeSeconds = Math.max(0, rechargeInterval - currentElapsed);
  }

  return {
    lives: currentLives,
    nextRechargeSeconds,
    isMaxLives,
  };
}

/**
 * Consomme 1 vie globale de la réserve.
 */
export function consumeGlobalLife(): LivesState {
  const currentState = getGlobalLivesState();
  if (currentState.lives <= 0) {
    return currentState;
  }

  const now = Date.now();
  const newLives = currentState.lives - 1;

  // Si on quitte le niveau max (ex: 5 -> 4), réinitialiser le minuteur de recharge à maintenant
  if (currentState.isMaxLives) {
    localStorage.setItem(LAST_RECHARGE_KEY, now.toString());
  }

  localStorage.setItem(LIVES_STORAGE_KEY, newLives.toString());
  return getGlobalLivesState();
}

/**
 * (Utilitaire / Dev) Recharge immédiatement la réserve à 5/5 Vies.
 */
export function refillGlobalLives(): LivesState {
  const now = Date.now();
  localStorage.setItem(LIVES_STORAGE_KEY, MAX_GLOBAL_LIVES.toString());
  localStorage.setItem(LAST_RECHARGE_KEY, now.toString());
  return getGlobalLivesState();
}
