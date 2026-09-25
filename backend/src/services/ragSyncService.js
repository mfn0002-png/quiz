/**
 * ragSyncService.js
 * 
 * Service de Synchronisation Firebase Firestore ➔ Supabase pgvector :
 * 1. Extrait les données de Firebase Firestore (learningTopics, sources, assistant_evaluations avec rating == 'good')
 * 2. Découpe et vectorise via Google Gemini (text-embedding-004)
 * 3. Stocke les vecteurs dans la table Supabase `documents` avec métadonnées de traçabilité
 * 4. Évite les re-vectorisations inutiles en gérant les identifiants de documents (sync incrémentielle)
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { adminDb } from '../config/firebaseAdmin.js';
import { getSupabaseClient } from './ragSupabaseService.js';
import { computeEmbedding, recursiveChunkText } from './ragVectorService.js';

/**
 * Extrait et formatte le texte d'un topic de la collection `learningTopics`
 * @param {Object} topic - Document Firestore
 * @returns {Array<{ content: string, metadata: Object }>}
 */
function extractChunksFromTopic(topic) {
  const chunks = [];
  const title = topic.title || topic.id;
  const category = topic.category || 'apprentissage';

  // Si c'est un recit (ex: histoire d'un prophète)
  if (topic.format === 'recit' && Array.isArray(topic.chapters)) {
    topic.chapters.forEach((chapter, idx) => {
      const chapterTitle = chapter.title || chapter.label || `Chapitre ${idx + 1}`;
      let textContent = '';
      if (Array.isArray(chapter.blocks) && chapter.blocks.length > 0) {
        textContent = chapter.blocks
          .map(b => {
            if (b.type === 'text') return b.value;
            if (b.type === 'static-quote') return `${b.arabic || ''}\n${b.translation || ''}`;
            if (b.type === 'list') return (b.items || []).join('\n');
            if (b.type === 'flip') return `${b.front} : ${b.back}`;
            return '';
          })
          .filter(Boolean)
          .join('\n\n');
      } else if (Array.isArray(chapter.paragraphs)) {
        textContent = chapter.paragraphs.join('\n');
      } else {
        textContent = chapter.content || chapter.text || '';
      }

      if (textContent.trim()) {
        const textToChunk = `[THÈME: ${title}] - [CHAPITRE: ${chapterTitle}]\n${textContent}`;
        const subChunks = recursiveChunkText(textToChunk, 800, 150);

        subChunks.forEach((chunkText, cIdx) => {
          chunks.push({
            content: chunkText,
            metadata: {
              firebaseDocId: topic.id,
              collection: 'learningTopics',
              format: 'recit',
              title,
              category,
              chapterTitle,
              chunkIndex: cIdx + 1,
              source: `Firebase/learningTopics/${topic.id}`,
            },
          });
        });
      }
    });
  } else if (Array.isArray(topic.sections)) {
    // Si c'est une fiche d'apprentissage avec des sections
    topic.sections.forEach((section, idx) => {
      const heading = section.heading || `Section ${idx + 1}`;
      let body = '';
      if (Array.isArray(section.blocks) && section.blocks.length > 0) {
        body = section.blocks
          .map(b => (b.type === 'text' ? b.value : ''))
          .filter(Boolean)
          .join('\n\n');
      } else {
        body = section.body || section.content || '';
      }
      const textToChunk = `[THÈME: ${title}] - [SECTION: ${heading}]\n${body}`;

      const subChunks = recursiveChunkText(textToChunk, 800, 150);
      subChunks.forEach((chunkText, cIdx) => {
        chunks.push({
          content: chunkText,
          metadata: {
            firebaseDocId: topic.id,
            collection: 'learningTopics',
            format: 'fiche',
            title,
            category,
            heading,
            chunkIndex: cIdx + 1,
            source: `Firebase/learningTopics/${topic.id}`,
          },
        });
      });
    });
  } else if (topic.summary || topic.description) {
    // Fallback texte brut
    const rawText = `[THÈME: ${title}]\n${topic.summary || ''}\n${topic.description || ''}`;
    const subChunks = recursiveChunkText(rawText, 800, 150);
    subChunks.forEach((chunkText, cIdx) => {
      chunks.push({
        content: chunkText,
        metadata: {
          firebaseDocId: topic.id,
          collection: 'learningTopics',
          title,
          category,
          chunkIndex: cIdx + 1,
          source: `Firebase/learningTopics/${topic.id}`,
        },
      });
    });
  }

  return chunks;
}

