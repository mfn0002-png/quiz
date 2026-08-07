import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from '../firebase';
import { upsertLeaderboardProfile } from '../services/firestoreService';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) upsertLeaderboardProfile(u).catch(err => console.error(err));
    });
    return unsubscribe;
  }, []);

  return { user, authLoading };
}
