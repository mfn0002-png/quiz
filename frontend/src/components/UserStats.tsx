import { useEffect, useState } from 'react';
import { TrendingUp, Award, Gamepad2, Loader2, RotateCcw, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserStats, getUserSessions, UserStats as UserStatsType, SessionRecord } from '../services/firestoreService';
import { Question, Difficulty } from '../data/questions';
import { User } from '../firebase';
import { KeywordText } from './KeywordText';
import { useNavigate } from 'react-router-dom';

interface UserStatsProps {
  user: User;
  refreshKey?: number;
  onReplayQuiz?: (questions: Question[], difficulty: Difficulty, category: string) => void;
}

export function UserStats({ user, refreshKey, onReplayQuiz }: UserStatsProps) {
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getUserStats(user.uid),
      getUserSessions(user.uid, 15)
    ])
      .then(([s, sess]) => {
        if (!cancelled) {
          setStats(s);
          setSessions(sess);
        }
      })
      .catch(err => console.error("Erreur chargement stats/sessions :", err))
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

  const handleReplay = (session: SessionRecord) => {
    if (session.questions && session.questions.length > 0 && onReplayQuiz) {
      onReplayQuiz(session.questions, session.difficulty, session.category);
      navigate('/');
    }
  };

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
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

      {/* Historique des parties */}
      {sessions.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
            📜 Historique de vos parties
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sessions.map((sess) => {
              const dateStr = sess.date?.toDate ? sess.date.toDate().toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : 'Date inconnue';

              const isExpanded = expandedSessionId === sess.id;
              const hasQuestions = sess.questions && sess.questions.length > 0;

              return (
                <div
                  key={sess.id}
                  style={{
                    backgroundColor: 'var(--bg-color)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.2rem' }}>
                        {sess.category} · <span style={{ color: 'var(--primary-color)', fontSize: '0.85rem' }}>{sess.difficulty}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {dateStr}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: sess.score >= 3 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: sess.score >= 3 ? 'var(--success-color)' : 'var(--error-color)',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                      }}>
                        {sess.score} / {sess.total}
                      </span>

                      {hasQuestions && (
                        <>
                          <button
                            onClick={() => setExpandedSessionId(isExpanded ? null : (sess.id || null))}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: 'none',
                              border: '1px solid rgba(0,0,0,0.15)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.65rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              color: 'var(--text-primary)',
                              fontFamily: 'inherit'
                            }}
                          >
                            <BookOpen size={14} />
                            Revoir
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          {onReplayQuiz && (
                            <button
                              onClick={() => handleReplay(sess)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.35rem 0.65rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                fontFamily: 'inherit'
                              }}
                            >
                              <RotateCcw size={14} />
                              Rejouer
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Accordéon de révision */}
                  {isExpanded && hasQuestions && (
                    <div style={{ marginTop: '1.25rem', borderTop: '1px dashed rgba(0,0,0,0.15)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Questions de cette partie :</h4>
                      {sess.questions!.map((q, idx) => {
                        const userAns = sess.userAnswers?.[idx];
                        const isCorrect = userAns === q.correctAnswerIndex;
                        const answered = userAns !== undefined && userAns !== null && userAns !== -1;

                        return (
                          <div
                            key={q.id || idx}
                            style={{
                              padding: '1rem',
                              borderRadius: '6px',
                              border: `1px solid ${isCorrect ? 'var(--success-color)' : 'rgba(239, 68, 68, 0.4)'}`,
                              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                              {idx + 1}. {q.text}
                            </div>
                            <div style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                              <strong>Votre réponse : </strong>
                              <span style={{ color: isCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
                                {answered ? q.options[userAns as number] : "Temps écoulé"}
                              </span>
                            </div>
                            {!isCorrect && (
                              <div style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                                <strong>Bonne réponse : </strong>
                                <span style={{ color: 'var(--success-color)' }}>{q.options[q.correctAnswerIndex]}</span>
                              </div>
                            )}
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.6)', padding: '0.6rem 0.8rem', borderRadius: '4px' }}>
                              <strong>Explication : </strong>
                              <KeywordText text={q.explanation} keywords={q.keywords || []} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