/**
 * Extrait le texte d'un document de la collection `sources`
 * @param {Object} docData - Document Firestore
 * @returns {Object|null}
 */
function extractChunkFromSource(docData) {
  if (!docData.arabic && !docData.translation) return null;

  const citation = docData.citation || docData.id;
  const content = `[RÉFÉRENCE SCRIPTURAIRE: ${citation}]\nArabe: ${docData.arabic || ''}\nPhonétique: ${docData.phonetic || ''}\nTraduction: ${docData.translation || ''}`;

  return {
    content,
    metadata: {
      firebaseDocId: docData.id,
      collection: 'sources',
      citation,
      source: `Firebase/sources/${docData.id}`,
    },
  };
}

/**
 * Extrait le texte d'une évaluation positive de l'Assistant
 * @param {Object} evalData - Document Firestore
 * @returns {Object|null}
 */
function extractChunkFromEvaluation(evalData) {
  if (!evalData.question || !evalData.answer) return null;

  const content = `[RÉPONSE ASSISTANT CERTIFIÉE (ÉVALUATION POSITIVE)]\nQuestion de l'utilisateur : ${evalData.question}\nRéponse certifiée : ${evalData.answer}`;

  return {
    content,
    metadata: {
      firebaseDocId: evalData.id,
      collection: 'assistant_evaluations',
      rating: 'good',
      certifiedAt: evalData.createdAt || new Date().toISOString(),
      source: `Firebase/assistant_evaluations/${evalData.id}`,
    },
  };
}

/**
 * Récupère tous les identifiants Firebase déjà indexés dans Supabase
 * @returns {Promise<Set<string>>}
 */
async function getExistingIndexedDocIds(supabase) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('metadata');

    if (error || !data) return new Set();

    const set = new Set();
    data.forEach(item => {
      if (item.metadata?.firebaseDocId) {
        set.add(item.metadata.firebaseDocId);
      }
    });
    return set;
  } catch (err) {
    console.warn(`⚠️ [RAG Sync] Impossible de lire les documents existants dans Supabase : ${err.message}`);
    return new Set();
  }
}

/**
 * Synchronise les données de Firestore vers Supabase pgvector
 * @param {Object} options
 * @param {boolean} [options.forceReindex=false] - Forcer la réindexation complète de tous les documents
 * @returns {Promise<{ totalIngested: number, skippedCount: number, errorsCount: number }>}
 */
