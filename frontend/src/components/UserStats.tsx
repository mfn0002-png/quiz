import { useEffect, useState } from 'react';
import { TrendingUp, Award, Gamepad2, Loader2 } from 'lucide-react';
import { getUserStats, UserStats as UserStatsType } from '../services/firestoreService';
import { User } from '../firebase';

interface UserStatsProps {
  user: User;
  refreshKey?: number;
}

export function UserStats({ user, refreshKey }: UserStatsProps) {
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserStats(user.uid)
      .then(s => { if (!cancelled) setStats(s); })
      .catch(err => console.error("Erreur chargement stats :", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.uid, refreshKey]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <Loader2 size={32} className="spin" color="var(--primary-color)" />
      </div>
    );
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <Gamepad2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p>Aucune partie enregistrée pour l'instant. Jouez un quiz pour voir votre progression ici !</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Votre progression</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={<Gamepad2 size={22} />} label="Parties jouées" value={String(stats.totalGames)} />
        <StatCard icon={<TrendingUp size={22} />} label="Score moyen" value={`${stats.averageScore.toFixed(0)}%`} />
        <StatCard icon={<Award size={22} />} label="Meilleur score" value={String(stats.bestScore)} />
      </div>

      <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
        Par catégorie
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.entries(stats.byCategory).map(([category, data]) => (
          <div
            key={category}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontWeight: 600 }}>{category}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {data.games} partie{data.games > 1 ? 's' : ''} · {data.averageScore.toFixed(0)}% de moyenne
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      textAlign: 'center',
    }}>
      <div style={{ color: 'var(--primary-color)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}
