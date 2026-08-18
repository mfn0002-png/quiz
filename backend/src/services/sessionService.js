/**
 * sessionService.js
 * Gestion des sessions via Upstash Redis (ou mémoire en fallback).
 *
 * Deux types de données :
 *   - Historique conversation assistant  (TTL 24h)
 *   - Questions quiz déjà vues           (TTL 7 jours, anti-doublon)
 */

import { redis, memoryStore } from '../config/redis.js';

const TTL_HISTORY = 86_400;      // 24 heures
const TTL_SEEN   = 604_800;      // 7 jours

// ─────────────────────────────────────────────
// Helpers Redis/Memory
// ─────────────────────────────────────────────

async function rGet(key) {
  if (redis) return await redis.get(key);           // @upstash/redis auto-désérialise JSON
  return memoryStore.get(key) ?? null;
}

async function rSet(key, value, ttl) {
  if (redis) return await redis.set(key, value, { ex: ttl });
  memoryStore.set(key, value);
  // Pas de TTL réel en mémoire, mais acceptable en dev
}

async function rDel(key) {
  if (redis) return await redis.del(key);
  memoryStore.delete(key);
}

// ─────────────────────────────────────────────
// Historique de conversation (Assistant Agent)
// Format Gemini : [{ role, parts: [{ text }] }]
// ─────────────────────────────────────────────

/**
 * Récupère l'historique simplifié d'une session.
 * @returns {Array<{role: 'user'|'assistant', content: string}>}
 */
export async function getHistory(sessionId) {
  const data = await rGet(`sess:${sessionId}:history`);
  return Array.isArray(data) ? data : [];
}

/**
 * Sauvegarde l'historique (format simplifié : role + content texte).
 */
export async function saveHistory(sessionId, history) {
  await rSet(`sess:${sessionId}:history`, history, TTL_HISTORY);
}

/**
 * Efface l'historique d'une session (bouton "Nouvelle conversation").
 */
export async function clearHistory(sessionId) {
  await rDel(`sess:${sessionId}:history`);
}

// ─────────────────────────────────────────────
// Questions déjà vues (Quiz Agent — anti-doublon)
// ─────────────────────────────────────────────

export async function getSeenQuestions(sessionId) {
  const data = await rGet(`sess:${sessionId}:seen`);
  return Array.isArray(data) ? data : [];
}

export async function addSeenQuestions(sessionId, questions) {
  const existing = await getSeenQuestions(sessionId);
  const newKeys  = questions.map(q => q.text.trim().toLowerCase());
  const merged   = [...new Set([...existing, ...newKeys])];
  await rSet(`sess:${sessionId}:seen`, merged, TTL_SEEN);
}

// ─────────────────────────────────────────────
// (PENDING / COMMENTÉ) Anti-doublon Global Multi-Joueurs
// Pour activer l'anti-doublon global entre tous les utilisateurs en temps réel :
// Décommentez les fonctions ci-dessous et leur appel dans quizAgent.js.
// ─────────────────────────────────────────────

/*
const TTL_GLOBAL_SEEN = 7200; // 2 heures

export async function getGlobalSeenQuestions() {
  const data = await rGet('global:recent_questions');
  return Array.isArray(data) ? data : [];
}

export async function addGlobalSeenQuestions(questions) {
  const existing = await getGlobalSeenQuestions();
  const newKeys  = questions.map(q => q.text.trim().toLowerCase());
  const merged   = [...new Set([...existing, ...newKeys])];
  await rSet('global:recent_questions', merged, TTL_GLOBAL_SEEN);
}
*/
