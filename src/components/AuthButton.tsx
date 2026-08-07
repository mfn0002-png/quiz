import { useState } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { signInWithGoogle, signOut, User } from '../firebase';

interface AuthButtonProps {
  user: User | null;
  authLoading: boolean;
}

export function AuthButton({ user, authLoading }: AuthButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Erreur de connexion :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Erreur de déconnexion :", err);
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
        <Loader2 size={18} className="spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Utilisateur'}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--primary-color)' }}
            referrerPolicy="no-referrer"
          />
        )}
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.displayName}</span>
        <button
          onClick={handleSignOut}
          disabled={busy}
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          title="Se déconnecter"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={busy}
      className="btn btn-primary"
      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
    >
      {busy ? <Loader2 size={16} className="spin" style={{ marginRight: '0.4rem' }} /> : <LogIn size={16} style={{ marginRight: '0.4rem' }} />}
      Se connecter avec Google
    </button>
  );
}
