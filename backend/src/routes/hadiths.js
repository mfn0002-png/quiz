import express from 'express';
import {
  getHadithCollections,
  getCollectionBooks,
  getBookHadiths,
} from '../services/hadithService.js';

const router = express.Router();

/**
 * GET /api/hadiths/collections
 * Retourne la liste des recueils (filtrable par ?group=nine_books | selections)
 */
router.get('/collections', (req, res) => {
  try {
    const { group } = req.query;
    const collections = getHadithCollections(group || null);
    res.json({
      success: true,
      count: collections.length,
      data: collections,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hadiths/collections/:id/books
 * Retourne la liste des chapitres/livres (Kitab) pour un recueil donné
 */
router.get('/collections/:id/books', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getCollectionBooks(id);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/hadiths/collections/:id/books/:bookNumber
 * Retourne les hadiths d'un chapitre spécifique
 */
router.get('/collections/:id/books/:bookNumber', async (req, res) => {
  try {
    const { id, bookNumber } = req.params;
    const result = await getBookHadiths(id, bookNumber);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
