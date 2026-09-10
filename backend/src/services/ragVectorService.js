/**
 * ragVectorService.js
 * 
 * Pipeline RAG Vectoriel complet de bout en bout en pur Node.js :
 * 1. Extraction / Parsing (PDF avec pdf-parse, Markdown / TXT avec fs)
 * 2. Découpage intelligent (Recursive Chunking avec overlap)
 * 3. Vectorisation (Google Gemini text-embedding-004)
 * 4. Stockage vectoriel persistant (JSON local structuré)
 * 5. Recherche sémantique par Similarité Cosinus
 * 6. Synthèse contextuelle avec Google Gemini 1.5 Flash (Zéro Hallucination)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement automatique du .env du backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️ [RAG Vector] GEMINI_API_KEY non trouvée dans l'environnement !");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const EMBEDDING_MODEL_NAME = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const embedModel = genAI.getGenerativeModel({ model: EMBEDDING_MODEL_NAME });
const chatModelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

// Chemin du store vectoriel
const DEFAULT_STORE_PATH = path.resolve(__dirname, '../../data/knowledge_vector_store.json');

// ============================================================================
// 1. PARSING DE DOCUMENTS (PDF / MARKDOWN / TXT)
// ============================================================================

/**
 * Extrait le texte brut d'un document selon son format
 * @param {string} filePath - Chemin absolu ou relatif du fichier
 * @returns {Promise<{ text: string, pagesCount: number, filename: string }>}
 */
export async function extractDocumentText(filePath) {
  const resolvedPath = path.resolve(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const filename = path.basename(resolvedPath);

  console.log(`📄 [RAG] Parsing du document : ${filename} (${ext})`);

  if (ext === '.pdf') {
    const dataBuffer = await fs.readFile(resolvedPath);
    const pdfData = await pdf(dataBuffer);
    return {
      text: pdfData.text,
      pagesCount: pdfData.numpages || 1,
      filename
    };
  } else if (['.txt', '.md', '.markdown', '.json'].includes(ext)) {
    const text = await fs.readFile(resolvedPath, 'utf-8');
    return {
      text,
      pagesCount: Math.ceil(text.length / 1500),
      filename
    };
  } else {
    throw new Error(`Format non supporté (${ext}). Utilisez un fichier .pdf, .md ou .txt`);
  }
}

// ============================================================================
// 2. CHUNKING INTELLIGENT & RÉCURSIF
// ============================================================================

/**
 * Découpe un texte de manière récursive en respectant les frontières sémantiques
 * @param {string} text - Texte brut
 * @param {number} chunkSize - Taille maximale du chunk en caractères (défaut 800)
 * @param {number} chunkOverlap - Chevauchement en caractères (défaut 150)
 * @returns {string[]}
 */
export function recursiveChunkText(text, chunkSize = 800, chunkOverlap = 150) {
  if (!text || text.length <= chunkSize) return text ? [text.trim()] : [];

  const separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""];

  function splitRecursive(currentText, sepIndex) {
    if (currentText.length <= chunkSize) return [currentText.trim()];
    if (sepIndex >= separators.length) {
      const fallbackChunks = [];
      for (let i = 0; i < currentText.length; i += (chunkSize - chunkOverlap)) {
        fallbackChunks.push(currentText.slice(i, i + chunkSize));
      }
      return fallbackChunks;
    }

    const sep = separators[sepIndex];
    const parts = sep ? currentText.split(sep) : [currentText];
    const chunks = [];
    let accumulator = "";

    for (const part of parts) {
      const candidate = accumulator ? accumulator + sep + part : part;
      if (candidate.length <= chunkSize) {
        accumulator = candidate;
      } else {
        if (accumulator) {
          chunks.push(accumulator.trim());
          const overlapStart = Math.max(0, accumulator.length - chunkOverlap);
          accumulator = accumulator.slice(overlapStart) + sep + part;
        } else {
          chunks.push(...splitRecursive(part, sepIndex + 1));
          accumulator = "";
        }
      }
    }

    if (accumulator.trim()) chunks.push(accumulator.trim());
    return chunks;
  }

  return splitRecursive(text, 0).filter(c => c.length > 30);
}

// ============================================================================
// 3. EMBEDDINGS VECTORIELS (GEMINI text-embedding-004)
// ============================================================================

/**
 * Calcule l'embedding vectoriel (768 dimensions) pour un texte donné
 * @param {string} text - Texte à vectoriser
 * @param {boolean} isQuery - Vrai pour une question utilisateur, faux pour un document
 * @returns {Promise<number[]>}
 */
export async function computeEmbedding(text, isQuery = false) {
  const result = await embedModel.embedContent({
    content: { parts: [{ text }] },
    taskType: isQuery ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT
  });
  return result.embedding.values;
}

// ============================================================================
// 4. CALCUL GÉOMÉTRIQUE DE SIMILARITÉ COSINUS
// ============================================================================

/**
 * Calcule la similarité cosinus entre deux vecteurs
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Score entre -1.0 et 1.0 (1.0 = sens identique)
 */
export function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// 5. INGESTION DU PIPELINE COMPLET
// ============================================================================

/**
 * Ingestion complète d'un document dans le Vector Store Node.js
 * @param {string} filePath - Chemin du document à ingérer
 * @param {string} storePath - Emplacement du fichier de persistance JSON
 */
