import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { redis } from '../config/redis.js';

const CACHE_KEY = 'learning:topics:all';
const CACHE_TTL_SECONDS = 3600; // 1 heure

/**
 * Récupère tous les sujets d'apprentissage depuis Firestore avec cache Redis.
 */
export async function getLearningTopics() {
  // 1. Vérifier le cache Redis si disponible
  try {
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Échec lecture cache Redis : ${err.message}`);
  }

  // 2. Interroger Firestore
  try {
    const snapshot = await getDocs(collection(db, 'learningTopics'));
    const topics = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.published !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // 3. Mettre en cache Redis
    if (topics.length > 0 && redis) {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(topics), { ex: CACHE_TTL_SECONDS });
      } catch (err) {
        console.warn(`⚠️ [Learning Service] Échec écriture cache Redis : ${err.message}`);
      }
    }

    return topics;
  } catch (err) {
    console.error(`❌ [Learning Service] Erreur Firestore : ${err.message}`);
    throw err;
  }
}

/**
 * Récupère un sujet spécifique par son ID depuis Firestore.
 */
export async function getLearningTopicById(topicId) {
  const cacheKey = `learning:topic:${topicId}`;

  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Échec lecture cache topic : ${err.message}`);
  }

  const docRef = doc(db, 'learningTopics', topicId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    const err = new Error(`Topic '${topicId}' non trouvé`);
    err.statusCode = 404;
    throw err;
  }

  const topic = { id: snap.id, ...snap.data() };

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(topic), { ex: CACHE_TTL_SECONDS });
    } catch {}
  }

  return topic;
}
