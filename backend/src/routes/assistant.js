import { Router } from 'express';
import { runAssistantAgent } from '../services/assistantAgent.js';
import { clearHistory, getHistory, getConversations, deleteConversation } from '../services/sessionService.js';
import { saveAssistantFeedback, getFeedbackStats } from '../services/feedbackService.js';
import { validate, validateParams } from '../middleware/validate.js';
import { chatSchema, sessionIdParamsSchema, feedbackSchema } from '../validation/schemas.js';

const router = Router();

// POST /api/assistant/chat
router.post('/chat', validate(chatSchema), async (req, res) => {
  const { question, conversationId, sessionId, clientId } = req.body;
  const activeClientId = clientId || sessionId || 'anonymous';
  const activeConvId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const result = await runAssistantAgent(activeConvId, question, activeClientId);
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur Assistant Agent :', error.message);

    const msg   = error?.message || '';
    const is429 = msg.includes('429') || msg.toLowerCase().includes('quota');

    if (is429) {
      return res.status(429).json({
        error: "Le quota quotidien de l'IA est atteint. Réessayez dans quelques heures.",
        retryAfter: 3600,
      });
    }

    res.status(500).json({ error: "Erreur serveur de l'assistant IA." });
  }
});

// GET /api/assistant/conversations/:clientId
// Récupère la liste de toutes les conversations d'un utilisateur/client
router.get('/conversations/:clientId', validateParams(sessionIdParamsSchema), async (req, res) => {
  const { clientId } = req.params;

  try {
    const conversations = await getConversations(clientId);
    res.json({ conversations });
  } catch (error) {
    console.error('Erreur getConversations :', error);
    res.status(500).json({ error: 'Erreur récupération des conversations.' });
  }
});

// GET /api/assistant/history/:sessionId
// Récupère l'historique de conversation d'une session ou conversationId depuis Redis
router.get('/history/:sessionId', validateParams(sessionIdParamsSchema), async (req, res) => {
  const { sessionId } = req.params;

  try {
    const history = await getHistory(sessionId);
    res.json({ history });
  } catch (error) {
    console.error('Erreur getHistory :', error);
    res.status(500).json({ error: 'Erreur récupération historique.' });
  }
});

// DELETE /api/assistant/session/:sessionId
// Réinitialise l'historique d'une session
router.delete('/session/:sessionId', validateParams(sessionIdParamsSchema), async (req, res) => {
  const { sessionId } = req.params;

  try {
    await clearHistory(sessionId);
    res.json({ success: true, message: 'Session réinitialisée avec succès.' });
  } catch (error) {
    console.error('Erreur clearHistory :', error);
    res.status(500).json({ error: 'Erreur réinitialisation de la session.' });
  }
});

// DELETE /api/assistant/conversation/:clientId/:conversationId
// Supprime une conversation spécifique sans toucher aux autres
router.delete('/conversation/:clientId/:conversationId', async (req, res) => {
  const { clientId, conversationId } = req.params;

  try {
    await deleteConversation(clientId, conversationId);
    res.json({ success: true, message: 'Conversation supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur deleteConversation :', error);
    res.status(500).json({ error: 'Erreur suppression conversation.' });
  }
});

// POST /api/assistant/rag-query
// Recherche RAG directe avec scores et sources
router.post('/rag-query', async (req, res) => {
  const { question, topK } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Le champ question (string) est requis.' });
  }

  try {
    const { queryRagPipeline } = await import('../services/ragVectorService.js');
    const result = await queryRagPipeline(question, topK || 3);
    res.json(result);
  } catch (error) {
    console.error('Erreur endpoint RAG Query :', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la recherche RAG.' });
  }
});

// POST /api/assistant/feedback
// Enregistre l'évaluation (Good / Bad) d'une réponse de l'assistant dans Firestore
router.post('/feedback', validate(feedbackSchema), async (req, res) => {
  try {
    const result = await saveAssistantFeedback(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur enregistrement évaluation :', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'évaluation dans Firestore.' });
  }
});

// GET /api/assistant/feedback/stats
// Récupère les statistiques de satisfaction globales
router.get('/feedback/stats', async (req, res) => {
  try {
    const stats = await getFeedbackStats();
    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats évaluation :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques.' });
  }
});

export default router;

