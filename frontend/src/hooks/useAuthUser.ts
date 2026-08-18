import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from '../firebase';
import { upsertLeaderboardProfile } from '../services/firestoreService';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  // authLoading commence à true pour éviter la page vide pendant l'init Firebase
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged est appelé immédiatement par Firebase avec l'état actuel
    // (user connecté ou null). Cela résout le problème de page vide après login.
    const unsubscribe = onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        upsertLeaderboardProfile(u).catch(err => console.error("Erreur profil leaderboard :", err));
      }
    });

    return unsubscribe;
  }, []);

  return { user, authLoading };
}
