/**
 * quranService.js
 *
 * Service d'accès à l'API AlQuran Cloud pour la recherche de versets coraniques.
 * Fournit les fonctions fetch + format, consommées exclusivement par le Serveur MCP.
 */

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const QURAN_TIMEOUT_MS = 4000;

import { getSearchAliasesForWord } from './aliasService.js';

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
    // 1. Nettoyer les formules honorifiques entre parenthèses et les caractères spéciaux
    const cleaned = cleanQuery
      .replace(/\(.*?\)/g, ' ') // supprime (عليه السلام), (as), (pbsl)...
      .replace(/[\u0600-\u06FF]/g, ' ') // supprime l'arabe isolé dans une requête française
      .replace(/proph[èe]te|messager|aleyhi|salam|salut|paix|sur|lui|bénédiction|pbsl|saw|as/gi, ' ')
      .replace(/[^\w\s\u00C0-\u017F]/gi, ' ')
      .trim();

    let matches = [];

    // 2. Vérifier via le service d'alias dynamique Firestore (ex: Idriss -> Idris, Moussa -> Moïse...)
    const words = cleaned.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    for (const w of words) {
      const aliases = await getSearchAliasesForWord(w);
      for (const alias of aliases) {
        matches = await trySearch(alias);
        if (matches.length > 0) {
          console.log(`✅ [Quran Service] ${matches.length} verset(s) trouvé(s) via alias "${alias}" (pour "${w}")`);
          return matches;
        }
      }
    }

    // 3. Recherche directe avec le texte nettoyé
    if (cleaned.length >= 3) {
      matches = await trySearch(cleaned);
      if (matches.length > 0) {
        console.log(`✅ [Quran Service] ${matches.length} verset(s) trouvé(s) pour "${cleaned}"`);
        return matches;
      }
    }

    // 4. Fallback mot par mot
    for (const word of words) {
      matches = await trySearch(word);
      if (matches.length > 0) {
        console.log(`✅ [Quran Service] ${matches.length} verset(s) trouvé(s) via mot-clé "${word}"`);
        return matches;
      }
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
