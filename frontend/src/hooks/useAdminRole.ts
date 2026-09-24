import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, User } from '../firebase';

/**
 * Hook React pour vérifier si l'utilisateur connecté possède le rôle 'admin' dans Firestore.
 * Document consulté : `users/{user.uid}` (champ `role === 'admin'` ou `isAdmin === true`).
 */
export function useAdminRole(user: User | null) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkRole() {
      if (!user) {
        if (active) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        // Lecture du document profil utilisateur dans Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const hasAdminRole = data.role === 'admin' || data.isAdmin === true;
          if (active) setIsAdmin(hasAdminRole);
        } else {
          // Si le document n'existe pas encore
          if (active) setIsAdmin(false);
        }
      } catch (err) {
        console.warn('⚠️ Impossible de vérifier le rôle admin dans Firestore :', err);
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    checkRole();

    return () => {
      active = false;
    };
  }, [user]);

  return { isAdmin, loading };
}
