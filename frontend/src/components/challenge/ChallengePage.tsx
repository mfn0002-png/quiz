import { Loader2, Swords, Play, Trophy, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { User } from '../../firebase';
import { useChallenge } from '../../hooks/useChallenge';
import { AuthButton } from '../AuthButton';
import { ChallengeResult } from '../ChallengeResult';

interface ChallengePageProps {
  user: User | null;
  authLoading: boolean;
  challenge: ReturnType<typeof useChallenge>;
}

export function ChallengePage({ user, authLoading, challenge }: ChallengePageProps) {
  const {
    challenge: challengeDoc,
    challengeLoading,
    challengeStartedAnswering,
    setChallengeStartedAnswering,
    challengeIndex,
    challengeSelected,
    challengeScore,
    answerChallengeQuestion,
    goToNextChallengeQuestion,
    closeChallenge,
  } = challenge;

  if (challengeLoading) {
    return (
      <div className="app-container">
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <Loader2 size={48} className="spin" color="var(--primary-color)" />
        </div>
      </div>
    );
  }

  if (!challengeDoc) return null;

  const isChallenger = user && challengeDoc.challenger.userId === user.uid;

  if (challengeDoc.opponent || isChallenger) {
    return (
      <div className="app-container">
        <header className="header"><h1>Quiz Islamique</h1></header>
        <main className="main-content">
          <ChallengeResult challenge={challengeDoc} onRestart={closeChallenge} />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <header className="header"><h1>Quiz Islamique</h1></header>
        <main className="main-content">
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Swords size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>{challengeDoc.challenger.displayName} vous défie !</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
              Connectez-vous pour répondre aux mêmes questions et comparer vos scores.
            </p>
            <AuthButton user={user} authLoading={authLoading} />
          </div>
        </main>
      </div>
    );
  }

  if (!challengeStartedAnswering) {
    return (
      <div className="app-container">
        <header className="header"><h1>Quiz Islamique</h1></header>
        <main className="main-content">
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Swords size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>{challengeDoc.challenger.displayName} vous défie !</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
              Répondez aux {challengeDoc.questions.length} mêmes questions pour voir qui l'emporte.
            </p>
            <button className="btn btn-primary" onClick={() => setChallengeStartedAnswering(true)}>
              <Play size={18} style={{ marginRight: '0.5rem' }} />
              Relever le défi
            </button>
          </div>
        </main>
      </div>
    );
  }

  const cq = challengeDoc.questions[challengeIndex];
  return (
    <div className="app-container">
      <header className="header"><h1>Quiz Islamique</h1></header>
      <main className="main-content">
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              Question {challengeIndex + 1}/{challengeDoc.questions.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', fontWeight: 600 }}>
              <Trophy size={20} /><span>Score: {challengeScore}</span>
            </div>
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>{cq.text}</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {cq.options.map((option, index) => {
              let buttonStyle = {};
              let showIcon = null;
              if (challengeSelected !== null) {
                if (index === cq.correctAnswerIndex) {
                  buttonStyle = { backgroundColor: 'var(--success-color)', color: 'white', borderColor: 'var(--success-color)' };
                  showIcon = <CheckCircle2 size={20} />;
                } else if (index === challengeSelected) {
                  buttonStyle = { backgroundColor: 'var(--error-color)', color: 'white', borderColor: 'var(--error-color)' };
                  showIcon = <XCircle size={20} />;
                }
              }
              return (
                <button
                  key={index}
                  className="btn btn-outline"
                  style={{ padding: '1rem', justifyContent: 'space-between', fontSize: '1.125rem', ...buttonStyle, cursor: challengeSelected !== null ? 'default' : 'pointer' }}
                  onClick={() => answerChallengeQuestion(index)}
                  disabled={challengeSelected !== null}
                >
                  <span>{option}</span>
                  {showIcon && <span>{showIcon}</span>}
                </button>
              );
            })}
          </div>
          {challengeSelected !== null && (
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={goToNextChallengeQuestion}>
                {challengeIndex < challengeDoc.questions.length - 1 ? 'Continuer' : 'Voir le résultat'}
                <ChevronRight size={18} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