export async function syncFirebaseToSupabase({ forceReindex = false } = {}) {
  console.log(`\n🚀 [RAG Sync] Démarrage de la synchronisation Firebase ➔ Supabase pgvector...`);
  const startTime = Date.now();

  const supabase = getSupabaseClient();

  const indexedDocIds = forceReindex ? new Set() : await getExistingIndexedDocIds(supabase);
  console.log(`📊 Documents déjà indexés trouvés dans Supabase : ${indexedDocIds.size}`);

  let totalIngested = 0;
  let skippedCount = 0;
  let errorsCount = 0;

  // ------------------------------------------------------------------------
  // 1. SYNCHRONISATION : learningTopics (Fiches, Récits, Duas, Prophètes)
  // ------------------------------------------------------------------------
  console.log(`\n📖 [1/3] Récupération de la collection 'learningTopics'...`);
  try {
    const topicsDocs = adminDb
      ? (await adminDb.collection('learningTopics').get()).docs
      : (await getDocs(collection(db, 'learningTopics'))).docs;
    console.log(`  ✓ ${topicsDocs.length} sujet(s) trouvé(s) dans Firestore`);

    for (const docSnap of topicsDocs) {
      const topic = { id: docSnap.id, ...docSnap.data() };

      if (!forceReindex && indexedDocIds.has(topic.id)) {
        skippedCount++;
        continue;
      }

      const chunks = extractChunksFromTopic(topic);
      if (chunks.length === 0) continue;

      console.log(`  🧠 Vectorisation de "${topic.title || topic.id}" (${chunks.length} chunk(s))...`);

      const rowsToInsert = [];
      for (const chunk of chunks) {
        const embedding = await computeEmbedding(chunk.content, false);
        rowsToInsert.push({
          content: chunk.content,
          metadata: chunk.metadata,
          embedding,
        });
        await new Promise(r => setTimeout(r, 150)); // Quota friendly
      }

      if (rowsToInsert.length > 0) {
        const { error } = await supabase.from('documents').insert(rowsToInsert);
        if (error) {
          console.error(`  ❌ Erreur Supabase pour '${topic.id}': ${error.message}`);
          errorsCount++;
        } else {
          totalIngested += rowsToInsert.length;
          console.log(`  ✅ ${rowsToInsert.length} chunk(s) insérés pour '${topic.id}'`);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Erreur lors de la lecture de 'learningTopics' : ${err.message}`);
  }

  // ------------------------------------------------------------------------
  // 2. SYNCHRONISATION : sources (Versets, Hadiths, Invocations)
  // ------------------------------------------------------------------------
  console.log(`\n📚 [2/3] Récupération de la collection 'sources'...`);
  try {
    const sourcesDocs = adminDb
      ? (await adminDb.collection('sources').get()).docs
      : (await getDocs(collection(db, 'sources'))).docs;
    console.log(`  ✓ ${sourcesDocs.length} document(s) trouvé(s) dans 'sources'`);

    for (const docSnap of sourcesDocs) {
      const sourceData = { id: docSnap.id, ...docSnap.data() };

      // Ignorer les évaluations qui auraient été enregistrées en fallback dans 'sources'
      if (sourceData.type === 'assistant_evaluation') continue;

      if (!forceReindex && indexedDocIds.has(sourceData.id)) {
        skippedCount++;
        continue;
      }

      const chunk = extractChunkFromSource(sourceData);
      if (!chunk) continue;

      console.log(`  🧠 Vectorisation de la source "${sourceData.id}"...`);
      const embedding = await computeEmbedding(chunk.content, false);

      const { error } = await supabase.from('documents').insert([{
        content: chunk.content,
        metadata: chunk.metadata,
        embedding,
      }]);

      if (error) {
        console.error(`  ❌ Erreur Supabase pour source '${sourceData.id}': ${error.message}`);
        errorsCount++;
      } else {
        totalIngested++;
        console.log(`  ✅ Source '${sourceData.id}' insérée`);
      }
      await new Promise(r => setTimeout(r, 150));
    }
  } catch (err) {
    console.error(`❌ Erreur lors de la lecture de 'sources' : ${err.message}`);
  }

  // ------------------------------------------------------------------------
  // 3. SYNCHRONISATION : assistant_evaluations (Réponses certifiées 👍)
  // ------------------------------------------------------------------------
  console.log(`\n👍 [3/3] Récupération des évaluations certifiées (rating == 'good')...`);
  try {
    let evalDocs = [];
    if (adminDb) {
      try {
        const evalSnap = await adminDb.collection('assistant_evaluations').where('rating', '==', 'good').get();
        evalDocs = evalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        try {
          const evalSnap = await adminDb.collection('sources').where('type', '==', 'assistant_evaluation').where('rating', '==', 'good').get();
          evalDocs = evalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {}
      }
    } else {
      try {
        const q = query(collection(db, 'assistant_evaluations'), where('rating', '==', 'good'));
        const evalSnap = await getDocs(q);
        evalDocs = evalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        // Fallback sur collection sources
        const q = query(collection(db, 'sources'), where('type', '==', 'assistant_evaluation'), where('rating', '==', 'good'));
        const evalSnap = await getDocs(q);
        evalDocs = evalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    }

    console.log(`  ✓ ${evalDocs.length} évaluation(s) certifiée(s) trouvée(s)`);

    for (const evalData of evalDocs) {
      if (!forceReindex && indexedDocIds.has(evalData.id)) {
        skippedCount++;
        continue;
      }

      const chunk = extractChunkFromEvaluation(evalData);
      if (!chunk) continue;

      console.log(`  🧠 Vectorisation de la réponse certifiée "${evalData.id}"...`);
      const embedding = await computeEmbedding(chunk.content, false);

      const { error } = await supabase.from('documents').insert([{
        content: chunk.content,
        metadata: chunk.metadata,
        embedding,
      }]);

      if (error) {
        console.error(`  ❌ Erreur Supabase pour évaluation '${evalData.id}': ${error.message}`);
        errorsCount++;
      } else {
        totalIngested++;
        console.log(`  ✅ Évaluation '${evalData.id}' insérée dans le RAG`);
      }
      await new Promise(r => setTimeout(r, 150));
    }
  } catch (err) {
    console.error(`❌ Erreur lors de la lecture des évaluations : ${err.message}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 [RAG Sync] Synchronisation terminée en ${elapsed}s !`);
  console.log(`📊 Bilan : ${totalIngested} nouveau(x) chunk(s) inséré(s), ${skippedCount} ignoré(s) (déjà en base), ${errorsCount} erreur(s).`);

  return {
    totalIngested,
    skippedCount,
    errorsCount,
    elapsed,
  };
}
