import { useState } from 'react';
import { LogIn, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { signInWithGoogle, signOut, User } from '../firebase';

interface AuthButtonProps {
  user: User | null;
  authLoading: boolean;
}

export function AuthButton({ user, authLoading }: AuthButtonProps) {
  const [busy, setBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
    setShowMenu(false);
    try {
      await signOut();
    } catch (err) {
      console.error("Erreur de déconnexion :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    setBusy(true);
    setShowMenu(false);
    try {
      // Se déconnecter d'abord puis rouvrir le popup Google (qui permet de choisir un autre compte)
      await signOut();
      await signInWithGoogle();
    } catch (err) {
      console.error("Erreur de changement de compte :", err);
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
      <div style={{ position: 'relative' }}>
        {/* Bouton principal avec photo + nom */}
        <button
          onClick={() => setShowMenu(prev => !prev)}
          disabled={busy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: '2px solid var(--primary-color)',
            borderRadius: 'var(--radius-full)',
            padding: '0.35rem 0.75rem 0.35rem 0.35rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            color: 'var(--text-primary)',
          }}
        >
          {busy
            ? <Loader2 size={18} className="spin" />
            : user.photoURL
              ? <img
                  src={user.photoURL}
                  alt={user.displayName || 'Utilisateur'}
                  style={{ width: 28, height: 28, borderRadius: '50%' }}
                  referrerPolicy="no-referrer"
                />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--primary-color)' }} />
          }
          <span style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.displayName}
          </span>
        </button>

        {/* Menu déroulant */}
        {showMenu && (
          <>
            {/* Overlay pour fermer le menu en cliquant ailleurs */}
            <div
              onClick={() => setShowMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            />
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              backgroundColor: 'var(--surface-color)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.5rem',
              minWidth: '200px',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}>
              {/* Info utilisateur */}
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '0.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Connecté en tant que</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </p>
              </div>

              {/* Changer de compte */}
              <button
                onClick={handleSwitchAccount}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.6rem 0.75rem', background: 'none',
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontFamily: 'var(--font-family)', fontSize: '0.9rem',
                  color: 'var(--text-primary)', textAlign: 'left',
                  transition: 'background-color var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RefreshCw size={16} color="var(--primary-color)" />
                Changer de compte
              </button>

              {/* Se déconnecter */}
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.6rem 0.75rem', background: 'none',
                  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontFamily: 'var(--font-family)', fontSize: '0.9rem',
                  color: 'var(--error-color)', textAlign: 'left',
                  transition: 'background-color var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={16} />
                Se déconnecter
              </button>
            </div>
          </>
        )}
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
      {busy
        ? <Loader2 size={16} className="spin" style={{ marginRight: '0.4rem' }} />
        : <LogIn size={16} style={{ marginRight: '0.4rem' }} />
      }
      Se connecter avec Google
    </button>
  );
}
