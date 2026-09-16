/**
 * routes/sources.js
 *
 * Expose la résolution de références scripturaires au frontend.
 * À monter dans server.js :  app.use('/api/sources', sourcesRouter);
 */

import express from 'express';
import { resolveSourceRef } from '../services/sourceResolverService.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Les références sont peu nombreuses et fortement cachées : la limite protège
// surtout contre une boucle de rendu accidentelle côté client.
const sourcesLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const asmaDataPath = path.resolve(__dirname, '../../data/asmaAlHusna.json');

// Route pour l'ensemble des 99 Noms d'Allah
router.get('/asma/all', sourcesLimiter, (req, res) => {
  try {
    if (fs.existsSync(asmaDataPath)) {
      const data = JSON.parse(fs.readFileSync(asmaDataPath, 'utf8'));
      res.set('Cache-Control', 'public, max-age=86400, immutable');
      return res.json({ success: true, count: data.length, data });
    }
    return res.status(404).json({ error: 'Données Asma Al-Husna non disponibles' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Route pour un Nom d'Allah par son numéro (1-99)
router.get('/asma/:number', sourcesLimiter, (req, res) => {
  const num = Number(req.params.number);
  if (!Number.isInteger(num) || num < 1 || num > 99) {
    return res.status(400).json({ error: 'Le numéro du Nom doit être compris entre 1 et 99' });
  }
  try {
    if (fs.existsSync(asmaDataPath)) {
      const data = JSON.parse(fs.readFileSync(asmaDataPath, 'utf8'));
      const item = data.find(d => d.number === num);
      if (item) {
        res.set('Cache-Control', 'public, max-age=86400, immutable');
        return res.json(item);
      }
    }
    return res.status(404).json({ error: `Nom numéro ${num} non trouvé` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sources/:key
 * key : `quran:11:50`, `quran:11:50-60`, `hadith:bukhari:2:13`, `dua:hisn_042`
 */
router.get('/:key', sourcesLimiter, async (req, res) => {
  const { key } = req.params;

  if (typeof key !== 'string' || key.length > 64) {
    return res.status(400).json({ error: 'Référence invalide' });
  }

  try {
    const resolved = await resolveSourceRef(key);

    // Immuable : on autorise un cache navigateur et CDN long.
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    return res.json(resolved);
  } catch (err) {
    const status = err.statusCode || 502;
    if (status >= 500) {
      console.error(`❌ [Sources] Échec de résolution "${key}" : ${err.message}`);
    }
    return res.status(status).json({ error: err.message });
  }
});

export default router;