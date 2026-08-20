import { useState, useEffect } from 'react';
import { Trophy, Clock, CheckCircle2, XCircle, ChevronRight, X, AlertTriangle, LogOut, Sparkles, Moon, BookOpen } from 'lucide-react';
import { Question, Difficulty } from '../../data/questions';
import { KeywordText } from '../KeywordText';
import { QUESTION_TIME, MAX_GLOBAL_LIVES } from '../../constants';
import { LivesState } from '../../services/livesService';

interface QuizQuestionScreenProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  lives?: number;
  livesState?: LivesState;
  timeLeft: number;
  selectedAnswer: number | null;
  isAnswerCorrect: boolean | null;
  selectedDifficulty?: Difficulty;
  onAnswer: (optionIndex: number) => void;
  onNext: () => void;
  onQuit: () => void;
  onQuitToResults?: () => void;
}

export function QuizQuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  score,
  lives = MAX_GLOBAL_LIVES,
  livesState,
  timeLeft,
  selectedAnswer,
  isAnswerCorrect,
  selectedDifficulty,
  onAnswer,
  onNext,
  onQuit,
  onQuitToResults,
}: QuizQuestionScreenProps) {
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showNoLivesModal, setShowNoLivesModal] = useState(false);
  const isAuto = selectedDifficulty === 'Auto';

  // Format mm:ss pour le minuteur de recharge
  const formatTimer = (totalSeconds: number = 0) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fermer automatiquement le modal si une vie est rechargée en direct
  useEffect(() => {
    if (lives > 0 && showNoLivesModal) {
      setShowNoLivesModal(false);
    }
  }, [lives, showNoLivesModal]);

  const isLastQuestion = questionIndex + 1 >= totalQuestions;

  const handleNextClick = () => {
    // Si le joueur a terminé les 6 questions, aller directement au bilan sans afficher de popup
    if (isLastQuestion) {
      onNext();
    } else if (lives <= 0 && selectedAnswer !== null) {
      setShowNoLivesModal(true);
    } else {
      onNext();
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          Question {questionIndex + 1}/{totalQuestions}
        </span>

        {/* Barre des 5 Vies / Croissants de Lune Islamiques 🌙 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', backgroundColor: 'rgba(217, 119, 6, 0.1)', borderRadius: '99px', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-color)', marginRight: '0.25rem' }}>Vies :</span>
          {Array.from({ length: MAX_GLOBAL_LIVES }).map((_, idx) => {
            const isActive = idx < lives;
            return (
              <Moon
                key={idx}
                size={18}
                fill={isActive ? '#f59e0b' : 'transparent'}
                color={isActive ? '#d97706' : 'rgba(156, 163, 175, 0.4)'}
                style={{
                  transition: 'transform 0.3s ease, color 0.3s ease',
                  transform: isActive ? 'scale(1)' : 'scale(0.85)',
                  opacity: isActive ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', fontWeight: 600 }}>
          <Trophy size={20} />
          <span>Score: {score}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: timeLeft <= 5 ? 'var(--error-color)' : 'var(--text-primary)' }}>
        <Clock size={20} />
        <span style={{ fontWeight: 600 }}>{timeLeft}s</span>
        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '99px', marginLeft: '0.5rem' }}>
          <div style={{
            width: `${(timeLeft / QUESTION_TIME) * 100}%`,
            height: '100%',
            backgroundColor: timeLeft <= 5 ? 'var(--error-color)' : 'var(--primary-color)',
            borderRadius: '99px',
            transition: 'width 1s linear, background-color 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '99px', height: '8px', marginBottom: '1.5rem' }}>
        <div style={{
          height: '100%',
          backgroundColor: 'var(--primary-color)',
          borderRadius: '99px',
          width: `${(questionIndex / totalQuestions) * 100}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* En-tête Catégorie & Badge Niveau Adaptatif */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Catégorie : {question.category}
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.85rem',
          borderRadius: '99px',
          backgroundColor: isAuto ? 'rgba(5, 150, 105, 0.12)' : 'rgba(0, 0, 0, 0.05)',
          color: isAuto ? 'var(--primary-color)' : 'var(--text-secondary)',
          fontSize: '0.825rem',
          fontWeight: 700,
          border: isAuto ? '1px solid rgba(5, 150, 105, 0.3)' : '1px solid transparent'
        }}>
          {isAuto ? (
            <>
              <Sparkles size={14} />
              <span>Niveau Auto (IA) : {question.difficulty}</span>
            </>
          ) : (
            <span>Niveau : {question.difficulty}</span>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        {question.text}
      </h3>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {question.options.map((option, index) => {
          let buttonStyle = {};
          let showIcon = null;
          if (selectedAnswer !== null) {
            if (index === question.correctAnswerIndex) {
              buttonStyle = { backgroundColor: 'var(--success-color)', color: 'white', borderColor: 'var(--success-color)' };
              showIcon = <CheckCircle2 size={20} />;
            } else if (index === selectedAnswer && !isAnswerCorrect) {
              buttonStyle = { backgroundColor: 'var(--error-color)', color: 'white', borderColor: 'var(--error-color)' };
              showIcon = <XCircle size={20} />;
            }
          }
          return (
            <button
              key={index}
              className="btn btn-outline"
              style={{
                padding: '1rem',
                justifyContent: 'space-between',
                fontSize: '1.125rem',
                ...buttonStyle,
                cursor: selectedAnswer !== null ? 'default' : 'pointer',
                opacity: selectedAnswer !== null && index !== question.correctAnswerIndex && index !== selectedAnswer ? 0.6 : 1
              }}
              onClick={() => onAnswer(index)}
              disabled={selectedAnswer !== null}
            >
              <span>{option}</span>
              {showIcon && <span>{showIcon}</span>}
            </button>
          );
        })}
      </div>

      {selectedAnswer !== null && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: isAnswerCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
          borderLeft: `6px solid ${isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
          borderRadius: '8px',
          position: 'relative'
        }}>
          <button
            onClick={handleNextClick}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            title="Continuer"
          >
            <X size={20} />
          </button>
          <h4 style={{ color: isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isAnswerCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            {isAnswerCorrect ? 'Bonne réponse !' : 'Mauvaise réponse.'}
          </h4>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
            <KeywordText text={question.explanation} keywords={question.keywords || []} />
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleNextClick} style={{ padding: '0.5rem 1rem' }}>
              Continuer <ChevronRight size={18} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-outline"
          onClick={() => setShowQuitModal(true)}
          style={{ border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <LogOut size={16} />
          Quitter le quiz
        </button>
      </div>

      {/* Modal Popup interactif quand 0 Vie (En attente de recharge ou Quitter) */}
      {showNoLivesModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
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
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: 'var(--secondary-color, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}>
              <Clock size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              ⏳ Vies épuisées - Partie suspendue
            </h3>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Votre réserve de 5 Vies est vide. Vous pouvez attendre la prochaine vie pour débloquer immédiatement la suite de votre quiz !
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowNoLivesModal(false)}
                style={{ padding: '0.85rem 1rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Clock size={18} />
                Attendre la recharge ici (reprise auto)
              </button>

              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowNoLivesModal(false);
                  if (onQuitToResults) onQuitToResults();
                  else onNext();
                }}
                style={{ padding: '0.85rem 1rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <BookOpen size={18} />
                Quitter le quiz & voir mes explications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmation d'Abandon */}
      {showQuitModal && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
          onClick={() => setShowQuitModal(false)}
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
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--error-color, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Quitter la partie en cours ?
            </h3>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Attention, si vous quittez maintenant, votre progression actuelle sur ce quiz sera interrompue.
            </p>

            <div style={{
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', color: 'var(--secondary-color, #d97706)',
              fontWeight: 600, fontSize: '1.05rem',
            }}>
              <Trophy size={20} />
              <span>Score actuel : {score} point{score > 1 ? 's' : ''} (Question {questionIndex + 1}/{totalQuestions})</span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowQuitModal(false)}
                style={{ flex: 1, padding: '0.75rem 1rem' }}
              >
                Continuer à jouer
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowQuitModal(false);
                  onQuit();
                }}
                style={{
                  flex: 1, padding: '0.75rem 1rem',
                  backgroundColor: 'var(--error-color, #ef4444)',
                  color: 'white',
                }}
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
