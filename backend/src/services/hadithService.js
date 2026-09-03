/**
 * hadithService.js
 *
 * Service de recherche de hadiths authentiques via UmmahAPI (Bukhari & Muslim).
 * Le mot-clé en anglais est directement fourni par le serveur MCP / LLM.
 *
 * API : https://ummahapi.com/api/hadith/:collection?q={query}&apikey={key}
 */

const API_BASE = 'https://ummahapi.com/api/hadith';
const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

/**
 * Recherche des hadiths par mot-clé anglais via UmmahAPI.
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
