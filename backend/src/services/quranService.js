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
  if (!query || typeof query !== 'string') return [];
  const cleanQuery = query.trim();
  console.log(`📖 [Quran Service] Recherche de versets pour "${cleanQuery}"...`);

  const trySearch = async (term) => {
    try {
      const response = await fetch(
        `${QURAN_API_BASE}/search/${encodeURIComponent(term)}/all/fr.hamidullah`,
        { signal: AbortSignal.timeout(QURAN_TIMEOUT_MS) }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data?.data?.matches?.slice(0, limit) || [];
    } catch {
      return [];
    }
  };

  try {
    let matches = await trySearch(cleanQuery);

    // Si aucune correspondance (ou 404), essayer d'extraire les mots-clés essentiels sans formules honorifiques
    if (matches.length === 0) {
      const simplified = cleanQuery
        .replace(/proph[èe]te|messager|aleyhi|salam|salut|paix|sur|lui|bénédiction|pbsl|saw|as/gi, '')
        .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
        .trim();

      const words = simplified.split(/\s+/).filter(w => w.length >= 3);
      for (const word of words) {
        matches = await trySearch(word);
        if (matches.length > 0) {
          console.log(`✅ [Quran Service] ${matches.length} verset(s) trouvé(s) via mot-clé "${word}"`);
          break;
        }
      }
    }

    if (matches.length > 0) {
      console.log(`✅ [Quran Service] ${matches.length} verset(s) trouvé(s) pour "${cleanQuery}"`);
      return matches;
    }

    console.log(`ℹ️ [Quran Service] Aucun verset trouvé pour "${cleanQuery}"`);
    return [];
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
