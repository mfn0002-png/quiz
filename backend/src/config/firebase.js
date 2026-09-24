import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDt_MCjXORIpx_4O-KyQgLVD_MoT1AYVTg",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "quiz-8e88c.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "quiz-8e88c",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "quiz-8e88c.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "720023330993",
  appId: process.env.FIREBASE_APP_ID || "1:720023330993:web:6c7c52992781fc61ea4290",
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
