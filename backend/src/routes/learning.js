import express from 'express';
import { getLearningTopics, getLearningTopicById } from '../services/learningService.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();
const learningLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });

/**
 * GET /api/learning/topics
 * Renvoie tous les topics d'apprentissage publiés ordonnés depuis Firestore.
 */
router.get('/topics', learningLimiter, async (req, res) => {
  try {
    const topics = await getLearningTopics();
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes de cache HTTP
    return res.json({ success: true, count: topics.length, data: topics });
  } catch (err) {
    console.error(`❌ [Learning Route] Erreur GET /topics : ${err.message}`);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * GET /api/learning/topics/:id
 * Renvoie un topic spécifique par son ID depuis Firestore.
 */
router.get('/topics/:id', learningLimiter, async (req, res) => {
  const { id } = req.params;
  try {
    const topic = await getLearningTopicById(id);
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({ success: true, data: topic });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
