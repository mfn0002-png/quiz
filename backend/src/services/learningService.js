import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { adminDb } from '../config/firebaseAdmin.js';
import { redis } from '../config/redis.js';
import { getSupabaseClient } from './ragSupabaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_SUMMARIES_KEY = 'learning:topics:summaries';
const CACHE_TTL_SECONDS = 3600; // 1 heure

/**
 * Charge tous les fichiers JSON locaux sous data/learning en fallback
 */
function loadLocalTopics() {
  const learningDir = path.resolve(__dirname, '../../data/learning');
  const topics = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.json') && !entry.name.startsWith('all')) {
        try {
          const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (json.id && (json.format === 'fiche' || json.format === 'recit')) {
            topics.push(json);
          }
        } catch {}
      }
    }
  }

  scanDir(learningDir);
  return topics.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function findLocalTopic(topicId) {
  const all = loadLocalTopics();
  return all.find(t => t.id === topicId) || null;
}

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
 * Récupère les résumés légers de tous les sujets d'apprentissage depuis Firestore avec cache Redis et fallback local.
 */
export async function getLearningTopicsSummaries(category = null) {
  // 1. Cache Redis
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
  let allTopics = [];
  try {
    if (adminDb) {
      const snapshot = await adminDb.collection('learningTopics').get();
      allTopics = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.published !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    } else {
      const snapshot = await getDocs(collection(db, 'learningTopics'));
      allTopics = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.published !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Échec lecture Firestore, utilisation des fichiers JSON locaux : ${err.message}`);
  }

  // Fallback si Firestore est vide ou a échoué
  if (allTopics.length === 0) {
    allTopics = loadLocalTopics();
  }

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
}

/**
 * Récupère un sujet spécifique complet par son ID depuis Firestore (avec fallback local).
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

  try {
    if (adminDb) {
      const snap = await adminDb.collection('learningTopics').doc(topicId).get();
      if (snap.exists) {
        const topic = { id: snap.id, ...snap.data() };
        if (redis) {
          try {
            await redis.set(cacheKey, JSON.stringify(topic), { ex: CACHE_TTL_SECONDS });
          } catch {}
        }
        return topic;
      }
    } else {
      const docRef = doc(db, 'learningTopics', topicId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const topic = { id: snap.id, ...snap.data() };
        if (redis) {
          try {
            await redis.set(cacheKey, JSON.stringify(topic), { ex: CACHE_TTL_SECONDS });
          } catch {}
        }
        return topic;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Échec Firestore pour ${topicId}, fallback JSON local : ${err.message}`);
  }

  // Fallback fichier local
  const local = findLocalTopic(topicId);
  if (local) return local;

  const err = new Error(`Topic '${topicId}' non trouvé`);
  err.statusCode = 404;
  throw err;
}

/**
 * Récupère tous les sujets (Firestore et locaux) avec métadonnées d'administration.
 */
export async function getAllLearningTopicsAdmin() {
  const localTopics = loadLocalTopics().map(t => ({
    ...toTopicSummary(t),
    source: 'local',
    published: t.published !== false,
  }));

  let firestoreTopics = [];
  try {
    if (adminDb) {
      const snapshot = await adminDb.collection('learningTopics').get();
      firestoreTopics = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...toTopicSummary({ id: d.id, ...data }),
          source: 'firestore',
          published: data.published !== false,
          createdAt: data.createdAt,
        };
      });
    } else {
      const snapshot = await getDocs(collection(db, 'learningTopics'));
      firestoreTopics = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...toTopicSummary({ id: d.id, ...data }),
          source: 'firestore',
          published: data.published !== false,
          createdAt: data.createdAt,
        };
      });
    }
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Erreur lecture admin Firestore : ${err.message}`);
  }

  // Fusionner en donnant priorité à Firestore si même ID
  const map = new Map();
  localTopics.forEach(t => map.set(t.id, t));
  firestoreTopics.forEach(t => map.set(t.id, t)); // Ecrase local si présent dans Firestore

  return Array.from(map.values()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Supprime une fiche / un sujet d'apprentissage :
 * 1. Supprime le document dans Firestore
 * 2. Invalide les caches Redis
 * 3. Supprime les chunks vectorisés associés dans Supabase (RAG)
 */
export async function deleteLearningTopic(topicId) {
  if (!topicId) {
    throw new Error("L'identifiant du sujet (topicId) est obligatoire pour la suppression.");
  }

  console.log(`🗑️ [Learning Service] Suppression du sujet '${topicId}'...`);

  let deletedFromFirestore = false;

  // 1. Suppression Firestore
  try {
    if (adminDb) {
      await adminDb.collection('learningTopics').doc(topicId).delete();
      deletedFromFirestore = true;
    } else {
      await deleteDoc(doc(db, 'learningTopics', topicId));
      deletedFromFirestore = true;
    }
    console.log(`✅ [Learning Service] Document '${topicId}' supprimé de Firestore.`);
  } catch (err) {
    console.warn(`⚠️ [Learning Service] Échec suppression Firestore '${topicId}' : ${err.message}`);
  }

  // 2. Invalidation du cache Redis
  if (redis) {
    try {
      await redis.del(CACHE_SUMMARIES_KEY);
      await redis.del(`learning:topic:${topicId}`);
      console.log(`✅ [Learning Service] Cache Redis invalidé pour '${topicId}'.`);
    } catch (err) {
      console.warn(`⚠️ [Learning Service] Échec invalidation Redis : ${err.message}`);
    }
  }

  // 3. Suppression des chunks RAG dans Supabase
  let deletedRagChunks = 0;
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('documents')
        .delete()
        .contains('metadata', { firebaseDocId: topicId });

      if (error) {
        console.warn(`⚠️ [Learning Service] Erreur nettoyage Supabase RAG : ${error.message}`);
      } else {
        console.log(`✅ [Learning Service] Chunks Supabase RAG nettoyés pour '${topicId}'.`);
      }
    }
  } catch (err) {
    // Non-bloquant si Supabase n'est pas initialisé
  }

  return {
    success: true,
    topicId,
    deletedFromFirestore,
    message: `Le sujet '${topicId}' a été supprimé avec succès.`,
  };
}

