import { Router } from 'express';
import { runAssistantAgent } from '../services/assistantAgent.js';
import { clearHistory, getHistory } from '../services/sessionService.js';
import { validate, validateParams } from '../middleware/validate.js';
import { chatSchema, sessionIdParamsSchema } from '../validation/schemas.js';

const router = Router();

// POST /api/assistant/chat
router.post('/chat', validate(chatSchema), async (req, res) => {
  const { question, sessionId } = req.body;

  try {
    const result = await runAssistantAgent(sessionId, question);
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


// GET /api/assistant/history/:sessionId
// Récupère l'historique de conversation d'une session depuis Redis
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
// Réinitialise l'historique d'une session (bouton "Nouvelle conversation")
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

export default router;
