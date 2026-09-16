import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Play, LogIn, Sparkles, Moon, Clock, GraduationCap, ArrowRight, Layers, Check } from 'lucide-react';
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
    <div
      className="glass-panel slide-up"
      style={{
        padding: '3rem 2.5rem',
        textAlign: 'center',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: 'var(--radius-2xl)',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          color: '#ffffff',
          boxShadow: '0 8px 25px rgba(5, 150, 105, 0.4)',
        }}
      >
        <BookOpen size={38} />
      </div>

      <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        Prêt à tester vos connaissances ?
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.05rem', maxWidth: '600px' }}>
        Choisissez votre thématique et lancez un quiz avec des questions générées et adaptées à votre niveau par l'IA.
      </p>

      {/* Bannière Découverte Espace Apprentissage */}
      <Link
        to="/learn"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'rgba(5, 150, 105, 0.08)',
          border: '1px solid rgba(5, 150, 105, 0.25)',
          textDecoration: 'none',
          color: 'inherit',
          marginBottom: '2.5rem',
          width: '100%',
          maxWidth: '720px',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.14)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.08)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-color)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--primary-light)' }}>
              Nouveau : Espace Apprentissage & Fiches de Révision 📚
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Révisez les 5 piliers, les invocations du quotidien et les récits prophétiques avant de jouer.
            </div>
          </div>
        </div>
        <ArrowRight size={20} color="var(--primary-color)" />
      </Link>

      {/* Section Sélection de Catégories sous forme de Chips interactifs */}
      <div style={{ width: '100%', maxWidth: '720px', marginBottom: '2.5rem', textAlign: 'left' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <Layers size={18} color="var(--primary-color)" />
          1. Sélectionnez une thématique :
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  backgroundColor: isSelected ? 'rgba(5, 150, 105, 0.15)' : 'var(--surface-color)',
                  color: isSelected ? 'var(--primary-light)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: isSelected ? '0 2px 10px rgba(5, 150, 105, 0.25)' : 'none',
                }}
              >
                {isSelected && <Check size={16} color="var(--primary-color)" />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Niveaux de difficulté */}
      <div style={{ width: '100%', maxWidth: '720px', marginBottom: '2.5rem', textAlign: 'left' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <Sparkles size={18} color="var(--primary-color)" />
          2. Choisissez le mode de difficulté :
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {DIFFICULTIES.map(level => {
            const isAuto = level === 'Auto';
            return (
              <button
                key={level}
                onClick={() => handleStartClick(level)}
                className={isAuto ? "btn btn-primary" : "btn btn-outline"}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: isZeroLives ? 'not-allowed' : 'pointer',
                  opacity: isZeroLives ? 0.6 : 1,
                  boxShadow: isAuto ? 'var(--shadow-md), var(--shadow-glow)' : 'var(--shadow-sm)',
                }}
              >
                {isAuto ? <Sparkles size={22} /> : <Play size={20} />}
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{level}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 500 }}>
                  {isAuto ? 'Adaptatif IA' : `Questions ${level.toLowerCase()}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!user && (
        <div style={{ maxWidth: '720px', width: '100%', padding: '0.85rem 1rem', backgroundColor: 'rgba(5, 150, 105, 0.08)', color: 'var(--primary-dark)', borderRadius: 'var(--radius-lg)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <LogIn size={16} /> Connectez-vous pour enregistrer vos statistiques et enrichir votre profil IA.
        </div>
      )}

      {error && !isZeroLives && (
        <div style={{ maxWidth: '720px', width: '100%', marginTop: '1.5rem' }}>
          <ErrorBanner error={error} onDismiss={onClearError} />
        </div>
      )}

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
            className="glass-panel slide-up"
            style={{
              padding: '2.5rem 2rem',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              backgroundColor: 'var(--surface-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <Moon size={32} color="var(--error-color)" />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Plus de vies disponibles
            </h3>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Vous avez épuisé vos 5 vies pour le moment. Vos vies se rechargent automatiquement au fil du temps.
            </p>

            {livesState && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--secondary-color)',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
              }}>
                <Clock size={16} />
                <span>Prochaine vie dans : {formatTimer(livesState.nextRechargeSeconds)}</span>
              </div>
            )}

            <div>
              <button
                className="btn btn-primary"
                onClick={() => setShowZeroLivesModal(false)}
                style={{ width: '100%' }}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
