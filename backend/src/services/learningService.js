import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { redis } from '../config/redis.js';

const CACHE_SUMMARIES_KEY = 'learning:topics:summaries';
const CACHE_TTL_SECONDS = 3600; // 1 heure

/**
 * Convertit un document complet en résumé léger pour le catalogue/hub.
 */
function toTopicSummary(topic) {
  const unitsCount = topic.format === 'recit'
    ? (Array.isArray(topic.chapters) ? topic.chapters.length : 0)
    : (Array.isArray(topic.sections) ? topic.sections.length : 0);

  const unitHeadings = topic.format === 'recit' && Array.isArray(topic.chapters)
    ? topic.chapters.map(c => c.title || c.label).filter(Boolean)
    : (Array.isArray(topic.sections) ? topic.sections.map(s => s.heading).filter(Boolean) : []);

  return {
    id: topic.id,
    title: topic.title,
    subtitle: topic.subtitle || '',
    category: topic.category,
    icon: topic.icon || '📖',
    gradient: topic.gradient || 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    badge: topic.badge || '',
    summary: topic.summary || '',
    format: topic.format,
    order: topic.order ?? 999,
    revision: topic.revision ?? 1,
    quizCategoryTarget: topic.quizCategoryTarget,
    estimatedMinutes: topic.estimatedMinutes,
    totalUnits: unitsCount,
    unitHeadings,
  };
}

/**
 * Récupère les résumés légers de tous les sujets d'apprentissage depuis Firestore avec cache Redis.
 */
export async function getLearningTopicsSummaries(category = null) {
  // 1. Vérifier le cache Redis si disponible
  try {
    if (redis) {
      const cached = await redis.get(CACHE_SUMMARIES_KEY);
      if (cached) {
        const summaries = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (category) {
          return summaries.filter(s => s.category === category);
        }
        return summaries;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Échec lecture cache Redis summaries : ${err.message}`);
  }

  // 2. Interroger Firestore
  try {
    const snapshot = await getDocs(collection(db, 'learningTopics'));
    const allTopics = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.published !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    const summaries = allTopics.map(toTopicSummary);

    // 3. Mettre en cache Redis
    if (summaries.length > 0 && redis) {
      try {
        await redis.set(CACHE_SUMMARIES_KEY, JSON.stringify(summaries), { ex: CACHE_TTL_SECONDS });
      } catch (err) {
        console.warn(`⚠️ [Learning Service] Échec écriture cache Redis summaries : ${err.message}`);
      }
    }

    if (category) {
      return summaries.filter(s => s.category === category);
    }
    return summaries;
  } catch (err) {
    console.error(`❌ [Learning Service] Erreur Firestore : ${err.message}`);
    throw err;
  }
}

/**
 * Récupère un sujet spécifique complet par son ID depuis Firestore.
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