export async function ingestDocument(filePath, storePath = DEFAULT_STORE_PATH) {
  console.log(`\n🚀 [RAG Pipeline] Démarrage de l'ingestion : ${filePath}`);
  const startTime = Date.now();

  // 1. Parsing
  const doc = await extractDocumentText(filePath);
  console.log(`✓ Texte extrait (${doc.text.length} caractères, ~${doc.pagesCount} pages)`);

  // 2. Chunking
  const textChunks = recursiveChunkText(doc.text, 800, 150);
  console.log(`✓ Découpage terminé : ${textChunks.length} chunks sémantiques générés`);

  // 3. Embeddings & Indexation
  console.log(`🧠 Calcul des embeddings Gemini (text-embedding-004)...`);
  const vectorStore = [];

  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i];
    const embedding = await computeEmbedding(chunkText, false);

    vectorStore.push({
      id: `chunk_${i + 1}`,
      content: chunkText,
      metadata: {
        source: doc.filename,
        chunkIndex: i + 1,
        totalChunks: textChunks.length,
        charCount: chunkText.length
      },
      embedding
    });

    // Progression & temporisation courtoise pour respecter les quotas d'API
    if ((i + 1) % 5 === 0 || i === textChunks.length - 1) {
      console.log(`  ✓ ${i + 1} / ${textChunks.length} chunks vectorisés`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // 4. Sauvegarde
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(vectorStore, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`💾 [RAG Pipeline] Ingestion réussie en ${elapsed}s !`);
  console.log(`📁 Fichier vectoriel enregistré : ${storePath} (${vectorStore.length} vecteurs)`);

  return {
    totalChunks: vectorStore.length,
    storePath,
    elapsed
  };
}

// ============================================================================
// 6. RETRIEVAL (RECHERCHE SÉMANTIQUE)
// ============================================================================

/**
 * Recherche les chunks les plus proches de la question
 * @param {string} query - Question de l'utilisateur
 * @param {number} topK - Nombre de résultats à retourner
 * @param {number} minScore - Score minimal de similarité (0.0 à 1.0)
 * @param {string} storePath - Fichier du store
 * @returns {Promise<Array<{ content: string, metadata: object, similarity: number }>>}
 */
export async function searchSimilarChunks(query, topK = 3, minScore = 0.50, storePath = DEFAULT_STORE_PATH) {
  let storeContent;
  try {
    storeContent = await fs.readFile(storePath, 'utf-8');
  } catch {
    throw new Error(`Base vectorielle introuvable sur '${storePath}'. Lancez d'abord l'ingestion !`);
  }

  const store = JSON.parse(storeContent);
  if (!store || store.length === 0) {
    return [];
  }

  // Calcul du vecteur pour la question
  const queryVec = await computeEmbedding(query, true);

  // Calcul des scores de similarité
  const scored = store.map(item => ({
    content: item.content,
    metadata: item.metadata,
    similarity: cosineSimilarity(queryVec, item.embedding)
  }));

  // Tri décroissant et filtre
  return scored
    .filter(item => item.similarity >= minScore)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ============================================================================
// 7. AUGMENTATION & INFÉRENCE LLM (ZÉRO HALLUCINATION)
// ============================================================================

/**
 * Répond à une question en s'appuyant strictement sur le contexte RAG
 * @param {string} userQuestion - La question
 * @param {number} topK - Nombre d'extraits
 * @param {string} storePath - Chemin du store
 * @returns {Promise<{ answer: string, sources: Array<{ source: string, similarity: string }> }>}
 */
export async function queryRagPipeline(userQuestion, topK = 3, storePath = DEFAULT_STORE_PATH) {
  console.log(`\n🔍 [RAG Query] Recherche pour : "${userQuestion}"`);

  // 1. Retrieval
  const matches = await searchSimilarChunks(userQuestion, topK, 0.45, storePath);

  if (matches.length === 0) {
    return {
      answer: "Désolé, aucune information pertinente n'a été trouvée dans les documents de référence pour répondre à cette question.",
      sources: []
    };
  }

  console.log(`✓ ${matches.length} extraits pertinents trouvés (Meilleur score : ${(matches[0].similarity * 100).toFixed(1)}%)`);

  // 2. Construction du Contexte
  const contextFormatted = matches.map((m, idx) => {
    return `--- EXTRAIT ${idx + 1} (Source: ${m.metadata.source}, Score: ${(m.similarity * 100).toFixed(1)}%) ---\n${m.content}`;
  }).join("\n\n");

  // 3. Prompt Augmenté
  const systemInstruction = `Tu es l'assistant de référence NoorQuiz.
Tu réponds à la question de l'utilisateur EN TE BASANT STRICTEMENT et UNIQUEMENT sur les extraits fournis ci-dessous.

RÈGLES D'OR ABSOLUES :
1. ZÉRO HALLUCINATION : Ne jamais inventer ou supposer une information qui ne figure pas explicitement dans les extraits.
2. Si la réponse ne figure pas dans le texte, dis simplement : "D'après les documents fournis, cette information n'est pas mentionnée."
3. Cite toujours le nom de la source entre crochets à la fin de ta réponse (ex: [Source: knowledge_base_noorquiz.pdf]).
4. Sois clair, pédagogue et précis.`;

  const model = genAI.getGenerativeModel({
    model: chatModelName,
    systemInstruction
  });

  const prompt = `EXTRAITS DU DOCUMENT DE RÉFÉRENCE :
${contextFormatted}

QUESTION DE L'UTILISATEUR :
${userQuestion}`;

  // 4. Génération
  const response = await model.generateContent(prompt);
  const answer = response.response.text();

  return {
    answer,
    sources: matches.map(m => ({
      source: m.metadata.source,
      similarity: `${(m.similarity * 100).toFixed(1)}%`,
      preview: m.content.slice(0, 120) + '...'
    }))
  };
}
