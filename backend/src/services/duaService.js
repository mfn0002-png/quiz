/**
 * duaService.js
 *
 * Client API pour UmmahAPI — 126 invocations authentiques (Hisn al-Muslim).
 * Reçoit le topic déjà en anglais (fourni par Gemini via le MCP).
 * Fournit les textes en Arabe, Phonétique, Traduction et Références.
 */

const API_BASE_URL = 'https://ummahapi.com/api/duas';
const TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

/**
 * Recherche des invocations authentiques via l'API UmmahAPI.
 * Le topic est fourni en anglais par Gemini (ex: "rain", "travel", "sleep").
 *
 * @param {string} topic - Le thème en anglais fourni par Gemini via MCP
 * @param {number} [limit=3] - Nombre maximal d'invocations à retourner
 * @returns {Promise<Array<{title: string, arabic: string, phonetic: string, french: string, source: string}>>}
 */
export async function fetchDuas(input, limit = 3) {
  if (!input) return [];

  const rawTopic = typeof input === 'string' ? input : (input?.topic || input?.topicInEnglish || '');
  if (!rawTopic || rawTopic === 'Mélange') return [];

  const rawKeywords = Array.isArray(input?.keywords) ? input.keywords : [];

  // Extraire tous les termes et synonymes passés dynamiquement par Gemini
  const allTerms = [
    ...rawTopic.toLowerCase().split(/\s+/),
    ...rawKeywords.map(k => String(k).toLowerCase().trim()),
  ].filter(w => w.length > 2);

  const cleanTopic = rawTopic.toLowerCase().trim();
  const searchTerms = [...new Set(allTerms)];
  const cacheKey = `dua:${cleanTopic}:${searchTerms.join(',')}:${limit}`;

  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      console.log(`📖 [Dua Service] Cache hit pour "${cleanTopic}"`);
      return entry.data;
    }
    cache.delete(cacheKey);
  }

  console.log(`🌐 [Dua Service - API UmmahAPI] Appel distant pour "${cleanTopic}" [synonymes: ${searchTerms.join(', ')}]...`);

  try {
    const apiKey = getApiKey();
    const response = await fetch(`${API_BASE_URL}?apikey=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`⚠️ [Dua Service] L'API a répondu avec le statut ${response.status}`);
      return [];
    }

    const json = await response.json();
    const rawDuas = json.data?.duas;

    if (!Array.isArray(rawDuas) || rawDuas.length === 0) {
      console.warn('⚠️ [Dua Service] Aucune donnée reçue de l\'API.');
      return [];
    }

    const results = rawDuas.filter(dua => {
      const cat = (dua.category || '').toLowerCase();
      const title = (dua.title || '').toLowerCase();
      const trans = (dua.translation || '').toLowerCase();

      // Correspondance complète sur l'intitulé ou la catégorie
      if (cat.includes(cleanTopic) || title.includes(cleanTopic) || trans.includes(cleanTopic)) {
        return true;
      }
      // Correspondance sur l'un des synonymes / mots-clés générés par Gemini
      return searchTerms.some(term => cat.includes(term) || title.includes(term) || trans.includes(term));
    });

    const formatted = results.slice(0, limit).map(d => ({
      title: d.title || 'Invocation',
      arabic: d.arabic || '',
      phonetic: d.transliteration || '',
      french: d.translation || '',
      source: d.source || 'Hisn al-Muslim',
    })).filter(d => d.arabic || d.french);

    console.log(`✅ [Dua Service - API UmmahAPI] ${formatted.length} invocation(s) trouvée(s) pour "${cleanTopic}"`);
    cache.set(cacheKey, { data: formatted, timestamp: Date.now() });
    return formatted;
  } catch (err) {
    console.warn(`⚠️ [Dua Service - API UmmahAPI] Échec ou timeout: ${err.message}`);
    return [];
  }
}

/**
 * Formate un tableau de Duas en texte lisible.
 *
 * @param {Array} duas - Tableau d'invocations issu de fetchDuas
 * @returns {string} Texte formaté des invocations
 */
export function formatDuas(duas) {
  if (!duas || duas.length === 0) return '';

  return duas
    .map(d => {
      let out = `• [Invocation - ${d.title}] (Source: ${d.source})\n`;
      if (d.arabic) out += `  Arabe : "${d.arabic}"\n`;
      if (d.phonetic) out += `  Phonétique : "${d.phonetic}"\n`;
      if (d.french) out += `  Traduction : "${d.french}"`;
      return out;
    })
    .join('\n\n');
}
