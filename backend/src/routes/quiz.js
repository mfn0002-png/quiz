import { Router } from 'express';
import { runQuizAgent } from '../services/quizAgent.js';
import { getPlayerProfile, updatePlayerProfile } from '../services/playerProfileService.js';

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

// POST /api/quiz/results
// Enregistre les résultats d'un quiz terminé pour mettre à jour le profil d'apprentissage adaptatif du joueur
router.post('/results', async (req, res) => {
  const { sessionId, results } = req.body;

  if (!sessionId || !Array.isArray(results)) {
    return res.status(400).json({ error: 'sessionId et tableau de résultats requis.' });
  }

  try {
    const updatedProfile = await updatePlayerProfile(sessionId, results);
    res.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('❌ Erreur mise à jour profil joueur :', error.message);
    res.status(500).json({ error: 'Erreur mise à jour profil joueur.' });
  }
});

// GET /api/quiz/profile/:sessionId
// Récupère le profil adaptatif d'un joueur
router.get('/profile/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis.' });

  try {
    const profile = await getPlayerProfile(sessionId);
    res.json(profile);
  } catch (error) {
    console.error('❌ Erreur récupération profil joueur :', error.message);
    res.status(500).json({ error: 'Erreur récupération profil.' });
  }
});

export default router;
