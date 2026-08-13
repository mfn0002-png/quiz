import { Router } from 'express';
import { runQuizAgent } from '../services/quizAgent.js';

const router = Router();

// POST /api/quiz/generate
router.post('/generate', async (req, res) => {
  const {
    difficulty = 'Débutant',
    topic      = 'Mélange',
    count      = 5,
    sessionId  = 'anonymous',
  } = req.body;

  try {
    const questions = await runQuizAgent(difficulty, topic, Number(count), sessionId);
    res.json(questions);
  } catch (error) {
    console.error('❌ Erreur Quiz Agent :', error.message);

    const msg   = error?.message || '';
    const is429 = msg.includes('429') || msg.toLowerCase().includes('quota');

    if (is429) {
      return res.status(429).json({
        error: "Le quota quotidien de l'IA est atteint. Réessayez dans quelques heures.",
        retryAfter: 3600,
      });
    }

    res.status(500).json({ error: msg || 'Erreur serveur lors de la génération du quiz.' });
  }
});

export default router;
