/**
 * ragService.js
 *
 * Service de Retrieval-Augmented Generation (RAG) pour le Quiz Islamique et l'Assistant.
 * Fournit du contexte authentique et certifié en combinant :
 * 1. [Priorité 1] La base de connaissances vectorielle managée PostgreSQL (Supabase pgvector)
 * 2. [Priorité 2] Les outils de recherche scripturaire du Serveur MCP (Coran, Hadiths, Invocations)
 * 3. [Fallback] Le store vectoriel local JSON en cas de déconnexion réseau
 */

import { executeMcpTool } from '../mcp/islamicMcpServer.js';
import { searchKnowledgeBaseSupabase } from './ragSupabaseService.js';
import { searchSimilarChunks } from './ragVectorService.js';

/**
 * Recherche des sources authentiques pour un thème donné.
 * Interroge en priorité Supabase pgvector puis enrichit avec les outils MCP.
 *
 * @param {string} topic - Le thème recherché
 * @returns {Promise<string>} Résumé du contexte enrichi de sources
 */
export async function fetchIslamicRAGContext(topic) {
  console.log(`📖 [RAG Service] Recherche de contexte RAG pour : "${topic}"`);

  if (!topic || topic === 'Mélange') {
    console.log(` ℹ️ [RAG Service] Thème "Mélange" → Contexte général multi-catégories.`);
    return 'Contexte général : Le quiz couvre l\'ensemble des sciences islamiques (Foi, Coran, Prophètes, Histoire, Jurisprudence et Pratiques).';
  }

  // 1. RECHERCHE VECTORIELLE SÉMANTIQUE (SUPABASE PGVECTOR / LOCAL)
  let vectorChunks = [];
  try {
    console.log(` 🧠 [RAG Service] Interrogation de la base vectorielle Supabase pgvector pour "${topic}"...`);
    vectorChunks = await searchKnowledgeBaseSupabase(topic, 4, 0.35);
    if (vectorChunks.length > 0) {
      console.log(` ✅ [RAG Service] ${vectorChunks.length} extrait(s) pertinent(s) trouvé(s) dans Supabase pgvector !`);
    } else {
      console.log(` ℹ️ [RAG Service] Aucun extrait Supabase avec similarité suffisante. Tentative sur le store vectoriel local...`);
      vectorChunks = await searchSimilarChunks(topic, 3, 0.35).catch(() => []);
    }
  } catch (vectorErr) {
    console.warn(` ⚠️ [RAG Service] Échec Supabase (${vectorErr.message}). Tentative sur le store vectoriel local...`);
    try {
      vectorChunks = await searchSimilarChunks(topic, 3, 0.35);
    } catch {
      vectorChunks = [];
    }
  }

  // 2. RECHERCHE PARALLÈLE SCRIPTURAIRE MCP (CORAN / HADITHS / DUAS)
  console.log(` 🌐 [RAG Service] Recherche complémentaire via outils MCP pour "${topic}"...`);

  const topicMap = {
    'pratiques': { quran: 'prière', english: 'worship deeds prayer' },
    'piliers': { quran: 'prière', english: 'pillars islam faith' },
    'piliers de l\'islam': { quran: 'prière', english: 'pillars islam faith bukhari' },
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

  const coranContext = coranResult.status === 'fulfilled' && typeof coranResult.value === 'string' && !coranResult.value.startsWith('Aucun verset')
    ? coranResult.value
    : '';

  const hadithsContext = hadithsResult.status === 'fulfilled' && typeof hadithsResult.value === 'string' && !hadithsResult.value.startsWith('Aucun hadith')
    ? hadithsResult.value
    : '';

  const duasContext = duasResult.status === 'fulfilled' && typeof duasResult.value === 'string' && !duasResult.value.startsWith('Aucune invocation')
    ? duasResult.value
    : '';

  // 3. COMPOSITION HIÉRARCHISÉE DU CONTEXTE RAG
  const parts = [];

  // En tête : Les extraits sémantiques certifiés de notre base NoorQuiz
  if (vectorChunks.length > 0) {
    const vectorFormatted = vectorChunks.map((c, i) => {
      const srcName = c.source || c.metadata?.title || 'Fiche certifiée NoorQuiz';
      const simStr = c.similarity ? ` (Pertinence: ${c.similarity}%)` : '';
      return `• [Extrait ${i + 1} - ${srcName}${simStr}] :\n${c.content}`;
    }).join('\n\n');

    parts.push(`📚 Extraits certifiés de la base de connaissances NoorQuiz :\n${vectorFormatted}`);
  }

  // Compléments scripturaires
  if (coranContext) parts.push(`Versets de référence pour "${topic}" :\n${coranContext}`);
  if (hadithsContext) parts.push(`Hadiths de référence pour "${topic}" :\n${hadithsContext}`);
  if (duasContext) parts.push(`Invocations authentiques (Hisn al-Muslim) pour "${topic}" :\n${duasContext}`);

  if (parts.length > 0) {
    const combined = parts.join('\n\n');
    console.log(` 📚 [RAG Service] Contexte combiné généré pour "${topic}" (${parts.length} source(s) | ${vectorChunks.length} extrait(s) vectoriels) :`);
    combined.split('\n').slice(0, 15).forEach(line => {
      console.log(`    │ ${line}`);
    });
    if (combined.split('\n').length > 15) {
      console.log(`    │ ... (${combined.split('\n').length - 15} lignes supplémentaires)`);
    }
    return combined;
  }

  // Fallback contexte par défaut
  console.log(` ℹ️ [RAG Service] Fallback sur contexte générique pour "${topic}".`);
  return `Contexte pour "${topic}" : Utiliser les notions authentiques reconnues du Coran et de la Sunnah authentique.`;
}
