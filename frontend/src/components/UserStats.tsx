import { useEffect, useState } from 'react';
import { TrendingUp, Award, Gamepad2, Loader2, RotateCcw, BookOpen, ChevronDown, ChevronUp, Folder } from 'lucide-react';
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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getUserStats(user.uid),
      getUserSessions(user.uid, 50)
    ])
      .then(([s, sess]) => {
        if (!cancelled) {
          setStats(s);
          setSessions(sess);
          // Déplier la première catégorie par défaut
          const categories = Array.from(new Set(sess.map(item => item.category || 'Mélange')));
          if (categories.length > 0) {
            setExpandedCategories({ [categories[0]]: true });
          }
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

  // Regroupement des sessions par catégorie
  const sessionsByCategory: Record<string, SessionRecord[]> = {};
  sessions.forEach(sess => {
    const cat = sess.category || 'Mélange';
    if (!sessionsByCategory[cat]) sessionsByCategory[cat] = [];
    sessionsByCategory[cat].push(sess);
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleReplay = (session: SessionRecord) => {
    if (session.questions && session.questions.length > 0 && onReplayQuiz) {
      onReplayQuiz(session.questions, session.difficulty, session.category);
      navigate('/');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Votre progression</h2>

      {/* Cartes de statistiques globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        <StatCard icon={<Gamepad2 size={22} />} label="Parties jouées" value={String(stats.totalGames)} />
        <StatCard icon={<TrendingUp size={22} />} label="Score moyen" value={`${stats.averageScore.toFixed(0)}%`} />
        <StatCard icon={<Award size={22} />} label="Meilleur score" value={String(stats.bestScore)} />
      </div>

      <h3 style={{ marginBottom: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
        📂 Vos parties par catégorie
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {Object.entries(stats.byCategory).map(([category, catData]) => {
          const categorySessions = sessionsByCategory[category] || [];
          const isCategoryExpanded = !!expandedCategories[category];

          return (
            <div
              key={category}
              style={{
                backgroundColor: 'var(--bg-color)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              {/* En-tête de catégorie (cliquable pour plier/déplier) */}
              <div
                onClick={() => toggleCategory(category)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  backgroundColor: isCategoryExpanded ? 'rgba(5, 150, 105, 0.06)' : 'transparent',
                  transition: 'background-color 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Folder size={20} color="var(--primary-color)" />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{category}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                      {catData.games} partie{catData.games > 1 ? 's' : ''} · {catData.averageScore.toFixed(0)}% de moyenne
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <span>{isCategoryExpanded ? 'Masquer' : 'Voir les parties'}</span>
                  {isCategoryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Sous-parties de cette catégorie */}
              {isCategoryExpanded && (
                <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  {categorySessions.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      Aucune partie détaillée enregistrée dans cette catégorie.
                    </div>
                  ) : (
                    categorySessions.map((sess) => {
                      const dateStr = sess.date?.toDate ? sess.date.toDate().toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : 'Date inconnue';

                      const isReviewOpen = expandedReviewId === sess.id;
                      const hasQuestions = sess.questions && sess.questions.length > 0;
                      const isReplaySession = (sess as any).isReplay || categorySessions.some((other) => (
                        other.id !== sess.id &&
                        other.difficulty === sess.difficulty &&
                        ((other.date?.toMillis ? other.date.toMillis() : 0) < (sess.date?.toMillis ? sess.date.toMillis() : 0))
                      ));

                      return (
                        <div
                          key={sess.id}
                          style={{
                            backgroundColor: 'var(--surface-color)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            padding: '0.85rem 1.1rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span>Niveau : <span style={{ color: 'var(--primary-color)' }}>{sess.difficulty}</span></span>
                                {isReplaySession && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '0.12rem 0.5rem',
                                      borderRadius: '9999px',
                                      backgroundColor: 'rgba(217, 119, 6, 0.12)',
                                      color: 'var(--secondary-color, #d97706)',
                                      border: '1px solid rgba(217, 119, 6, 0.25)',
                                    }}
                                    title="Session rejouée / révisée"
                                  >
                                    <RotateCcw size={10} /> Rejoué
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                🗓️ {dateStr}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: sess.score >= Math.ceil(sess.total / 2) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: sess.score >= Math.ceil(sess.total / 2) ? 'var(--success-color)' : 'var(--error-color)',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}>
                                {sess.score} / {sess.total}
                              </span>

                              {hasQuestions && (
                                <>
                                  <button
                                    onClick={() => setExpandedReviewId(isReviewOpen ? null : (sess.id || null))}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      background: 'none',
                                      border: '1px solid rgba(0,0,0,0.15)',
                                      borderRadius: '6px',
                                      padding: '0.3rem 0.55rem',
                                      cursor: 'pointer',
                                      fontSize: '0.78rem',
                                      color: 'var(--text-primary)',
                                      fontFamily: 'inherit'
                                    }}
                                  >
                                    <BookOpen size={13} />
                                    Revoir
                                    {isReviewOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>

                                  {onReplayQuiz && (
                                    <button
                                      onClick={() => handleReplay(sess)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.3rem 0.6rem',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        fontFamily: 'inherit'
                                      }}
                                    >
                                      <RotateCcw size={13} />
                                      Rejouer
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Accordéon de révision de la sous-partie */}
                          {isReviewOpen && hasQuestions && (
                            <div style={{ marginTop: '1rem', borderTop: '1px dashed rgba(0,0,0,0.15)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                              <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Questions de cette partie :</h5>
                              {sess.questions!.map((q, idx) => {
                                const userAns = sess.userAnswers?.[idx];
                                const isCorrect = userAns === q.correctAnswerIndex;
                                const answered = userAns !== undefined && userAns !== null && userAns !== -1;

                                return (
                                  <div
                                    key={q.id || idx}
                                    style={{
                                      padding: '0.85rem',
                                      borderRadius: '6px',
                                      border: `1px solid ${isCorrect ? 'var(--success-color)' : 'rgba(239, 68, 68, 0.4)'}`,
                                      backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                                      {idx + 1}. {q.text}
                                    </div>
                                    <div style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                                      <strong>Votre réponse : </strong>
                                      <span style={{ color: isCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
                                        {answered ? q.options[userAns as number] : "Temps écoulé"}
                                      </span>
                                    </div>
                                    {!isCorrect && (
                                      <div style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                                        <strong>Bonne réponse : </strong>
                                        <span style={{ color: 'var(--success-color)' }}>{q.options[q.correctAnswerIndex]}</span>
                                      </div>
                                    )}
                                    <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', backgroundColor: 'rgba(255,255,255,0.7)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
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
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
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
