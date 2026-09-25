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
const RECHARGE_INTERVAL_KEY = 'quiz_life_recharge_seconds';
const MAX_LIVES_KEY = 'quiz_max_lives';

export interface LivesState {
  lives: number;
  nextRechargeSeconds: number; // Temps en secondes avant la prochaine vie
  isMaxLives: boolean;
  maxLives: number;
  rechargeIntervalSeconds: number;
}

/**
 * Récupère l'intervalle configuré de recharge d'une vie (en secondes).
 */
export function getRechargeIntervalSeconds(): number {
  const saved = localStorage.getItem(RECHARGE_INTERVAL_KEY);
  if (saved !== null) {
    const val = parseInt(saved, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return RECHARGE_TIME_SECONDS;
}

/**
 * Récupère le nombre maximal configuré de vies.
 */
export function getMaxLives(): number {
  const saved = localStorage.getItem(MAX_LIVES_KEY);
  if (saved !== null) {
    const val = parseInt(saved, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return MAX_GLOBAL_LIVES;
}

/**
 * Met à jour la configuration globale des vies.
 */
export function setGlobalLifeConfig(config: { rechargeSeconds?: number; maxLives?: number }): void {
  if (typeof config.rechargeSeconds === 'number' && config.rechargeSeconds > 0) {
    localStorage.setItem(RECHARGE_INTERVAL_KEY, config.rechargeSeconds.toString());
  }
  if (typeof config.maxLives === 'number' && config.maxLives > 0) {
    localStorage.setItem(MAX_LIVES_KEY, config.maxLives.toString());
  }
}

/**
 * Calcule l'état actuel des vies globales avec prise en compte du temps écoulé.
 */
export function getGlobalLivesState(): LivesState {
  const now = Date.now();
  const maxLives = getMaxLives();
  const rechargeInterval = getRechargeIntervalSeconds();
  const savedLivesStr = localStorage.getItem(LIVES_STORAGE_KEY);
  const savedLastRechargeStr = localStorage.getItem(LAST_RECHARGE_KEY);

  let currentLives = savedLivesStr !== null ? parseInt(savedLivesStr, 10) : maxLives;
  let lastRechargeTime = savedLastRechargeStr !== null ? parseInt(savedLastRechargeStr, 10) : now;

  if (isNaN(currentLives) || currentLives > maxLives) {
    currentLives = maxLives;
  }

  // Si on est déjà au max, caler la référence temps sur l'instant présent
  if (currentLives >= maxLives) {
    localStorage.setItem(LIVES_STORAGE_KEY, maxLives.toString());
    localStorage.setItem(LAST_RECHARGE_KEY, now.toString());
    return {
      lives: maxLives,
      nextRechargeSeconds: 0,
      isMaxLives: true,
      maxLives,
      rechargeIntervalSeconds: rechargeInterval,
    };
  }

  // Calcul du temps écoulé depuis la dernière recharge (en secondes)
  const elapsedSeconds = Math.floor((now - lastRechargeTime) / 1000);

  if (elapsedSeconds >= rechargeInterval) {
    const livesToAdd = Math.floor(elapsedSeconds / rechargeInterval);
    currentLives = Math.min(maxLives, currentLives + livesToAdd);
    
    // Mettre à jour le timestamp de la dernière recharge résiduelle
    const remainingSeconds = elapsedSeconds % rechargeInterval;
    lastRechargeTime = now - (remainingSeconds * 1000);

    localStorage.setItem(LIVES_STORAGE_KEY, currentLives.toString());
    localStorage.setItem(LAST_RECHARGE_KEY, lastRechargeTime.toString());
  }

  const isMaxLives = currentLives >= maxLives;
  let nextRechargeSeconds = 0;
  if (!isMaxLives) {
    const currentElapsed = Math.floor((Date.now() - lastRechargeTime) / 1000);
    nextRechargeSeconds = Math.max(0, rechargeInterval - currentElapsed);
  }

  return {
    lives: currentLives,
    nextRechargeSeconds,
    isMaxLives,
    maxLives,
    rechargeIntervalSeconds: rechargeInterval,
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
 * (Utilitaire / Dev) Recharge immédiatement la réserve à Vies Max.
 */
export function refillGlobalLives(): LivesState {
  const now = Date.now();
  const max = getMaxLives();
  localStorage.setItem(LIVES_STORAGE_KEY, max.toString());
  localStorage.setItem(LAST_RECHARGE_KEY, now.toString());
  return getGlobalLivesState();
}
