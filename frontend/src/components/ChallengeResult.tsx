import { Trophy, Swords } from 'lucide-react';
import { ChallengeDoc } from '../services/challengeService';

interface ChallengeResultProps {
  challenge: ChallengeDoc;
  onRestart: () => void;
}

export function ChallengeResult({ challenge, onRestart }: ChallengeResultProps) {
  const { challenger, opponent, questions } = challenge;
  const total = questions.length;

  if (!opponent) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <Swords size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
        <h2>En attente de votre adversaire</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Partagez le lien du défi pour voir la comparaison des scores ici.
        </p>
      </div>
    );
  }

  const winner =
    challenger.score === opponent.score ? 'égalité' : challenger.score > opponent.score ? 'challenger' : 'opponent';

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <Swords color="var(--secondary-color)" /> Résultat du Défi
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <ParticipantCard name={challenger.displayName} photo={challenger.photoURL} score={challenger.score} total={total} isWinner={winner === 'challenger'} />
        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '1.25rem' }}>VS</div>
        <ParticipantCard name={opponent.displayName} photo={opponent.photoURL} score={opponent.score} total={total} isWinner={winner === 'opponent'} align="right" />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 600 }}>
        {winner === 'égalité' ? 'Match nul ! 🤝' : `${winner === 'challenger' ? challenger.displayName : opponent.displayName} remporte le défi ! 🏆`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {questions.map((q, idx) => {
          const challengerCorrect = challenger.answers[idx] === q.correctAnswerIndex;
          const opponentCorrect = opponent.answers[idx] === q.correctAnswerIndex;
          return (
            <div key={q.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{idx + 1}. {q.text}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: challengerCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
                  {challenger.displayName} : {challengerCorrect ? 'Correct' : 'Incorrect'}
                </span>
                <span style={{ color: opponentCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
                  {opponent.displayName} : {opponentCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-primary" onClick={onRestart}>
          <Trophy size={18} style={{ marginRight: '0.5rem' }} />
          Retour au quiz
        </button>
      </div>
    </div>
  );
}

function ParticipantCard({
  name, photo, score, total, isWinner, align = 'left',
}: { name: string; photo: string | null; score: number; total: number; isWinner: boolean; align?: 'left' | 'right' }) {
  return (
    <div style={{
      textAlign: align === 'left' ? 'left' : 'right',
      display: 'flex',
      flexDirection: align === 'left' ? 'row' : 'row-reverse',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: isWinner ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-color)',
      border: isWinner ? '2px solid var(--primary-color)' : '2px solid transparent',
    }}>
      {photo ? (
        <img src={photo} alt={name} referrerPolicy="no-referrer" style={{ width: 44, height: 44, borderRadius: '50%' }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--primary-light)' }} />
      )}
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{score}/{total}</div>
      </div>
    </div>
  );
}
