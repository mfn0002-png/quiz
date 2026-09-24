/**
 * configService.js
 * 
 * Service de gestion des paramètres de la plateforme (RAG, IA, Sync).
 * Vérifie le rôle 'admin' de l'utilisateur directement depuis Firestore (`users/{uid}` ou `users` par e-mail).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localConfigPath = path.resolve(__dirname, '../../data/platformConfig.json');

const DEFAULT_CONFIG = {
  rag: {
    model: 'gemini-flash-lite-latest',
    embeddingModel: 'text-embedding-004',
    topK: 3,
    minSimilarityScore: 0.45,
    collectionsToSync: ['learningTopics', 'sources', 'assistant_evaluations'],
    autoSyncEnabled: true,
  },
  quiz: {
    defaultDifficulty: 'Auto',
    defaultQuestionCount: 5,
    timerSeconds: 30,
  },
};

let inMemoryConfig = { ...DEFAULT_CONFIG };

// Charger la config initiale
try {
  if (fs.existsSync(localConfigPath)) {
    const raw = fs.readFileSync(localConfigPath, 'utf8');
    inMemoryConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
} catch (err) {
  console.warn('⚠️ Impossible de lire platformConfig.json local :', err.message);
}

/**
 * Récupère la configuration actuelle de la plateforme
 */
export async function getPlatformConfig() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    if (snap.exists()) {
      inMemoryConfig = { ...DEFAULT_CONFIG, ...snap.data() };
    }
  } catch (err) {
    console.warn(`⚠️ [Config Service] Mode hors-ligne pour la config : ${err.message}`);
  }
  return inMemoryConfig;
}

/**
 * Met à jour la configuration de la plateforme (Admin uniquement)
 * @param {Object} newConfig 
 */
export async function updatePlatformConfig(newConfig) {
  const merged = {
    ...inMemoryConfig,
    ...newConfig,
    rag: { ...inMemoryConfig.rag, ...newConfig.rag },
    quiz: { ...inMemoryConfig.quiz, ...newConfig.quiz },
    updatedAt: new Date().toISOString(),
  };

  inMemoryConfig = merged;

  // Persistance fichier local
  try {
    fs.mkdirSync(path.dirname(localConfigPath), { recursive: true });
    fs.writeFileSync(localConfigPath, JSON.stringify(merged, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Échec écriture platformConfig.json :', err.message);
  }

  // Persistance Firestore
  try {
    await setDoc(doc(db, 'settings', 'platform'), merged, { merge: true });
    console.log('✅ [Config Service] Configuration plateforme enregistrée dans Firestore');
  } catch (err) {
    console.warn('⚠️ Échec enregistrement Firestore config :', err.message);
  }

  return merged;
}

/**
 * Vérifie si un utilisateur possède le rôle 'admin' dans Firestore.
 * Recherche par `userId` (UID) ou par `email` dans la collection `users`.
 * 
 * @param {string} identifier - UID Firestore ou Adresse E-mail de l'utilisateur
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(identifier) {
  if (!identifier || typeof identifier !== 'string') return false;

  const clean = identifier.trim();

  // 1. Tenter par UID Firestore
  try {
    const userSnap = await getDoc(doc(db, 'users', clean));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.role === 'admin' || data.isAdmin === true) {
        return true;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Config Service] Échec vérification rôle par UID '${clean}' : ${err.message}`);
  }

  // 2. Tenter par E-mail Firestore
  if (clean.includes('@')) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', clean.toLowerCase()));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        for (const userDoc of querySnap.docs) {
          const data = userDoc.data();
          if (data.role === 'admin' || data.isAdmin === true) {
            return true;
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ [Config Service] Échec recherche rôle par email '${clean}' : ${err.message}`);
    }
  }

  // Fallback dev de sécurité : si la variable d'environnement ADMIN_EMAILS est définie
  if (process.env.ADMIN_EMAILS) {
    const adminList = process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
    if (adminList.includes(clean.toLowerCase())) return true;
  }

  return false;
}
