/**
 * quranService.js
 *
 * Service d'accès à l'API AlQuran Cloud pour la recherche de versets coraniques.
 * Fournit les fonctions fetch + format, consommées exclusivement par le Serveur MCP.
 */

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const QURAN_TIMEOUT_MS = 4000;

/**
 * Recherche des versets coraniques correspondant à un thème donné.
 * @param {string} query - Le thème ou mot-clé à rechercher
 * @param {number} [limit=3] - Nombre maximum de versets à retourner
 * @returns {Promise<Array>} Liste de versets trouvés
 */
export async function searchQuranVerses(query, limit = 3) {
  console.log(`📖 [Quran Service] Recherche de versets pour "${query}"...`);

  try {
    const response = await fetch(
      `${QURAN_API_BASE}/search/${encodeURIComponent(query)}/all/fr.hamidullah`,
      { signal: AbortSignal.timeout(QURAN_TIMEOUT_MS) }
    );

    if (!response.ok) {
      console.warn(`⚠️ [Quran Service] API a répondu ${response.status}`);
      return [];
    }

    const data = await response.json();
    const matches = data?.data?.matches?.slice(0, limit) || [];

    console.log(`✅ [Quran Service] ${matches.length} verset(s) trouvé(s) pour "${query}"`);
    return matches;
  } catch (err) {
    console.warn(`⚠️ [Quran Service] Erreur : ${err.message}`);
    return [];
  }
}

/**
 * Formate les versets coraniques en texte lisible.
 * @param {Array} verses - Liste de versets bruts de l'API
 * @returns {string} Texte formaté des versets
 */
export function formatQuranVerses(verses) {
  if (!verses || verses.length === 0) return '';

  return verses
    .map(m => `• [Sourate ${m.surah.englishName} (${m.surah.number}):${m.numberInSurah}] : "${m.text.trim()}"`)
    .join('\n');
}
