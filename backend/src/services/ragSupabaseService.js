/**
 * ragSupabaseService.js
 * 
 * Service RAG Vectoriel avec stockage managé PostgreSQL (Supabase + pgvector) :
 * - Ingestion asynchrone dans la table `documents` de Supabase
 * - Recherche sémantique par similarité cosinus via la fonction RPC `match_documents`
 * - Synthèse contextuelle zéro hallucination avec Google Gemini
 * 
 * Totalement interchangeable avec `ragVectorService.js`
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  extractDocumentText,
  recursiveChunkText,
  computeEmbedding
} from './ragVectorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let supabaseClient = null;

/**
 * Récupère ou initialise le client Supabase
 */
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "⚠️ [Supabase RAG] Variables SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes dans le fichier .env !"
    );
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

// ============================================================================
// 1. INGESTION VERS SUPABASE
// ============================================================================

/**
 * Ingestion complète d'un document dans la table Supabase `documents`
 * @param {string} filePath - Chemin absolu ou relatif vers le document (PDF / MD / TXT)
 */
export async function ingestDocumentToSupabase(filePath) {
  const supabase = getSupabaseClient();
  console.log(`\n🚀 [Supabase RAG] Démarrage de l'ingestion : ${filePath}`);
  const startTime = Date.now();

  // 1. Parsing du document
  const doc = await extractDocumentText(filePath);
  console.log(`✓ Texte extrait (${doc.text.length} caractères, ~${doc.pagesCount} pages)`);

  // 2. Découpage en chunks
  const textChunks = recursiveChunkText(doc.text, 800, 150);
  console.log(`✓ Découpage terminé : ${textChunks.length} chunks sémantiques générés`);

  // 3. Calcul des embeddings & Préparation des lignes SQL
  console.log(`🧠 Calcul des embeddings et envoi vers Supabase...`);
  const rowsToInsert = [];

  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i];
    const embedding = await computeEmbedding(chunkText, false);

    rowsToInsert.push({
      content: chunkText,
      metadata: {
        source: doc.filename,
        chunkIndex: i + 1,
        totalChunks: textChunks.length,
        charCount: chunkText.length
      },
      embedding
    });

    if ((i + 1) % 5 === 0 || i === textChunks.length - 1) {
      console.log(`  ✓ ${i + 1} / ${textChunks.length} chunks vectorisés`);
    }

    // Petite temporisation courtoise pour respecter les quotas d'API
    await new Promise(r => setTimeout(r, 200));
  }

  // 4. Insertion par lots (Batch Insert) dans Supabase
  const { data, error } = await supabase
    .from('documents')
    .insert(rowsToInsert)
    .select('id');

  if (error) {
    throw new Error(`Erreur lors de l'insertion dans Supabase : ${error.message}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`💾 [Supabase RAG] Ingestion réussie en ${elapsed}s !`);
  console.log(`📁 ${rowsToInsert.length} vecteurs enregistrés dans la table 'documents'`);

  return {
    totalChunks: rowsToInsert.length,
    elapsed,
    insertedCount: data ? data.length : rowsToInsert.length
  };
}

// ============================================================================
// 2. RECHERCHE VECTORIELLE SÉMANTIQUE (RETRIEVAL)
// ============================================================================

/**
 * Recherche les passages les plus pertinents dans Supabase via la fonction RPC `match_documents`
 * @param {string} queryText - Question de l'utilisateur
 * @param {number} topK - Nombre de résultats (défaut: 3)
 * @param {number} minSimilarity - Seuil minimal de pertinence (0.0 à 1.0)
 * @returns {Promise<Array<{ content: string, similarity: number, source: string, chunkIndex: number }>>}
 */
export async function searchKnowledgeBaseSupabase(queryText, topK = 3, minSimilarity = 0.5) {
  const supabase = getSupabaseClient();

  // 1. Vectorisation en temps réel de la question (TaskType.RETRIEVAL_QUERY)
  const queryEmbedding = await computeEmbedding(queryText, true);

  // 2. Appel de la fonction PostgreSQL `match_documents` via RPC
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter: {}
  });

  if (error) {
    throw new Error(`Erreur lors de la recherche vectorielle Supabase : ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 3. Formatage standardisé identique à ragVectorService.js
  return data
    .filter(item => item.similarity >= minSimilarity)
    .map(item => ({
      content: item.content,
      similarity: Math.round(item.similarity * 1000) / 10, // ex: 79.2%
      source: item.metadata?.source || 'Base de connaissances Supabase',
      chunkIndex: item.metadata?.chunkIndex || 1
    }));
}

// ============================================================================
// 3. PIPELINE COMPLET AVEC SYNTHÈSE GEMINI (ZÉRO HALLUCINATION)
// ============================================================================

/**
 * Exécute le pipeline complet avec Supabase : Retrieval + Prompt Augmenté + Génération
 * @param {string} question - Question posée
 * @returns {Promise<{ answer: string, sources: Array<{ source: string, similarity: number, snippet: string }>, hasContext: boolean }>}
 */
export async function queryRagPipelineSupabase(question) {
  const topChunks = await searchKnowledgeBaseSupabase(question, 3, 0.45);

  if (topChunks.length === 0) {
    return {
      answer: "Désolé, aucune information certifiée n'a été trouvée dans la documentation Supabase concernant cette question.",
      sources: [],
      hasContext: false
    };
  }

  // Construction du contexte documentaire strict
  const contextBlock = topChunks
    .map((chunk, idx) => `[EXTRAIT ${idx + 1} - Source: ${chunk.source} (Pertinence: ${chunk.similarity}%)]\n${chunk.content}`)
    .join('\n\n---\n\n');

  const systemInstruction = `Tu es l'assistant islamique officiel de NoorQuiz.
RÈGLE ABSOLUE DE VÉRITÉ (ZÉRO HALLUCINATION) :
1. Tu dois répondre à la question de l'utilisateur EN T'APPUYANT STRICTEMENT sur les extraits de documentation fournis ci-dessous.
2. Si la réponse ne figure pas dans les extraits, dis poliment que tu ne sais pas d'après les documents officiels. N'invente AUCUN fait, hadith ou règle jurisprudentielle.
3. Cite toujours le nom de la source officielle.
4. Reste bienveillant, clair et pédagogique.`;

  const prompt = `EXTRAITS DOCUMENTAIRES DE RÉFÉRENCE :\n${contextBlock}\n\nQUESTION DE L'UTILISATEUR :\n${question}\n\nRÉPONSE CERTIFIÉE (avec citation des sources) :`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const chatModelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const chatModel = genAI.getGenerativeModel({
    model: chatModelName,
    systemInstruction
  });

  const result = await chatModel.generateContent(prompt);
  const answer = result.response.text();

  return {
    answer,
    sources: topChunks.map(c => ({
      source: c.source,
      similarity: c.similarity,
      snippet: c.content.slice(0, 180) + '...'
    })),
    hasContext: true
  };
}
