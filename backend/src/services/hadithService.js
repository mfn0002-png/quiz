/**
 * hadithService.js
 *
 * Service de recherche de hadiths via UmmahAPI avec clé API.
 * Fournit des hadiths authentiques pour enrichir le RAG de l'assistant.
 * Utilise Gemini pour la traduction automatique dynamique des mots-clés FR -> EN.
 *
 * API : https://ummahapi.com/api/hadith/:collection?q={query}&apikey={key}
 * Collections : bukhari, muslim, tirmidhi, abudawud, nasai, ibnmajah, etc.
 */

import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';

const API_BASE = 'https://ummahapi.com/api/hadith';
const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cache mémoire avec TTL
const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

function getCacheKey(topic, limit) {
  return `${topic}:${limit}`;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Cache dynamique de traduction FR → EN (avec quelques valeurs de base pour 0ms de latence)
const FR_TO_EN_KEYWORDS = {
  'prière': 'prayer',
  'prieres': 'prayer',
  'salat': 'prayer',
  'jeûne': 'fasting',
  'jeune': 'fasting',
  'ramadan': 'ramadan',
  'zakat': 'zakat',
  'pèlerinage': 'pilgrimage',
  'hajj': 'pilgrimage',
  'coran': 'quran',
  'quran': 'quran',
  'hadith': 'hadith',
  'prophète': 'prophet',
  'prophetes': 'prophet',
  'muhammad': 'muhammad',
  'allah': 'allah',
  'foi': 'faith',
  'croyant': 'believer',
  'pardon': 'forgiveness',
  'miséricorde': 'mercy',
  'patience': 'patience',
  'sabr': 'patience',
  'charité': 'charity',
  'aumône': 'charity',
  'ablution': 'ablution',
  'woudou': 'ablution',
  'pilier': 'pillar',
  'piliers': 'pillars',
  'habit': 'garment',
  'habits': 'garment',
  'vêtement': 'clothing',
  'vetement': 'clothing',
  'nouvel habit': 'new garment',
  'dua': 'supplication',
  'doua': 'supplication',
  'duas': 'supplication',
  'invocation': 'supplication',
};

/**
 * Traduit dynamiquement un sujet français en mots-clés anglais via Gemini.
 * Utilise un dictionnaire mémoire pour éviter de réinterroger l'IA pour les mêmes mots.
 */
async function translateToEnglish(topic) {
  if (!topic) return '';
  const lower = topic.toLowerCase().trim();

  // 1. Déjà connu dans le cache instantané (0 ms)
  if (FR_TO_EN_KEYWORDS[lower]) {
    return FR_TO_EN_KEYWORDS[lower];
  }

  // 2. Si c'est un mot/phrase simple déjà en caractères ascii sans accents, inutile de contacter l'IA
  if (/^[a-z0-9\s-]+$/i.test(lower) && lower.length < 15) {
    FR_TO_EN_KEYWORDS[lower] = lower;
    return lower;
  }

  // 3. Sinon, traduction dynamique automatique avec Gemini
  try {
    if (process.env.GEMINI_API_KEY && process.env.NODE_ENV !== 'test') {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `Translate this French search topic into 1 to 3 simple English keywords suitable for searching a Hadith database. Return ONLY the English keywords, with no quotes or formatting.\n\nFrench topic: "${topic}"`;
      
      const result = await withRetry(() => model.generateContent(prompt));
      const translatedText = result.response.text().trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '');

      if (translatedText) {
        console.log(`🤖 [Hadith Service - Traduction IA] "${topic}" -> "${translatedText}"`);
        FR_TO_EN_KEYWORDS[lower] = translatedText;
        return translatedText;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Hadith Service] Échec de la traduction IA pour "${topic}": ${err.message}`);
  }

  return lower;
}

/**
 * Recherche des hadiths par mot-clé via UmmahAPI.
 *
 * @param {string} topic - Le thème ou mot-clé à rechercher
 * @param {number} limit - Nombre maximal de hadiths (défaut: 3)
 * @returns {Promise<Array<{collection: string, bookNumber: string, hadithNumber: string, narrator: string|null, text: string}>>}
 */
export async function fetchHadiths(topic, limit = 3) {
  if (!topic || topic === 'Mélange') return [];

  const cacheKey = getCacheKey(topic, limit);
  const cached = getFromCache(cacheKey);
  if (cached !== null) {
    console.log(`📖 [Hadith Service] Cache hit pour "${topic}"`);
    return cached;
  }

  console.log(`📖 [Hadith Service] Recherche de hadiths pour "${topic}" (limit: ${limit})...`);

  const apiKey = getApiKey();
  const searchQuery = await translateToEnglish(topic);
  const collections = ['bukhari', 'muslim'];

  try {
    // Interroger la première collection disponible (bukhari puis muslim)
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
          console.log(`✅ [Hadith Service] ${hadiths.length} hadith(s) trouvé(s) dans ${coll} pour "${topic}" (mot-clé EN: "${searchQuery}")`);
          setCache(cacheKey, hadiths);
          return hadiths;
        }
      }
    }

    setCache(cacheKey, []);
    return [];
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.warn(`⚠️ [Hadith Service] Timeout pour "${topic}" (${TIMEOUT_MS}ms)`);
    } else {
      console.warn(`⚠️ [Hadith Service] Erreur pour "${topic}": ${err.message}`);
    }
    return [];
  }
}

/**
 * Formate des hadiths en texte lisible pour injection dans le prompt RAG.
 *
 * @param {Array} hadiths - Tableau de hadiths (issu de fetchHadiths)
 * @returns {string} Texte formaté des hadiths
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
