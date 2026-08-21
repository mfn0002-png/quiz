import { Trophy, RefreshCw, Swords, Copy, Check, Loader2, Skull } from 'lucide-react';
import { Difficulty, Question } from '../../data/questions';
import { KeywordText } from '../KeywordText';
import { User } from '../../firebase';

interface QuizResultsScreenProps {
  user: User | null;
  score: number;
  lives?: number;
  isGameOver?: boolean;
  activeQuestions: Question[];
  userAnswers: (number | null)[];
  selectedDifficulty: Difficulty;
  challengeLink: string | null;
  creatingChallenge: boolean;
  linkCopied: boolean;
  onCreateChallenge: () => void;
  onCopyLink: () => void;
  onRestart: () => void;
  onChangeSetup: () => void;
}

export function QuizResultsScreen({
  user,
  score,
  lives = 0,
  isGameOver = false,
  activeQuestions,
  userAnswers,
  selectedDifficulty,
  challengeLink,
  creatingChallenge,
  linkCopied,
  onCreateChallenge,
  onCopyLink,
  onRestart,
  onChangeSetup,
}: QuizResultsScreenProps) {
  // Déterminer le niveau réel sous-jacent issu du backend agent
  const resolvedLevel = activeQuestions[0]?.difficulty || (selectedDifficulty === 'Auto' ? 'Débutant' : selectedDifficulty);
  const displayDifficulty = selectedDifficulty === 'Auto' ? `Auto (${resolvedLevel})` : selectedDifficulty;

  return (
    <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      {isGameOver ? (
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--error-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Skull size={40} />
        </div>
      ) : (
        <Trophy size={64} color="var(--secondary-color)" style={{ margin: '0 auto 1.5rem' }} />
      )}

      <h2 style={{ marginBottom: '1rem', color: isGameOver ? 'var(--error-color)' : 'var(--text-primary)' }}>
        {isGameOver ? 'Game Over !' : 'Quiz Terminé !'}
      </h2>

      <p style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        {isGameOver ? (
          <>Vous n'avez plus de vie disponible. Veuillez quitter ou attendre que vos vies se rechargent.</>
        ) : (
          <>
            Félicitations ! Votre score est de <strong>{score} sur {activeQuestions.length}</strong> au niveau <strong>{displayDifficulty}</strong>.
          </>
        )}
      </p>

      {/* Mode Défi */}
      <div style={{ marginBottom: '2rem' }}>
        {!user ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Connectez-vous pour défier un ami avec ces mêmes questions.
          </p>
        ) : challengeLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Partagez ce lien avec votre ami :</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', maxWidth: '100%' }}>
              <code style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', fontSize: '0.8rem', overflowX: 'auto', maxWidth: '260px' }}>{challengeLink}</code>
              <button className="btn btn-outline" onClick={onCopyLink} style={{ padding: '0.5rem' }}>
                {linkCopied ? <Check size={16} color="var(--success-color)" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-outline" onClick={onCreateChallenge} disabled={creatingChallenge}>
            {creatingChallenge ? <Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} /> : <Swords size={18} style={{ marginRight: '0.5rem' }} />}
            Défier un ami
          </button>
        )}
      </div>

      <div style={{ textAlign: 'left', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Détail de vos réponses :</h3>
        {activeQuestions.slice(0, userAnswers.filter(a => a !== null).length).map((q, idx) => {
          const isCorrect = userAnswers[idx] === q.correctAnswerIndex;
          const answered = userAnswers[idx] !== -1 && userAnswers[idx] !== null;
          return (
            <div key={q.id || idx} style={{
              padding: '1.5rem',
              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
              border: `1px solid ${isCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase' }}>
                  {q.category}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '99px',
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  color: 'var(--text-secondary)'
                }}>
                  Niveau : {q.difficulty || resolvedLevel}
                </span>
              </div>
              <h4 style={{ margin: '0 0 1rem 0' }}>{idx + 1}. {q.text}</h4>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Votre réponse : </strong>
                <span style={{ color: isCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
                  {answered ? q.options[userAnswers[idx] as number] : "Temps écoulé (aucune réponse)"}
                </span>
              </div>
              {!isCorrect && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Bonne réponse : </strong>
                  <span style={{ color: 'var(--success-color)' }}>{q.options[q.correctAnswerIndex]}</span>
                </div>
              )}
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                <strong>Explication : </strong>
                <KeywordText text={q.explanation} keywords={q.keywords || []} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onRestart} disabled={lives <= 0} style={{ opacity: lives <= 0 ? 0.5 : 1 }}>
          <RefreshCw size={20} style={{ marginRight: '0.5rem' }} />
          {isGameOver ? 'Recommencer une partie' : 'Nouveau Quiz'}
        </button>
        <button className="btn btn-outline" onClick={onChangeSetup}>
          Changer de niveau ou catégorie
        </button>
      </div>
    </div>
  );
}
