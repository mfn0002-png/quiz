#!/usr/bin/env node
/**
 * syncFirebaseToSupabaseRag.js
 * 
 * Script CLI pour synchroniser automatiquement vos données Firebase (learningTopics, sources, evaluations)
 * vers la base vectorielle Supabase (pgvector).
 * 
 * Usage :
 *   node src/scripts/syncFirebaseToSupabaseRag.js
 *   node src/scripts/syncFirebaseToSupabaseRag.js --force
 */

import { syncFirebaseToSupabase } from '../services/ragSyncService.js';

const args = process.argv.slice(2);
const forceReindex = args.includes('--force');

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     ⚡ SYNCHRONISATION RAG FIREBASE ➔ SUPABASE PGVECTOR       ║
║        Extraction, Vectorisation Gemini & Indexation          ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  if (forceReindex) {
    console.log(`⚠️ Mode --force activé : réindexation complète de tous les documents.`);
  }

  const result = await syncFirebaseToSupabase({ forceReindex });

  console.log(`\n============================================================`);
  console.log(`✅ SYNCHRONISATION TERMINÉE`);
  console.log(`============================================================`);
  console.log(`• Chunks insérés : ${result.totalIngested}`);
  console.log(`• Chunks ignorés (déjà en base) : ${result.skippedCount}`);
  console.log(`• Erreurs : ${result.errorsCount}`);
  console.log(`• Durée : ${result.elapsed} secondes`);
  console.log(`============================================================\n`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Erreur fatale dans la synchronisation RAG :", err);
  process.exit(1);
});
