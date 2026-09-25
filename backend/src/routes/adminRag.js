/**
 * adminRag.js
 * 
 * Route API d'administration sécurisée :
 * - POST /api/admin/rag/sync : Déclenche la synchronisation RAG Firebase ➔ Supabase
 * - GET  /api/admin/settings  : Récupère la configuration globale
 * - POST /api/admin/settings  : Sauvegarde la nouvelle configuration
 */

import express from 'express';
import { syncFirebaseToSupabase } from '../services/ragSyncService.js';
import { getPlatformConfig, updatePlatformConfig, isUserAdmin } from '../services/configService.js';

const router = express.Router();

/** Middleware de contrôle admin si l'en-tête `x-user-id` ou `x-user-email` est fourni */
async function requireAdmin(req, res, next) {
  const uid = req.headers['x-user-id'] || req.body?.userId;
  const email = req.headers['x-user-email'] || req.body?.userEmail;
  const identifier = uid || email;

  if (identifier) {
    let admin = await isUserAdmin(identifier);
    if (!admin && uid && email && uid !== email) {
      admin = await isUserAdmin(email);
    }
    if (!admin) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    }
  }
  next();
}

/** GET /api/admin/settings - Récupérer les paramètres */
router.get('/settings', async (req, res) => {
  try {
    const config = await getPlatformConfig();
    return res.json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/settings - Mettre à jour les paramètres */
router.post('/settings', requireAdmin, async (req, res) => {
  try {
    const newConfig = req.body;
    const updated = await updatePlatformConfig(newConfig);
    return res.json({ success: true, config: updated, message: 'Paramètres mis à jour avec succès !' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/rag/sync - Déclencher la synchronisation RAG */
router.post('/sync', requireAdmin, async (req, res) => {
  const forceReindex = req.body?.forceReindex === true;
  const collections = Array.isArray(req.body?.collections) ? req.body.collections : undefined;

  try {
    console.log(`📢 [Admin RAG Route] Déclenchement de la synchronisation (forceReindex: ${forceReindex})...`);
    
    const result = await syncFirebaseToSupabase({ forceReindex, targetCollections: collections });

    return res.json({
      success: true,
      message: 'Synchronisation Firebase ➔ Supabase terminée avec succès !',
      data: result,
    });
  } catch (err) {
    console.error(`❌ [Admin RAG Route] Échec synchronisation :`, err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

import { generateTopicDraft } from '../services/contentGeneratorAgent.js';
import { getAllLearningTopicsAdmin, deleteLearningTopic } from '../services/learningService.js';

/** GET /api/admin/topics - Liste tous les sujets d'apprentissage (Firestore & local) */
router.get('/topics', requireAdmin, async (req, res) => {
  try {
    const topics = await getAllLearningTopicsAdmin();
    return res.json({ success: true, count: topics.length, data: topics });
  } catch (err) {
    console.error(`❌ Erreur récupération des sujets admin :`, err);
    return res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/topics/:id - Supprimer un sujet d'apprentissage */
router.delete('/topics/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await deleteLearningTopic(id);
    return res.json(result);
  } catch (err) {
    console.error(`❌ Erreur suppression du sujet '${id}' :`, err);
    return res.status(500).json({ error: err.message });
  }
});

/** POST /api/admin/generate-content - Demande la génération IA d'un brouillon de contenu */
router.post('/generate-content', requireAdmin, async (req, res) => {
  const { subject, category, format } = req.body || {};

  if (!subject) {
    return res.status(400).json({ error: 'Le sujet est requis (ex: "Prophète Salih")' });
  }

  try {
    const draft = await generateTopicDraft({ subject, category, format });
    return res.json({ success: true, draft });
  } catch (err) {
    console.error(`❌ Erreur de génération du brouillon :`, err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
