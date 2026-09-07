/**
 * sessionService.js
 * Gestion des sessions via Upstash Redis (ou mémoire en fallback).
 *
 * Données :
 *   - Historique conversation assistant  (TTL 30 jours, multi-conversations)
 *   - Questions quiz déjà vues           (TTL 7 jours, anti-doublon intelligent)
 */

import { redis, memoryStore } from '../config/redis.js';

const TTL_HISTORY = 2_592_000;   // 30 jours (2592000s)
const TTL_SEEN    = 604_800;     // 7 jours

// ─────────────────────────────────────────────
// Helpers Redis/Memory
// ─────────────────────────────────────────────

async function rGet(key) {
  if (redis) {
    try {
      return await redis.get(key);
    } catch (err) {
      console.warn(`⚠️ [SessionService Redis rGet error, fallback memoryStore] ${err.message}`);
    }
  }
  return memoryStore.get(key) ?? null;
}

async function rSet(key, value, ttl) {
  if (redis) {
    try {
      return await redis.set(key, value, { ex: ttl });
    } catch (err) {
      console.warn(`⚠️ [SessionService Redis rSet error, fallback memoryStore] ${err.message}`);
    }
  }
  memoryStore.set(key, value);
}

async function rDel(key) {
  if (redis) {
    try {
      return await redis.del(key);
    } catch (err) {
      console.warn(`⚠️ [SessionService Redis rDel error, fallback memoryStore] ${err.message}`);
    }
  }
  memoryStore.delete(key);
}

// ─────────────────────────────────────────────
// Multi-Conversations Assistant Agent
// ─────────────────────────────────────────────

/**
 * Récupère la liste des conversations enregistrées d'un client
 */
export async function getConversations(clientId) {
  if (!clientId) return [];
  const data = await rGet(`sess:${clientId}:conversations`);
  return Array.isArray(data) ? data : [];
}

/**
 * Récupère l'historique d'une conversation par son conversationId (ou legacy sessionId)
 */
export async function getHistory(conversationId) {
  if (!conversationId) return [];
  // Essayer d'abord la clé conversation dédiée
  let data = await rGet(`conv:${conversationId}:history`);
  if (!Array.isArray(data) || data.length === 0) {
    // Fallback legacy sur la clé de session
    data = await rGet(`sess:${conversationId}:history`);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Sauvegarde les messages d'une conversation et met à jour l'index des conversations
 */
export async function saveConversation(clientId, conversationId, title, messages) {
  if (!conversationId) return;

  // 1. Sauvegarder les messages de la conversation
  await rSet(`conv:${conversationId}:history`, messages, TTL_HISTORY);

  // 2. Si un clientId est fourni, mettre à jour l'index des conversations
  if (clientId) {
    const conversations = await getConversations(clientId);
    const existingIndex = conversations.findIndex(c => c.id === conversationId);

    const now = new Date().toISOString();
    const userMessages = messages.filter(m => m.role === 'user');
    const autoTitle = title || (userMessages.length > 0 ? userMessages[0].content.slice(0, 45) : 'Nouvelle discussion');

    const convItem = {
      id: conversationId,
      title: autoTitle,
      createdAt: existingIndex >= 0 ? conversations[existingIndex].createdAt : now,
      lastUpdated: now,
      messageCount: messages.length,
    };

    if (existingIndex >= 0) {
      conversations[existingIndex] = convItem;
    } else {
      conversations.unshift(convItem);
    }

    // Conserver jusqu'à 50 conversations par client
    const updatedList = conversations.slice(0, 50);
    await rSet(`sess:${clientId}:conversations`, updatedList, TTL_HISTORY);
  }
}

/**
 * Rétrocompatibilité saveHistory (session unique)
 */
export async function saveHistory(sessionId, history) {
  await rSet(`sess:${sessionId}:history`, history, TTL_HISTORY);
  await saveConversation(sessionId, sessionId, null, history);
}

/**
 * Supprime l'historique d'une session ou conversation spécifique
 */
export async function clearHistory(conversationId) {
  if (!conversationId) return;
  await rDel(`conv:${conversationId}:history`);
  await rDel(`sess:${conversationId}:history`);
}

/**
 * Supprime une conversation spécifique pour un client
 */
export async function deleteConversation(clientId, conversationId) {
  await clearHistory(conversationId);
  if (clientId) {
    const conversations = await getConversations(clientId);
    const filtered = conversations.filter(c => c.id !== conversationId);
    await rSet(`sess:${clientId}:conversations`, filtered, TTL_HISTORY);
  }
}

// ─────────────────────────────────────────────
// Questions déjà vues (Quiz Agent — Anti-doublon intelligent)
// ─────────────────────────────────────────────

export async function getSeenQuestions(sessionId) {
  const data = await rGet(`sess:${sessionId}:seen`);
  if (!Array.isArray(data)) return [];
  
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

  const seenTexts = new Set(existing.map(e => e.text.toLowerCase()));
  const filteredNew = newItems.filter(item => !seenTexts.has(item.text.toLowerCase()));

  const merged = [...existing, ...filteredNew].slice(-100);
  await rSet(`sess:${sessionId}:seen`, merged, TTL_SEEN);
}
