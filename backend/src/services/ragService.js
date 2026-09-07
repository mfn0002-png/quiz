/**
 * ragService.js
 *
 * Service de Retrieval-Augmented Generation (RAG) pour le Quiz Islamique et l'Assistant.
 * Fournit du contexte authentique (Coran, Hadiths et Invocations/Duas avec références exactes)
 * en déléguant 100% de la recherche aux outils du Serveur MCP.
 */

import { executeMcpTool } from '../mcp/islamicMcpServer.js';

/**
 * Recherche des sources authentiques pour un thème donné via le Serveur MCP.
 * Effectue 3 recherches en parallèle : Coran, Hadiths et Duas.
 *
 * @param {string} topic - Le thème recherché
 * @returns {Promise<string>} Résumé du contexte enrichi de sources
 */
export async function fetchIslamicRAGContext(topic) {
  console.log(`📖 [RAG Service] Recherche de contexte RAG via MCP pour : "${topic}"`);

  if (!topic || topic === 'Mélange') {
    console.log(` ℹ️ [RAG Service] Thème "Mélange" → Contexte général multi-catégories.`);
    return 'Contexte général : Le quiz couvre l\'ensemble des sciences islamiques (Foi, Coran, Prophètes, Histoire, Jurisprudence et Pratiques).';
  }

  // Recherche en parallèle via les 3 outils du Serveur MCP
  console.log(` 🌐 [RAG Service] Recherche parallèle MCP pour "${topic}"...`);

  // Mapping / enrichissement des termes pour optimiser la recherche multilingue
  const topicMap = {
    'pratiques': { quran: 'prière', english: 'worship deeds prayer' },
    'piliers': { quran: 'prière', english: 'pillars islam faith' },
    'prophètes': { quran: 'prophète', english: 'prophet messenger' },
    'histoire': { quran: 'peuple', english: 'history companions' },
    'foi': { quran: 'croire', english: 'faith belief tawheed' },
    'jurisprudence': { quran: 'loi', english: 'ruling obligations' },
  };

  const normalized = topic.toLowerCase().trim();
  const mapping = topicMap[normalized] || {};
  const quranQuery = mapping.quran || topic;
  const englishQuery = mapping.english || topic;

  const [coranResult, hadithsResult, duasResult] = await Promise.allSettled([
    executeMcpTool('search_quran', { query: quranQuery }),
    executeMcpTool('search_hadiths', { queryInEnglish: englishQuery }),
    executeMcpTool('search_duas', { topic: englishQuery }),
  ]);

  // Traiter les résultats (ignorer les résultats vides ou en erreur)
  const coranContext = coranResult.status === 'fulfilled' && typeof coranResult.value === 'string' && !coranResult.value.startsWith('Aucun verset')
    ? coranResult.value
    : '';

  const hadithsContext = hadithsResult.status === 'fulfilled' && typeof hadithsResult.value === 'string' && !hadithsResult.value.startsWith('Aucun hadith')
    ? hadithsResult.value
    : '';

  const duasContext = duasResult.status === 'fulfilled' && typeof duasResult.value === 'string' && !duasResult.value.startsWith('Aucune invocation')
    ? duasResult.value
    : '';

  // Combiner les résultats
  const parts = [];
  if (coranContext) parts.push(`Versets de référence pour "${topic}" :\n${coranContext}`);
  if (hadithsContext) parts.push(`Hadiths de référence pour "${topic}" :\n${hadithsContext}`);
  if (duasContext) parts.push(`Invocations authentiques (Hisn al-Muslim) pour "${topic}" :\n${duasContext}`);

  if (parts.length > 0) {
    const combined = parts.join('\n\n');
    console.log(` 📚 [RAG Service] Contexte MCP combiné généré pour "${topic}" (${parts.length} source(s)) :`);
    combined.split('\n').forEach(line => {
      console.log(`    │ ${line}`);
    });
    return combined;
  }

  // Fallback contexte par défaut
  console.log(` ℹ️ [RAG Service] Fallback sur contexte générique pour "${topic}".`);
  return `Contexte pour "${topic}" : Utiliser les notions authentiques reconnues du Coran et de la Sunnah authentique.`;
}
