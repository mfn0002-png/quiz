import { Loader2, BarChart3 } from 'lucide-react';
import { UserStats } from './UserStats';
import { AuthButton } from './AuthButton';
import { User } from '../firebase';

interface StatsTabProps {
  user: User | null;
  authLoading: boolean;
  refreshKey: number;
}

export function StatsTab({ user, authLoading, refreshKey }: StatsTabProps) {
  return (
    <div className="glass-panel">
      {authLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="spin" color="var(--primary-color)" />
        </div>
      ) : user ? (
        <UserStats user={user} refreshKey={refreshKey} />
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <BarChart3 size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Suivez votre progression</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
            Connectez-vous pour enregistrer vos scores et voir vos statistiques par catégorie.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <AuthButton user={user} authLoading={authLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
