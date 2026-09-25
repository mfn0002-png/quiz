/**
 * firebaseAdmin.js
 *
 * Initialise le Firebase Admin SDK pour une utilisation cote serveur.
 * L'Admin SDK bypasse les Firestore Security Rules et lit/ecrit avec
 * les droits root du projet — ideal pour verifier les roles admin.
 *
 * Deux modes d'authentification (par priorite) :
 *  1. Fichier service account JSON (FIREBASE_SERVICE_ACCOUNT_PATH)
 *  2. Application Default Credentials (ADC) — si deploy sur GCP
 */

import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

let adminDb = null;

function initAdmin() {
  if (getApps().length > 0) {
    adminDb = getFirestore(getApps()[0]);
    return;
  }

  try {
    // Option 1 : fichier service account explicite
    const possiblePaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.resolve(__dirname, '../../firebase-service-account.json'),
      path.resolve(__dirname, '../../../firebase-service-account.json'),
    ].filter(Boolean);

    const saPath = possiblePaths.find(p => fs.existsSync(p));

    if (saPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      initializeApp({ credential: cert(serviceAccount) });
      console.log(`✅ [Firebase Admin] Authentifie via service account JSON (${saPath})`);
    } else {
      // Option 2 : Application Default Credentials (GCP / env GOOGLE_APPLICATION_CREDENTIALS)
      initializeApp({ credential: applicationDefault() });
      console.log('✅ [Firebase Admin] Authentifie via Application Default Credentials');
    }

    adminDb = getFirestore();
  } catch (err) {
    console.warn('⚠️ [Firebase Admin] Initialisation echouee :', err.message);
    console.warn('   -> La verification de role tombera sur le fallback ADMIN_EMAILS');
    adminDb = null;
  }
}

initAdmin();

export { adminDb };
