/**
 * sessionService.js
 * Gestion des sessions via Upstash Redis (ou mémoire en fallback).
 *
 * Deux types de données :
 *   - Historique conversation assistant  (TTL 24h)
 *   - Questions quiz déjà vues           (TTL 7 jours, anti-doublon intelligent)
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
}

async function rDel(key) {
  if (redis) return await redis.del(key);
  memoryStore.delete(key);
}

// ─────────────────────────────────────────────
// Historique de conversation (Assistant Agent)
// ─────────────────────────────────────────────

export async function getHistory(sessionId) {
  const data = await rGet(`sess:${sessionId}:history`);
  return Array.isArray(data) ? data : [];
}

export async function saveHistory(sessionId, history) {
  await rSet(`sess:${sessionId}:history`, history, TTL_HISTORY);
}

export async function clearHistory(sessionId) {
  await rDel(`sess:${sessionId}:history`);
}

// ─────────────────────────────────────────────
// Questions déjà vues (Quiz Agent — Anti-doublon intelligent)
// Structure stockée : Array<{ text: string, answer: string }>
// ─────────────────────────────────────────────

export async function getSeenQuestions(sessionId) {
  const data = await rGet(`sess:${sessionId}:seen`);
  if (!Array.isArray(data)) return [];
  
  // Rétrocompatibilité : convertir les anciennes chaînes simples en objets { text, answer: '' }
  return data.map(item => {
    if (typeof item === 'string') return { text: item, answer: '' };
    return item;
  });
}

export async function addSeenQuestions(sessionId, questions) {
  const existing = await getSeenQuestions(sessionId);
  
  const newItems = questions.map(q => ({
    text: q.text.trim(),
    answer: q.options && q.correctAnswerIndex !== undefined ? q.options[q.correctAnswerIndex].trim() : '',
  }));

  // Déduplication de la mémoire par texte exact
  const seenTexts = new Set(existing.map(e => e.text.toLowerCase()));
  const filteredNew = newItems.filter(item => !seenTexts.has(item.text.toLowerCase()));

  const merged = [...existing, ...filteredNew].slice(-100); // Conserver les 100 dernières questions vues
  await rSet(`sess:${sessionId}:seen`, merged, TTL_SEEN);
}
