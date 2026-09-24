import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from '../firebase';
import { upsertLeaderboardProfile, ensureUserProfileDoc } from '../services/firestoreService';

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
        ensureUserProfileDoc(u).catch(() => {});
        upsertLeaderboardProfile(u).catch(() => {});
      }
    });

    return unsubscribe;
  }, []);

  return { user, authLoading };
}
