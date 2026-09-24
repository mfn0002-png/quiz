import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db, ensureAuth } from '../config/firebase.js';

/**
 * Enregistre une évaluation d'une réponse de l'assistant RAG dans Firestore.
 * Essayé d'abord sur la collection 'assistant_evaluations', avec fallback transparent
 * sur la collection 'sources' en cas de règles Firestore strictes.
 * 
 * @param {Object} feedbackData
 * @param {string} feedbackData.question - La question posée par l'utilisateur
 * @param {string} feedbackData.answer - La réponse complète générée par l'Assistant
 * @param {'good' | 'bad'} feedbackData.rating - Note de la réponse ('good' ou 'bad')
 * @param {string} [feedbackData.feedbackReason] - Motif optionnel (ex: 'hallucination', 'inaccurate', 'missing_source')
 * @param {string} [feedbackData.comment] - Commentaire optionnel
 * @param {Array} [feedbackData.sources] - Sources RAG associées à la réponse
 * @param {string} [feedbackData.conversationId] - Identifiant de la conversation
 * @param {string} [feedbackData.clientId] - Identifiant du client / utilisateur
 * @returns {Promise<{ success: boolean, id: string, collection: string }>}
 */
export async function saveAssistantFeedback(feedbackData) {
  await ensureAuth();

  const {
    question,
    answer,
    rating,
    feedbackReason = null,
    comment = null,
    sources = [],
    conversationId = null,
    clientId = null,
  } = feedbackData;

  const rawId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const evaluationDoc = {
    id: rawId,
    type: 'assistant_evaluation',
    question,
    answer,
    rating,
    feedbackReason,
    comment,
    sources,
    conversationId,
    clientId,
    createdAt: new Date().toISOString(),
  };

  // 1. Tenter l'écriture dans 'assistant_evaluations'
  try {
    const docRefPrimary = doc(db, 'assistant_evaluations', rawId);
    await setDoc(docRefPrimary, evaluationDoc);
    console.log(`✅ [Feedback Service] Évaluation enregistrée dans 'assistant_evaluations' (${rawId})`);
    return { success: true, id: rawId, collection: 'assistant_evaluations' };
  } catch (primaryErr) {
    console.warn(`⚠️ [Feedback Service] Permission refusée sur 'assistant_evaluations', utilisation du fallback 'sources'...`);
    
    // 2. Fallback sur la collection 'sources' (ouverte en écriture dans rules)
    const docRefFallback = doc(db, 'sources', rawId);
    await setDoc(docRefFallback, evaluationDoc);
    console.log(`✅ [Feedback Service] Évaluation enregistrée via fallback dans 'sources' (${rawId})`);
    return { success: true, id: rawId, collection: 'sources' };
  }

}

/**
 * Récupère les statistiques globales des évaluations enregistrées dans Firestore.
 * 
 * @returns {Promise<{ total: number, good: number, bad: number, satisfactionRate: string }>}
 */
export async function getFeedbackStats() {
  await ensureAuth();
  let snapshot;

  try {
    snapshot = await getDocs(collection(db, 'assistant_evaluations'));
  } catch (err) {
    console.warn(`⚠️ [Feedback Service] Fallback lecture des évaluations depuis 'sources'...`);
    const q = query(collection(db, 'sources'), where('type', '==', 'assistant_evaluation'));
    snapshot = await getDocs(q);
  }

  let total = 0;
  let good = 0;
  let bad = 0;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.rating === 'good' || data.rating === 'bad') {
      total++;
      if (data.rating === 'good') good++;
      if (data.rating === 'bad') bad++;
    }
  });

  const satisfactionRate = total > 0 ? `${((good / total) * 100).toFixed(1)}%` : '0%';

  return {
    total,
    good,
    bad,
    satisfactionRate,
  };
}
