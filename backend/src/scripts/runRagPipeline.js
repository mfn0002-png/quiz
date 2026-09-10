#!/usr/bin/env node
/**
 * runRagPipeline.js
 * 
 * Script CLI exécutable pour tester le pipeline RAG Node.js de bout en bout :
 * Usage:
 *   node src/scripts/runRagPipeline.js ingest ../knowledge_base_noorquiz.pdf
 *   node src/scripts/runRagPipeline.js query "Combien de versets compte le Coran ?"
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestDocument, queryRagPipeline } from '../services/ragVectorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         ⚡ PIPELINE RAG NODE.JS DE BOUT EN BOUT               ║
║      Google Gemini text-embedding-004 & Cosine Vector Store   ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  if (!command || !['ingest', 'query'].includes(command)) {
    console.log(`Usage :
  node src/scripts/runRagPipeline.js ingest <chemin_fichier.pdf|md|txt>
  node src/scripts/runRagPipeline.js query "<votre question>"
    `);
    process.exit(0);
  }

  if (command === 'ingest') {
    const fileTarget = args[1] || path.resolve(__dirname, '../../../knowledge_base_noorquiz.pdf');
    console.log(`🎯 Cible d'ingestion : ${fileTarget}`);
    const res = await ingestDocument(fileTarget);
    console.log(`\n🎉 Ingestion terminée avec succès ! (${res.totalChunks} chunks indexés).`);
    console.log(`👉 Vous pouvez maintenant poser une question :`);
    console.log(`   node src/scripts/runRagPipeline.js query "Quel est le seuil de la Zakat ?"`);
  } else if (command === 'query') {
    const question = args.slice(1).join(' ') || "Quels sont les piliers de la foi et de l'islam ?";
    const res = await queryRagPipeline(question, 3);
    
    console.log(`\n============================================================`);
    console.log(`🤖 RÉPONSE DE L'AGENT IA (ZÉRO HALLUCINATION) :`);
    console.log(`============================================================`);
    console.log(res.answer);
    console.log(`\n📚 SOURCES ET SCORES DE SIMILARITÉ :`);
    res.sources.forEach((s, idx) => {
      console.log(`  [${idx + 1}] Source: ${s.source} (Pertinence: ${s.similarity})`);
      console.log(`      Extrait: ${s.preview}`);
    });
    console.log(`============================================================\n`);
  }
}

main().catch(err => {
  console.error("❌ Erreur dans le pipeline RAG :", err);
  process.exit(1);
});
