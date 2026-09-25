import { useState } from 'react';
import { LogIn, LogOut, Loader2, RefreshCw, ChevronUp, ShieldCheck } from 'lucide-react';
import { signInWithGoogle, signOut, User } from '../firebase';
import { useAdminRole } from '../hooks/useAdminRole';

interface AuthButtonProps {
  user: User | null;
  authLoading: boolean;
  compact?: boolean;
}

export function AuthButton({ user, authLoading, compact }: AuthButtonProps) {
  const [busy, setBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { isAdmin } = useAdminRole(user);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: compact ? '38px' : '100%', height: compact ? '38px' : '42px', color: 'var(--text-secondary)' }}>
        <Loader2 size={18} className="spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ position: 'relative', width: compact ? 'auto' : '100%' }}>
        {/* Card Profil Utilisateur Harmonieuse */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: compact ? '3px' : '0.4rem 0.6rem',
            backgroundColor: 'var(--surface-color-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
          }}
        >
          {/* Section Profil (Cliquable pour ouvrir le menu) */}
          <button
            onClick={() => setShowMenu(prev => !prev)}
            disabled={busy}
            title={user.displayName || 'Mon profil'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: compact ? 0 : '0.6rem',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              color: 'var(--text-primary)',
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
            }}
          >
            {busy ? (
              <Loader2 size={18} className="spin" />
            ) : user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Utilisateur'}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--primary-color)', flexShrink: 0 }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {user.displayName?.[0] || 'U'}
              </div>
            )}

            {!compact && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                    {user.displayName}
                  </span>
                  {isAdmin && (
                    <span title="Compte Administrateur" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <ShieldCheck size={14} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isAdmin ? 'Administrateur' : user.email}
                </p>
              </div>
            )}

            {!compact && <ChevronUp size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0, transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
          </button>

          {/* Bouton de Déconnexion Directe (Quick Sign Out) */}
          {!compact && (
            <button
              onClick={handleSignOut}
              disabled={busy}
              title="Se déconnecter"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.2rem',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = 'var(--error-color)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Menu Déroulant s'ouvrant VERS LE HAUT (Upwards Popup) */}
        {showMenu && (
          <>
            <div
              onClick={() => setShowMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 100 }}
            />
            <div
              style={{
                position: 'absolute',
                left: compact ? 'calc(100% + 12px)' : '0',
                right: compact ? 'auto' : '0',
                bottom: 'calc(100% + 8px)',
                backgroundColor: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.15)',
                padding: '0.5rem',
                minWidth: '220px',
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              {/* Détails Compte */}
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Connecté avec</p>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </p>
                {isAdmin && (
                  <span style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(5, 150, 105, 0.15)', color: 'var(--primary-color)' }}>
                    👑 Administrateur RAG
                  </span>
                )}
              </div>

              {/* Changer de compte */}
              <button
                onClick={handleSwitchAccount}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RefreshCw size={15} style={{ color: 'var(--primary-color)' }} />
                <span>Changer de compte</span>
              </button>

              {/* Se déconnecter */}
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  background: 'none',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.85rem',
                  color: 'var(--error-color)',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={15} />
                <span>Se déconnecter</span>
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
        padding: compact ? 0 : '0.55rem 1rem',
        fontSize: '0.88rem',
        fontWeight: 600,
        width: compact ? '38px' : '100%',
        height: compact ? '38px' : 'auto',
        borderRadius: compact ? '50%' : 'var(--radius-lg)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {busy ? (
        <Loader2 size={18} className="spin" style={{ marginRight: compact ? 0 : '0.4rem' }} />
      ) : (
        <LogIn size={18} style={{ marginRight: compact ? 0 : '0.4rem' }} />
      )}
      {!compact && 'Se connecter avec Google'}
    </button>
  );
}
