/**
 * hadithService.js
 *
 * Service de recherche de hadiths authentiques via UmmahAPI (Bukhari & Muslim).
 * Le mot-clé en anglais est directement fourni par le serveur MCP / LLM.
 *
 * Egalement utilisé par l'Explorateur de Hadiths & Recueils (Kutub at-Tis'ah & Sélections).
 *
 * API : https://ummahapi.com/api/hadith/:collection?q={query}&apikey={key}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { redis } from '../config/redis.js';
import { translateEnToFr } from '../utils/hadithTransform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://ummahapi.com/api/hadith';
const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

/**
 * Recherche des hadiths par mot-clé anglais via UmmahAPI (pour MCP / RAG / Assistant).
 *
 * @param {string} queryInEnglish - Le mot-clé en anglais fourni par le LLM (ex: "garment", "prayer", "fasting")
 * @param {number} limit - Nombre maximal de hadiths (défaut: 3)
 * @returns {Promise<Array<{collection: string, bookNumber: string, hadithNumber: string, narrator: string|null, text: string}>>}
 */
export async function fetchHadiths(queryInEnglish, limit = 3) {
  if (!queryInEnglish || queryInEnglish === 'Mélange') return [];

  const searchQuery = queryInEnglish.toLowerCase().trim();
  const cacheKey = `hadith:${searchQuery}:${limit}`;

  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      console.log(`📖 [Hadith Service] Cache hit pour "${searchQuery}"`);
      return entry.data;
    }
    cache.delete(cacheKey);
  }

  console.log(`📖 [Hadith Service] Recherche de hadiths pour "${searchQuery}" (limit: ${limit})...`);

  const apiKey = getApiKey();
  const collections = ['bukhari', 'muslim'];

  try {
    for (const coll of collections) {
      const url = `${API_BASE}/${coll}?q=${encodeURIComponent(searchQuery)}&limit=${limit}&apikey=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.ok) {
        const data = await response.json();
        const rawHadiths = data.data?.hadiths || data.data || data.hadiths || (Array.isArray(data) ? data : []);
        const hadiths = (Array.isArray(rawHadiths) ? rawHadiths : [])
          .slice(0, limit)
          .map(h => ({
            collection: h.collection_name || h.collection || coll,
            bookNumber: h.bookNumber || h.book_number || '',
            hadithNumber: h.hadithnumber || h.hadithNumber || h.hadith_number || '',
            narrator: h.narrator || h.chain || null,
            text: (typeof h.english === 'string' ? h.english : h.english?.text) || h.text || h.body || '',
          }))
          .filter(h => h.text);

        if (hadiths.length > 0) {
          console.log(`✅ [Hadith Service] ${hadiths.length} hadith(s) trouvé(s) dans ${coll} pour "${searchQuery}"`);
          cache.set(cacheKey, { data: hadiths, timestamp: Date.now() });
          return hadiths;
        }
      }
    }

    cache.set(cacheKey, { data: [], timestamp: Date.now() });
    return [];
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.warn(`⚠️ [Hadith Service] Timeout pour "${searchQuery}" (${TIMEOUT_MS}ms)`);
    } else {
      console.warn(`⚠️ [Hadith Service] Erreur pour "${searchQuery}": ${err.message}`);
    }
    return [];
  }
}

/**
 * Formate des hadiths en texte lisible pour injection dans le prompt RAG.
 */
export function formatHadiths(hadiths) {
  if (!hadiths || hadiths.length === 0) return '';

  return hadiths
    .map(h => {
      const source = `${h.collection}${h.bookNumber ? ` ${h.bookNumber}` : ''}${h.hadithNumber ? `:${h.hadithNumber}` : ''}`;
      const narrator = h.narrator ? ` (Narrateur: ${h.narrator})` : '';
      return `• [Hadith - ${source}]${narrator} : "${h.text}"`;
    })
    .join('\n');
}

/* ================================================================== */
/* FONCTIONS DE L'EXPLORATEUR DE HADITHS & RECUEILS                   */
/* ================================================================== */

// Chargement des données JSON externes
const collectionsPath = path.resolve(__dirname, '../../data/hadiths/collections.json');
const bookTitlesPath = path.resolve(__dirname, '../../data/hadiths/bookTitlesFr.json');

export const HADITH_COLLECTIONS = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));
const BOOK_TITLES_FR = JSON.parse(fs.readFileSync(bookTitlesPath, 'utf8'));

// Cache mémoire local pour l'explorateur
const explorerCache = new Map();
const EXPLORER_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getFromExplorerCache(key) {
  const item = explorerCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > EXPLORER_TTL_MS) {
    explorerCache.delete(key);
    return null;
  }
  return item.data;
}

function setInExplorerCache(key, data) {
  explorerCache.set(key, { timestamp: Date.now(), data });
}

/**
 * Récupère les métadonnées de tous les recueils
 */
export function getHadithCollections(group = null) {
  if (group) {
    return HADITH_COLLECTIONS.filter(c => c.group === group);
  }
  return HADITH_COLLECTIONS;
}

/**
 * Récupère la liste des chapitres/livres d'un recueil
 */
export async function getCollectionBooks(collectionId) {
  const collection = HADITH_COLLECTIONS.find(c => c.id === collectionId);
  if (!collection) {
    throw new Error(`Recueil "${collectionId}" introuvable.`);
  }

  const cacheKey = `hadith:books:${collectionId}`;
  const memCached = getFromExplorerCache(cacheKey);
  if (memCached) return memCached;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        setInExplorerCache(cacheKey, parsed);
        return parsed;
      }
    } catch (e) {
      console.warn(`[HadithService] Redis read error: ${e.message}`);
    }
  }

  // Si l'API UmmahAPI en ligne est supportée pour ce recueil
  if (collection.hasApi) {
    try {
      const apiKey = getApiKey();
      const resp = await fetch(`${API_BASE}/${collectionId}?apikey=${encodeURIComponent(apiKey)}&page=1&limit=1`);
      if (resp.ok) {
        const json = await resp.json();
        const totalHadiths = json.data?.total || collection.totalHadiths;

        // Découpage en sections/livres ergonomiques de 50 hadiths
        const PAGE_SIZE = 50;
        const numBooks = Math.ceil(totalHadiths / PAGE_SIZE);

        const books = Array.from({ length: numBooks }, (_, i) => {
          const bookNum = i + 1;
          const start = (i * PAGE_SIZE) + 1;
          const end = Math.min((i + 1) * PAGE_SIZE, totalHadiths);

          return {
            bookNumber: bookNum,
            title: `Partie ${bookNum} (${start} à ${end})`,
            englishTitle: `Section ${bookNum} (Hadiths ${start}-${end})`,
            hadithStart: start,
            hadithEnd: end,
            totalHadiths: (end - start + 1),
          };
        });

        const result = { collection, books };
        setInExplorerCache(cacheKey, result);
        if (redis) {
          await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 }).catch(() => {});
        }
        return result;
      }
    } catch (err) {
      console.warn(`[HadithService] Failed UmmahAPI for ${collectionId}: ${err.message}`);
    }
  }

  // Fallback structuré
  const fallbackBooks = [
    {
      bookNumber: 1,
      title: "Recueil Principal / Chapitre Général",
      englishTitle: "Main Collection",
      totalHadiths: collection.totalHadiths,
    }
  ];

  const result = { collection, books: fallbackBooks };
  return result;
}

function isRealFrench(hadith) {
  if (!hadith || !hadith.frenchTranslation) return false;
  if (hadith.frenchTranslation === hadith.englishTranslation) return false;
  if (/^(It is narrated|Narrated|Allah's Messenger|He who|Abu Huraira)/i.test(hadith.frenchTranslation.trim())) return false;
  return true;
}

/**
 * Récupère les hadiths d'un chapitre/section spécifique via UmmahAPI
 */
export async function getBookHadiths(collectionId, bookNumber) {
  const cacheKey = `hadith:data:${collectionId}:${bookNumber}`;
  const memCached = getFromExplorerCache(cacheKey);
  if (memCached && isRealFrench(memCached.hadiths?.[0])) return memCached;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (parsed?.hadiths?.[0] && isRealFrench(parsed.hadiths[0])) {
          setInExplorerCache(cacheKey, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`[HadithService] Redis read error: ${e.message}`);
    }
  }

  try {
    const apiKey = getApiKey();
    const page = parseInt(bookNumber, 10) || 1;
    const limit = 50;

    const resp = await fetch(`${API_BASE}/${collectionId}?apikey=${encodeURIComponent(apiKey)}&page=${page}&limit=${limit}`);
    if (!resp.ok) {
      throw new Error(`Erreur UmmahAPI pour ${collectionId} (Status ${resp.status})`);
    }

    const json = await resp.json();
    const rawHadiths = json.data?.hadiths || [];

    const hadiths = await Promise.all(
      rawHadiths.map(async (h, idx) => {
        const arabicText = h.arabic || '';
        const englishText = typeof h.english === 'string' ? h.english : h.english?.text || h.text || h.body || '';
        const frenchText = h.french || h.fr || (await translateEnToFr(englishText));

        return {
          hadithNumber: h.hadithnumber || h.id || (idx + 1),
          arabicNumber: h.hadithnumber || (idx + 1),
          arabicText,
          translation: frenchText || englishText,
          englishTranslation: englishText,
          frenchTranslation: frenchText || englishText,
          grades: h.grade ? [{ name: 'Statut', grade: h.grade }] : [],
          reference: { book: page, hadith: h.hadithnumber || (idx + 1) },
        };
      })
    );

    const result = {
      collectionId,
      bookNumber: page,
      count: hadiths.length,
      hadiths,
    };

    setInExplorerCache(cacheKey, result);
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(result), { ex: 86400 }).catch(() => {});
    }

    return result;
  } catch (err) {
    console.error(`[HadithService - UmmahAPI] Erreur : ${err.message}`);
    throw err;
  }
}
