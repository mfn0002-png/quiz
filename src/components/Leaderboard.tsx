import { useEffect, useState } from 'react';
import { Trophy, Loader2, Medal } from 'lucide-react';
import { getLeaderboard, LeaderboardEntry } from '../services/firestoreService';
import { User } from '../firebase';

interface LeaderboardProps {
  currentUser: User | null;
}

const MEDAL_COLORS = ['#facc15', '#94a3b8', '#b45309']; // or, argent, bronze

export function Leaderboard({ currentUser }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLeaderboard(20)
      .then(data => { if (!cancelled) setEntries(data); })
      .catch(err => {
        console.error("Erreur chargement classement :", err);
        if (!cancelled) setError("Impossible de charger le classement pour le moment.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <Loader2 size={32} className="spin" color="var(--primary-color)" />
      </div>
    );
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--error-color)' }}>{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
        <Trophy size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p>Aucun joueur classé pour l'instant. Soyez le premier !</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Trophy color="var(--secondary-color)" /> Classement Mondial
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {entries.map((entry, idx) => {
          const isMe = currentUser && entry.userId === currentUser.uid;
          return (
            <div
              key={entry.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isMe ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-color)',
                border: isMe ? '1px solid var(--primary-color)' : '1px solid transparent',
              }}
            >
              <div style={{
                width: 28, textAlign: 'center', fontWeight: 700,
                color: idx < 3 ? MEDAL_COLORS[idx] : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {idx < 3 ? <Medal size={20} color={MEDAL_COLORS[idx]} /> : idx + 1}
              </div>
              {entry.photoURL ? (
                <img src={entry.photoURL} alt={entry.displayName} referrerPolicy="no-referrer"
                  style={{ width: 36, height: 36, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--primary-light)' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{entry.displayName}{isMe ? ' (vous)' : ''}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {entry.totalGames} partie{entry.totalGames > 1 ? 's' : ''} · {entry.avgScore.toFixed(0)}% de moyenne
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.1rem' }}>
                {entry.bestScore}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
