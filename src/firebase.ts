import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User,
  getRedirectResult,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Toutes les valeurs viennent de .env.local (préfixe VITE_ obligatoire pour Vite)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error(
    "Configuration Firebase manquante : renseignez les variables VITE_FIREBASE_* dans .env.local"
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
export const handleRedirectResult = () => getRedirectResult(auth);

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signOut = () => firebaseSignOut(auth);

export const onAuthStateChanged = (callback: (user: User | null) => void) =>
  firebaseOnAuthStateChanged(auth, callback);

export type { User };
