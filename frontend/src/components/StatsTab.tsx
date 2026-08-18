import { Loader2, BarChart3 } from 'lucide-react';
import { UserStats } from './UserStats';
import { AuthButton } from './AuthButton';
import { User } from '../firebase';
import { Question, Difficulty } from '../data/questions';

interface StatsTabProps {
  user: User | null;
  authLoading: boolean;
  refreshKey: number;
  onReplayQuiz?: (questions: Question[], difficulty: Difficulty, category: string) => void;
}

export function StatsTab({ user, authLoading, refreshKey, onReplayQuiz }: StatsTabProps) {
  return (
    <div className="glass-panel">
      {authLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="spin" color="var(--primary-color)" />
        </div>
      ) : user ? (
        <UserStats user={user} refreshKey={refreshKey} onReplayQuiz={onReplayQuiz} />
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <BarChart3 size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Suivez votre progression</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
            Connectez-vous pour enregistrer vos scores, consulter l'historique de vos parties et rejouer vos questions passées.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <AuthButton user={user} authLoading={authLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
