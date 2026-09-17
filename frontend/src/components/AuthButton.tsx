import { useState } from 'react';
import { LogIn, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { signInWithGoogle, signOut, User } from '../firebase';

interface AuthButtonProps {
  user: User | null;
  authLoading: boolean;
  compact?: boolean;
}

export function AuthButton({ user, authLoading, compact }: AuthButtonProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: compact ? '38px' : 'auto', height: compact ? '38px' : 'auto', color: 'var(--text-secondary)' }}>
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
          title={user.displayName || 'Mon profil'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 0 : '0.5rem',
            background: 'none',
            border: '2px solid var(--primary-color)',
            borderRadius: 'var(--radius-full)',
            padding: compact ? '2px' : '0.35rem 0.75rem 0.35rem 0.35rem',
            width: compact ? '38px' : 'auto',
            height: compact ? '38px' : 'auto',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          {busy
            ? <Loader2 size={18} className="spin" />
            : user.photoURL
              ? <img
                  src={user.photoURL}
                  alt={user.displayName || 'Utilisateur'}
                  style={{ width: compact ? 30 : 28, height: compact ? 30 : 28, borderRadius: '50%' }}
                  referrerPolicy="no-referrer"
                />
              : <div style={{ width: compact ? 30 : 28, height: compact ? 30 : 28, borderRadius: '50%', backgroundColor: 'var(--primary-color)' }} />
          }
          {!compact && (
            <span style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName}
            </span>
          )}
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
              left: compact ? 'calc(100% + 12px)' : 'auto',
              right: compact ? 'auto' : 0,
              bottom: compact ? '0' : 'auto',
              top: compact ? 'auto' : 'calc(100% + 8px)',
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.5rem',
              minWidth: '220px',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}>
              {/* Info utilisateur */}
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
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
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
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
      title="Se connecter avec Google"
      style={{
        padding: compact ? 0 : '0.5rem 1rem',
        fontSize: '0.9rem',
        width: compact ? '38px' : 'auto',
        height: compact ? '38px' : 'auto',
        borderRadius: compact ? '50%' : 'var(--radius-md)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {busy
        ? <Loader2 size={18} className="spin" style={{ marginRight: compact ? 0 : '0.4rem' }} />
        : <LogIn size={18} style={{ marginRight: compact ? 0 : '0.4rem' }} />
      }
      {!compact && 'Se connecter avec Google'}
    </button>
  );
}
