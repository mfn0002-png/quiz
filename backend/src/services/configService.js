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
import { db } from '../config/firebase.js';          // SDK client (fallback si adminDb indisponible)
import { adminDb, adminAuth } from '../config/firebaseAdmin.js'; // Admin SDK (bypass Security Rules & Auth)

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
    maxLives: 5,
    lifeRechargeSeconds: 180,
  },
};

let inMemoryConfig = { ...DEFAULT_CONFIG };

// Charger la config initiale depuis le fichier local
try {
  if (fs.existsSync(localConfigPath)) {
    const raw = fs.readFileSync(localConfigPath, 'utf8');
    inMemoryConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
} catch (err) {
  console.warn('⚠️ Impossible de lire platformConfig.json local :', err.message);
}

/**
 * Récupère la configuration actuelle de la plateforme (priorité Firestore via Admin SDK).
 */
export async function getPlatformConfig() {
  if (adminDb) {
    try {
      const snap = await adminDb.collection('settings').doc('platform').get();
      if (snap.exists) {
        inMemoryConfig = { ...DEFAULT_CONFIG, ...snap.data() };
      }
    } catch (err) {
      console.warn(`⚠️ [Config Service] Échec lecture Firestore Admin : ${err.message}`);
    }
  } else {
    try {
      const snap = await getDoc(doc(db, 'settings', 'platform'));
      if (snap.exists()) {
        inMemoryConfig = { ...DEFAULT_CONFIG, ...snap.data() };
      }
    } catch (err) {
      console.warn(`⚠️ [Config Service] Mode hors-ligne pour la config : ${err.message}`);
    }
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

  // 1. Persistance fichier local
  try {
    fs.mkdirSync(path.dirname(localConfigPath), { recursive: true });
    fs.writeFileSync(localConfigPath, JSON.stringify(merged, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Échec écriture platformConfig.json :', err.message);
  }

  // 2. Persistance Firestore
  if (adminDb) {
    try {
      await adminDb.collection('settings').doc('platform').set(merged, { merge: true });
      console.log('✅ [Config Service] Configuration plateforme enregistrée dans Firestore (Admin SDK)');
    } catch (err) {
      console.warn('⚠️ Échec enregistrement Firestore config (Admin SDK) :', err.message);
    }
  } else {
    try {
      await setDoc(doc(db, 'settings', 'platform'), merged, { merge: true });
      console.log('✅ [Config Service] Configuration plateforme enregistrée dans Firestore (Client SDK)');
    } catch (err) {
      console.warn('⚠️ Échec enregistrement Firestore config (Client SDK) :', err.message);
    }
  }

  return merged;
}

/**
 * Vérifie si un utilisateur possède le rôle 'admin' dans Firestore.
 * Utilise le Firebase Admin SDK (bypass Security Rules & Auth lookup) pour lire
 * le champ `role` ou `isAdmin` du document `users/{uid}` ou par email.
 *
 * @param {string} identifier - UID Firestore ou adresse e-mail
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin(identifier) {
  if (!identifier || typeof identifier !== 'string') return false;

  const clean = identifier.trim();

  // ── 1. Via Admin SDK (bypass Security Rules) ─────────────────────
  if (adminDb) {
    try {
      // Cas A : Par UID direct
      const byUid = await adminDb.collection('users').doc(clean).get();
      if (byUid.exists) {
        const d = byUid.data();
        if (d.role === 'admin' || d.isAdmin === true) {
          console.log(`✅ [Admin SDK] Rôle admin confirmé pour UID '${clean}'`);
          return true;
        }
      }
    } catch (err) {
      console.warn(`⚠️ [Admin SDK] Lecture UID '${clean}' : ${err.message}`);
    }

    if (clean.includes('@')) {
      const lowerEmail = clean.toLowerCase();
      try {
        // Cas B : Par champ email dans Firestore
        const snap = await adminDb.collection('users').where('email', '==', lowerEmail).limit(1).get();
        if (!snap.empty) {
          const d = snap.docs[0].data();
          if (d.role === 'admin' || d.isAdmin === true) {
            console.log(`✅ [Admin SDK] Rôle admin confirmé pour email '${clean}'`);
            return true;
          }
        }
      } catch (err) {
        console.warn(`⚠️ [Admin SDK] Lecture email Firestore '${clean}' : ${err.message}`);
      }

      // Cas C : Résolution email ➔ Firebase Auth UID ➔ document users/{uid}
      if (adminAuth) {
        try {
          const userRecord = await adminAuth.getUserByEmail(lowerEmail);
          if (userRecord && userRecord.uid) {
            // Vérification claims personnalisés
            if (userRecord.customClaims?.admin === true || userRecord.customClaims?.role === 'admin') {
              console.log(`✅ [Admin SDK] Rôle admin confirmé via Auth Custom Claims pour '${clean}'`);
              return true;
            }

            // Vérification doc Firestore users/{uid}
            const authDocSnap = await adminDb.collection('users').doc(userRecord.uid).get();
            if (authDocSnap.exists) {
              const d = authDocSnap.data();
              if (d.role === 'admin' || d.isAdmin === true) {
                console.log(`✅ [Admin SDK] Rôle admin confirmé pour '${clean}' (UID: ${userRecord.uid})`);
                return true;
              }
            }
          }
        } catch (err) {
          // L'utilisateur n'existe peut-être pas dans Firebase Auth avec cet email
        }
      }
    }
  }

  // ── 2. Fallback SDK client (si adminDb indisponible) ─────────────
  if (!adminDb) {
    try {
      const userSnap = await getDoc(doc(db, 'users', clean));
      if (userSnap.exists()) {
        const d = userSnap.data();
        if (d.role === 'admin' || d.isAdmin === true) return true;
      }
    } catch (_) {}

    if (clean.includes('@')) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', clean.toLowerCase()));
        const qs = await getDocs(q);
        for (const userDoc of qs.docs) {
          const d = userDoc.data();
          if (d.role === 'admin' || d.isAdmin === true) return true;
        }
      } catch (_) {}
    }
  }

  // ── 3. Fallback env ADMIN_EMAILS (si configuré explicitement) ────
  if (process.env.ADMIN_EMAILS) {
    const adminList = process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
    if (adminList.includes(clean.toLowerCase())) {
      console.log(`ℹ️ [Admin] Accès autorisé via variable ADMIN_EMAILS pour '${clean}'`);
      return true;
    }
  }

  return false;
}
