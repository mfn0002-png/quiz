import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db, User } from '../firebase';
import { Difficulty, Question } from '../data/questions';

// ──────────────────────────────────────
// Sessions (users/{userId}/sessions/{sessionId})
// ──────────────────────────────────────
export interface SessionRecord {
  id?: string;
  difficulty: Difficulty;
  category: string;
  score: number;
  total: number;
  date: Timestamp;
  questions?: Question[];
  userAnswers?: (number | null)[];
}

export const saveSession = async (
  userId: string,
  difficulty: Difficulty,
  category: string,
  score: number,
  total: number,
  questions?: Question[],
  userAnswers?: (number | null)[]
): Promise<void> => {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  await addDoc(sessionsRef, {
    difficulty,
    category,
    score,
    total,
    date: Timestamp.now(),
    ...(questions ? { questions } : {}),
    ...(userAnswers ? { userAnswers } : {}),
  });

  // Met aussi à jour l'entrée du classement en une seule écriture cohérente
  await updateLeaderboardAfterSession(userId, score, total);
};



export const getUserSessions = async (userId: string, maxLimit: number = 20): Promise<SessionRecord[]> => {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const snapshot = await getDocs(sessionsRef);
  return snapshot.docs
    .map(d => ({ id: d.id, ...(d.data() as SessionRecord) }))
    .sort((a, b) => b.date.toMillis() - a.date.toMillis())
    .slice(0, maxLimit);
};

export interface UserStats {
  totalGames: number;
  averageScore: number; // en pourcentage (0-100)
  bestScore: number; // meilleur score brut sur une partie
  byCategory: Record<string, { games: number; averageScore: number }>;
}

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const snapshot = await getDocs(sessionsRef);

  const sessions: SessionRecord[] = snapshot.docs.map(d => d.data() as SessionRecord);

  if (sessions.length === 0) {
    return { totalGames: 0, averageScore: 0, bestScore: 0, byCategory: {} };
  }

  const totalGames = sessions.length;
  const bestScore = Math.max(...sessions.map(s => s.score));
  const overallPercentages = sessions.map(s => (s.total > 0 ? (s.score / s.total) * 100 : 0));
  const averageScore = overallPercentages.reduce((a, b) => a + b, 0) / totalGames;

  const byCategory: Record<string, { games: number; averageScore: number }> = {};
  const grouped: Record<string, number[]> = {};
  sessions.forEach(s => {
    const pct = s.total > 0 ? (s.score / s.total) * 100 : 0;
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(pct);
  });
  Object.entries(grouped).forEach(([category, pcts]) => {
    byCategory[category] = {
      games: pcts.length,
      averageScore: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    };
  });

  return { totalGames, averageScore, bestScore, byCategory };
};

// ──────────────────────────────────────
// Classement (leaderboard/{userId})
// ──────────────────────────────────────
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL: string | null;
  bestScore: number;
  totalGames: number;
  avgScore: number; // pourcentage moyen (0-100)
}

const updateLeaderboardAfterSession = async (
  userId: string,
  score: number,
  total: number
): Promise<void> => {
  const stats = await getUserStats(userId);
  const entryRef = doc(db, 'leaderboard', userId);
  const existing = await getDoc(entryRef);
  const prevData = existing.exists() ? (existing.data() as LeaderboardEntry) : null;

  await setDoc(
    entryRef,
    {
      displayName: prevData?.displayName || 'Joueur',
      photoURL: prevData?.photoURL || null,
      bestScore: stats.bestScore,
      totalGames: stats.totalGames,
      avgScore: stats.averageScore,
    },
    { merge: true }
  );

  // score/total ne sont pas utilisés directement ici mais gardés pour la signature de l'appelant
  void score;
  void total;
};

export const upsertLeaderboardProfile = async (user: User): Promise<void> => {
  const entryRef = doc(db, 'leaderboard', user.uid);
  await setDoc(
    entryRef,
    {
      displayName: user.displayName || 'Joueur',
      photoURL: user.photoURL || null,
    },
    { merge: true }
  );
};

export const getLeaderboard = async (topN: number = 20): Promise<LeaderboardEntry[]> => {
  const leaderboardRef = collection(db, 'leaderboard');
  const q = query(leaderboardRef, orderBy('bestScore', 'desc'), limit(topN));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ userId: d.id, ...(d.data() as Omit<LeaderboardEntry, 'userId'>) }));
};

// Utilitaire pour d'éventuels filtres futurs (ex: par catégorie)
export const getSessionsByCategory = async (userId: string, category: string) => {
  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsRef, where('category', '==', category));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as SessionRecord);
};
