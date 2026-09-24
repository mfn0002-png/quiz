import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';

/**
 * Enregistre une évaluation d'une réponse de l'assistant RAG dans Firestore.
 * Stocké dans la collection 'sources' (avec type: 'assistant_evaluation')
 * pour garanties de permissions d'écriture.
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

  const docRef = doc(db, 'sources', rawId);
  await setDoc(docRef, evaluationDoc);
  console.log(`✅ [Feedback Service] Évaluation enregistrée dans Firestore (ID: ${rawId}, Note: ${rating})`);
  return { success: true, id: rawId, collection: 'sources' };
}

/**
 * Récupère les statistiques globales des évaluations enregistrées dans Firestore.
 * 
 * @returns {Promise<{ total: number, good: number, bad: number, satisfactionRate: string }>}
 */
export async function getFeedbackStats() {
  const q = query(collection(db, 'sources'), where('type', '==', 'assistant_evaluation'));
  const snapshot = await getDocs(q);

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
