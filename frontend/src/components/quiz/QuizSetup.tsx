import { BookOpen, Play, ChevronDown, LogIn, Sparkles } from 'lucide-react';
import { Difficulty } from '../../data/questions';
import { CATEGORIES, DIFFICULTIES } from '../../constants';
import { User } from '../../firebase';

interface QuizSetupProps {
  user: User | null;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  error: string | null;
  onStart: (difficulty: Difficulty) => void;
}

export function QuizSetup({ user, selectedCategory, onCategoryChange, error, onStart }: QuizSetupProps) {
  return (
    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
      <BookOpen size={64} color="var(--primary-color)" style={{ margin: '0 auto 1.5rem' }} />
      <h2 style={{ marginBottom: '1rem' }}>Prêt à commencer ?</h2>

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

      {error && (
        <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px', margin: '0 auto' }}>
        {DIFFICULTIES.map(level => {
          const isAuto = level === 'Auto';
          return (
            <button
              key={level}
              className={isAuto ? "btn btn-primary" : "btn btn-outline"}
              onClick={() => onStart(level)}
              style={{
                justifyContent: 'center',
                padding: '0.85rem 1.25rem',
                fontSize: isAuto ? '1.05rem' : '0.95rem',
                fontWeight: isAuto ? 700 : 600,
                ...(isAuto ? { boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)' } : {})
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
    </div>
  );
}
