import { useState } from 'react';
import { BookOpen, Play, ChevronDown, LogIn, Sparkles, Moon, Clock } from 'lucide-react';
import { Difficulty } from '../../data/questions';
import { CATEGORIES, DIFFICULTIES, MAX_GLOBAL_LIVES } from '../../constants';
import { User } from '../../firebase';
import { LivesState } from '../../services/livesService';
import { ErrorBanner } from '../ErrorBanner';

interface QuizSetupProps {
  user: User | null;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  error: string | null;
  onClearError?: () => void;
  livesState?: LivesState;
  onStart: (difficulty: Difficulty) => void;
}

export function QuizSetup({ user, selectedCategory, onCategoryChange, error, onClearError, livesState, onStart }: QuizSetupProps) {
  const [showZeroLivesModal, setShowZeroLivesModal] = useState(false);
  const currentLives = livesState?.lives ?? MAX_GLOBAL_LIVES;
  const isZeroLives = currentLives <= 0;

  // Format mm:ss pour le minuteur de recharge
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartClick = (level: Difficulty) => {
    if (isZeroLives) {
      setShowZeroLivesModal(true);
    } else {
      onStart(level);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
      <BookOpen size={64} color="var(--primary-color)" style={{ margin: '0 auto 1.5rem' }} />
      <h2 style={{ marginBottom: '1rem' }}>Prêt à commencer ?</h2>

      {/* Bandeau Réserve de Vies (Lunes 🌙) & Minuteur */}
      <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        backgroundColor: isZeroLives ? 'rgba(239, 68, 68, 0.08)' : 'rgba(217, 119, 6, 0.08)',
        borderRadius: 'var(--radius-xl, 1rem)',
        border: `1px solid ${isZeroLives ? 'rgba(239, 68, 68, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--secondary-color)', marginRight: '0.35rem' }}>
            Vies disponibles :
          </span>
          {Array.from({ length: MAX_GLOBAL_LIVES }).map((_, idx) => {
            const isActive = idx < currentLives;
            return (
              <Moon
                key={idx}
                size={20}
                fill={isActive ? '#f59e0b' : 'transparent'}
                color={isActive ? '#d97706' : 'rgba(156, 163, 175, 0.4)'}
                style={{ opacity: isActive ? 1 : 0.3 }}
              />
            );
          })}
          <span style={{ fontSize: '0.9rem', fontWeight: 700, marginLeft: '0.35rem' }}>({currentLives}/{MAX_GLOBAL_LIVES})</span>
        </div>

        {livesState && !livesState.isMaxLives && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <Clock size={14} />
            <span>Recharge de +1 Vie dans : <strong>{formatTimer(livesState.nextRechargeSeconds)}</strong></span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem', textAlign: 'left', maxWidth: '320px', margin: '0 auto 2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Catégorie</label>
        <div style={{ position: 'relative' }}>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 2.5rem',
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--primary-color)',
              backgroundColor: 'transparent',
              color: 'var(--primary-color)',
              fontFamily: 'inherit',
              fontSize: '1rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              textAlign: 'center',
              textAlignLast: 'center',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown
            size={18}
            color="var(--primary-color)"
            style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
        </div>
      </div>

      <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Choisissez votre niveau de difficulté :</p>
      <p style={{ marginBottom: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Sélectionnez <strong>Auto</strong> pour que l'IA adapte dynamiquement la difficulté à vos réponses.
      </p>

      {!user && (
        <div style={{ padding: '0.85rem 1rem', marginBottom: '2rem', backgroundColor: 'rgba(5, 150, 105, 0.08)', color: 'var(--primary-dark)', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <LogIn size={16} /> Connectez-vous pour enregistrer vos scores et alimenter votre profil adaptatif.
        </div>
      )}

      {error && !isZeroLives && (
        <ErrorBanner error={error} onDismiss={onClearError} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px', margin: '0 auto' }}>
        {DIFFICULTIES.map(level => {
          const isAuto = level === 'Auto';
          return (
            <button
              key={level}
              className={isAuto ? "btn btn-primary" : "btn btn-outline"}
              onClick={() => handleStartClick(level)}
              style={{
                justifyContent: 'center',
                padding: '0.85rem 1.25rem',
                fontSize: isAuto ? '1.05rem' : '0.95rem',
                fontWeight: isAuto ? 700 : 600,
                opacity: isZeroLives ? 0.7 : 1,
                ...(isAuto && !isZeroLives ? { boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)' } : {})
              }}
            >
              {isAuto ? (
                <>
                  <Sparkles size={20} style={{ marginRight: '0.5rem' }} />
                  Niveau Auto (Adaptatif IA)
                </>
              ) : (
                <>
                  <Play size={18} style={{ marginRight: '0.5rem' }} />
                  {`Niveau ${level}`}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal Popup au clic si 0 Vie */}
      {showZeroLivesModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
          onClick={() => setShowZeroLivesModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-color, #1e293b)',
              color: 'var(--text-primary, #ffffff)',
              borderRadius: 'var(--radius-xl, 1rem)',
              padding: '2rem', maxWidth: '440px', width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: 'var(--secondary-color, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}>
              <Clock size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              ⏳ Vies en cours de recharge
            </h3>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Vos 5 Vies sont actuellement épuisées. La prochaine vie se rechargera dans :
            </p>

            {livesState && (
              <div style={{
                fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary-color)',
                backgroundColor: 'rgba(217, 119, 6, 0.1)', padding: '0.75rem 1rem',
                borderRadius: '8px', marginBottom: '1.5rem', display: 'inline-flex',
                alignItems: 'center', gap: '0.5rem', justifyContent: 'center'
              }}>
                <Clock size={22} />
                <span>{formatTimer(livesState.nextRechargeSeconds)}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowZeroLivesModal(false)}
                style={{ flex: 1, padding: '0.85rem 1rem', justifyContent: 'center' }}
              >
                Attendre la recharge ici
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
