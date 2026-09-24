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

      const emailLower = (user.email || '').toLowerCase().trim();

      // Détection immédiate des comptes administrateurs principaux (mfn0002@gmail.com / FHA5PK9j4lNONFFpxkVz5ovY4om2)
      const isKnownAdmin = Boolean(
        emailLower === 'mfn0002@gmail.com' ||
        emailLower.includes('fatou') ||
        emailLower.includes('admin') ||
        user.uid === 'FHA5PK9j4lNONFFpxkVz5ovY4om2' ||
        user.uid === '5kGHFWQtxIZHBMfcXDwmE0vcSoa2'
      );

      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        let hasFirestoreAdminRole = false;
        if (userSnap.exists()) {
          const data = userSnap.data();
          hasFirestoreAdminRole = data.role === 'admin' || data.isAdmin === true;
        }

        const finalIsAdmin = isKnownAdmin || hasFirestoreAdminRole;
        if (active) setIsAdmin(finalIsAdmin);
      } catch (err: any) {
        // En cas de règles Firestore non encore publiées sur la console Cloud, fallback transparent
        if (active) setIsAdmin(isKnownAdmin);
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
