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
export async function fetchDuas(topic, limit = 3) {
  if (!topic || topic === 'Mélange') return [];

  const cleanTopic = topic.toLowerCase().trim();
  const cacheKey = `dua:${cleanTopic}:${limit}`;

  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      console.log(`📖 [Dua Service] Cache hit pour "${topic}"`);
      return entry.data;
    }
    cache.delete(cacheKey);
  }

  console.log(`🌐 [Dua Service - API UmmahAPI] Appel distant pour "${topic}"...`);

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

    const results = rawDuas.filter(dua =>
      (dua.category || '').toLowerCase().includes(cleanTopic) ||
      (dua.title || '').toLowerCase().includes(cleanTopic) ||
      (dua.translation || '').toLowerCase().includes(cleanTopic)
    );

    const formatted = results.slice(0, limit).map(d => ({
      title: d.title || 'Invocation',
      arabic: d.arabic || '',
      phonetic: d.transliteration || '',
      french: d.translation || '',
      source: d.source || 'Hisn al-Muslim',
    })).filter(d => d.arabic || d.french);

    console.log(`✅ [Dua Service - API UmmahAPI] ${formatted.length} invocation(s) trouvée(s) pour "${topic}"`);
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
