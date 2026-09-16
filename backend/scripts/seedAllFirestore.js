import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDt_MCjXORIpx_4O-KyQgLVD_MoT1AYVTg",
  authDomain: "quiz-8e88c.firebaseapp.com",
  projectId: "quiz-8e88c",
  storageBucket: "quiz-8e88c.firebasestorage.app",
  messagingSenderId: "720023330993",
  appId: "1:720023330993:web:6c7c52992781fc61ea4290",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const learningDir = path.resolve(__dirname, '../data/learning');

function loadAllTopics() {
  const topics = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.json') && !entry.name.startsWith('all')) {
        const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (json.id && (json.format === 'fiche' || json.format === 'recit')) {
          topics.push(json);
        }
      }
    }
  }

  scanDir(learningDir);
  return topics.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

async function main() {
  console.log('🚀 Synchronisation des fichiers JSON vers Firestore (quiz-8e88c)...');

  const topics = loadAllTopics();
  console.log(`Trouvé ${topics.length} topics modulaires en JSON.`);

  for (const topic of topics) {
    const docRef = doc(db, 'learningTopics', topic.id);
    await setDoc(docRef, topic, { merge: true });
    console.log(`✅ [${topic.order}] "${topic.id}" synchronisé (${topic.title})`);
  }

  // 2. Synchroniser les références scripturaires (sources)
  const sourcesPath = path.resolve(__dirname, '../data/staticSources.json');
  if (fs.existsSync(sourcesPath)) {
    const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
    const keys = Object.keys(sources);
    console.log(`\n📜 Synchronisation de ${keys.length} sources scripturaires vers Firestore...`);
    for (const key of keys) {
      const firestoreKey = key.replace(/[:/]/g, '_');
      const docRef = doc(db, 'sources', firestoreKey);
      await setDoc(docRef, sources[key], { merge: true });
    }
    console.log(`✅ ${keys.length} sources synchronisées dans Firestore (collection 'sources')`);
  }

  console.log('🎉 Synchronisation terminée avec succès !');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erreur de synchronisation:', err);
  process.exit(1);
});
