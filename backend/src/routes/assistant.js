import { Router } from 'express';
import { runAssistantAgent } from '../services/assistantAgent.js';
import { clearHistory, getHistory } from '../services/sessionService.js';

const router = Router();

// POST /api/assistant/chat
router.post('/chat', async (req, res) => {
  const { question, sessionId } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Une question valide est requise.' });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Un sessionId est requis.' });
  }

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

    res.status(500).json({ error: msg || "Erreur serveur de l'assistant IA." });
  }
});


// GET /api/assistant/history/:sessionId
// Récupère l'historique de conversation d'une session depuis Redis
router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis.' });

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
router.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis.' });

  await clearHistory(sessionId).catch(err => console.error('Erreur clearHistory :', err));
  res.json({ success: true, message: 'Session réinitialisée avec succès.' });
});

export default router;
