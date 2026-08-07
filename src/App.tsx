import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Trophy, Play, CheckCircle2, XCircle, RefreshCw, ChevronRight, X, Loader2, MessageCircle, Clock, BarChart3, Swords, Copy, Check, LogIn } from 'lucide-react';
import { Difficulty, Question } from './data/questions';
import { generateQuestions } from './services/geminiService';
import { Assistant } from './components/Assistant';
import { KeywordText } from './components/KeywordText';
import { AuthButton } from './components/AuthButton';
import { UserStats } from './components/UserStats';
import { Leaderboard } from './components/Leaderboard';
import { ChallengeResult } from './components/ChallengeResult';
import { playCorrect, playWrong, playTimeout } from './utils/sounds';
import { onAuthStateChanged, User } from './firebase';
import { saveSession, upsertLeaderboardProfile } from './services/firestoreService';
import { createChallenge, getChallenge, submitChallengeResult, buildChallengeLink, ChallengeDoc, ChallengeParticipant } from './services/challengeService';
import './App.css';

type ActiveTab = 'quiz' | 'assistant' | 'stats' | 'leaderboard';

const CATEGORIES = ['Mélange', 'Prophètes', 'Coran', 'Piliers de l\'Islam', 'Histoire', 'Pratiques'];
const QUESTION_TIME = 20;

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quiz');

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Quiz state
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Débutant');
  const [selectedCategory, setSelectedCategory] = useState<string>('Mélange');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // Défi (mode multijoueur asynchrone)
  const [challenge, setChallenge] = useState<ChallengeDoc | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeStartedAnswering, setChallengeStartedAnswering] = useState(false);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeSelected, setChallengeSelected] = useState<number | null>(null);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeAnswers, setChallengeAnswers] = useState<(number | null)[]>([]);
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [challengeLink, setChallengeLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Auth listener ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) upsertLeaderboardProfile(u).catch(err => console.error(err));
    });
    return unsubscribe;
  }, []);

  // ── Charger un défi depuis l'URL (?challenge=ID) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('challenge');
    if (!cid) return;
    setChallengeLoading(true);
    getChallenge(cid)
      .then(data => {
        if (data) {
          setChallenge(data);
          setChallengeAnswers(new Array(data.questions.length).fill(null));
        } else {
          setError("Ce défi n'existe pas ou a expiré.");
        }
      })
      .catch(err => {
        console.error(err);
        setError("Impossible de charger le défi.");
      })
      .finally(() => setChallengeLoading(false));
  }, []);

  const startQuiz = async (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setLoading(true);
    setError(null);
    setStarted(true);

    try {
      const generatedQuestions = await generateQuestions(difficulty, selectedCategory, 5);
      setActiveQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResults(false);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setUserAnswers(new Array(5).fill(null));
      setTimeLeft(QUESTION_TIME);
      setChallengeLink(null);
    } catch (err: any) {
      console.error(err);
      setError("Erreur IA : " + (err.message || JSON.stringify(err)));
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const finishQuiz = useCallback((finalScore: number) => {
    setShowResults(true);
    if (user) {
      saveSession(user.uid, selectedDifficulty, selectedCategory, finalScore, activeQuestions.length)
        .then(() => setStatsRefreshKey(k => k + 1))
        .catch(err => console.error("Erreur sauvegarde session :", err));
    }
  }, [user, selectedDifficulty, selectedCategory, activeQuestions.length]);

  useEffect(() => {
    let timer: number;
    if (started && !loading && !showResults && selectedAnswer === null && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      playTimeout();
      handleAnswerClick(-1);
    }
    return () => clearInterval(timer);
  }, [started, loading, showResults, selectedAnswer, timeLeft]);

  const handleAnswerClick = (optionIndex: number) => {
    if (selectedAnswer !== null) return;
    const correct = optionIndex === activeQuestions[currentQuestionIndex].correctAnswerIndex;
    setSelectedAnswer(optionIndex);
    setIsAnswerCorrect(correct);

    if (optionIndex === -1) {
      // Déjà géré par playTimeout() dans le useEffect
    } else if (correct) {
      playCorrect();
    } else {
      playWrong();
    }

    if (correct) setScore(prev => prev + 1);

    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = optionIndex;
      return newAnswers;
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setTimeLeft(QUESTION_TIME);
    } else {
      finishQuiz(score);
    }
  };

  // ── Mode Défi : créer un défi à partir du quiz qui vient de se terminer ──
  const handleCreateChallenge = async () => {
    if (!user) return;
    setCreatingChallenge(true);
    try {
      const challenger: ChallengeParticipant = {
        userId: user.uid,
        displayName: user.displayName || 'Joueur',
        photoURL: user.photoURL || null,
        score,
        answers: userAnswers,
      };
      const id = await createChallenge(activeQuestions, challenger);
      setChallengeLink(buildChallengeLink(id));
    } catch (err) {
      console.error("Erreur création du défi :", err);
      setError("Impossible de créer le défi pour le moment.");
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleCopyLink = async () => {
    if (!challengeLink) return;
    try {
      await navigator.clipboard.writeText(challengeLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Mode Défi : répondre au défi d'un ami ──
  const handleChallengeAnswerClick = (optionIndex: number) => {
    if (!challenge || challengeSelected !== null) return;
    const question = challenge.questions[challengeIndex];
    const correct = optionIndex === question.correctAnswerIndex;
    setChallengeSelected(optionIndex);

    if (correct) {
      playCorrect();
      setChallengeScore(prev => prev + 1);
    } else {
      playWrong();
    }

    setChallengeAnswers(prev => {
      const next = [...prev];
      next[challengeIndex] = optionIndex;
      return next;
    });
  };

  const goToNextChallengeQuestion = async () => {
    if (!challenge || !user) return;
    if (challengeIndex < challenge.questions.length - 1) {
      setChallengeIndex(prev => prev + 1);
      setChallengeSelected(null);
    } else {
      const opponent: ChallengeParticipant = {
        userId: user.uid,
        displayName: user.displayName || 'Joueur',
        photoURL: user.photoURL || null,
        score: challengeScore,
        answers: challengeAnswers,
      };
      try {
        await submitChallengeResult(challenge.id, opponent);
        setChallenge(prev => (prev ? { ...prev, opponent } : prev));
      } catch (err) {
        console.error("Erreur soumission du défi :", err);
        setError("Impossible d'enregistrer votre résultat de défi.");
      }
    }
  };

  const closeChallenge = () => {
    setChallenge(null);
    setChallengeStartedAnswering(false);
    setChallengeIndex(0);
    setChallengeSelected(null);
    setChallengeScore(0);
    setChallengeAnswers([]);
    // Retire le paramètre ?challenge de l'URL sans recharger la page
    const url = new URL(window.location.href);
    url.searchParams.delete('challenge');
    window.history.replaceState({}, '', url.toString());
  };

  // ── Rendu : mode Défi actif (prioritaire sur les onglets normaux) ──
  if (challenge) {
    if (challengeLoading) {
      return (
        <div className="app-container">
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2 size={48} className="spin" color="var(--primary-color)" />
          </div>
        </div>
      );
    }

    const isChallenger = user && challenge.challenger.userId === user.uid;

    if (challenge.opponent) {
      return (
        <div className="app-container">
          <header className="header"><h1>Quiz Islamique</h1></header>
          <main className="main-content">
            <ChallengeResult challenge={challenge} onRestart={closeChallenge} />
          </main>
        </div>
      );
    }

    if (isChallenger) {
      return (
        <div className="app-container">
          <header className="header"><h1>Quiz Islamique</h1></header>
          <main className="main-content">
            <ChallengeResult challenge={challenge} onRestart={closeChallenge} />
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
              <h2 style={{ marginBottom: '1rem' }}>{challenge.challenger.displayName} vous défie !</h2>
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
              <h2 style={{ marginBottom: '1rem' }}>{challenge.challenger.displayName} vous défie !</h2>
              <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                Répondez aux {challenge.questions.length} mêmes questions pour voir qui l'emporte.
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

    const cq = challenge.questions[challengeIndex];
    return (
      <div className="app-container">
        <header className="header"><h1>Quiz Islamique</h1></header>
        <main className="main-content">
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                Question {challengeIndex + 1}/{challenge.questions.length}
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
                    onClick={() => handleChallengeAnswerClick(index)}
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
                  {challengeIndex < challenge.questions.length - 1 ? 'Continuer' : 'Voir le résultat'}
                  <ChevronRight size={18} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <AuthButton user={user} authLoading={authLoading} />
        </div>
        <h1>Quiz Islamique</h1>
        <p>Testez vos connaissances et posez vos questions grâce à l'Intelligence Artificielle.</p>
      </header>

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-full)', padding: '0.35rem', boxShadow: 'var(--shadow-sm)' }}>
        {[
          { id: 'quiz', label: '🎯 Quiz' },
          { id: 'assistant', label: '💬 Assistant' },
          { id: 'stats', label: '📈 Progression' },
          { id: 'leaderboard', label: '🏆 Classement' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'all var(--transition-fast)',
              backgroundColor: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === 'assistant' ? (
          <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageCircle size={22} color="var(--primary-color)" />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Assistant Islamique</h2>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Posez vos questions, les termes clés seront expliqués.</p>
              </div>
            </div>
            <Assistant />
          </div>
        ) : activeTab === 'stats' ? (
          <div className="glass-panel">
            {authLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 size={32} className="spin" color="var(--primary-color)" /></div>
            ) : user ? (
              <UserStats user={user} refreshKey={statsRefreshKey} />
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
        ) : activeTab === 'leaderboard' ? (
          <div className="glass-panel">
            <Leaderboard currentUser={user} />
          </div>
        ) : !started ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <BookOpen size={64} color="var(--primary-color)" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Prêt à commencer ?</h2>
            
            <div style={{ marginBottom: '2rem', textAlign: 'left', maxWidth: '300px', margin: '0 auto 2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Catégorie</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-full)', 
                  border: '2px solid var(--primary-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--primary-color)',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <p style={{ marginBottom: '1rem' }}>Choisissez votre niveau de difficulté.</p>
            <p style={{ marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Les questions seront générées instantanément par l'IA.
            </p>

            {!user && (
              <div style={{ padding: '0.85rem 1rem', marginBottom: '2rem', backgroundColor: 'rgba(5, 150, 105, 0.08)', color: 'var(--primary-dark)', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <LogIn size={16} /> Connectez-vous pour enregistrer vos scores et défier vos amis.
              </div>
            )}

            {error && (
              <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
              {(['Débutant', 'Intermédiaire', 'Avancé'] as Difficulty[]).map(level => (
                <button key={level} className="btn btn-outline" onClick={() => startQuiz(level)} style={{ justifyContent: 'center' }}>
                  <Play size={18} style={{ marginRight: '0.5rem' }} />
                  Niveau {level}
                </button>
              ))}
            </div>
          </div>
        ) : loading ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Loader2 size={64} className="spin" color="var(--primary-color)" style={{ marginBottom: '1.5rem' }} />
            <h2>Création du quiz en cours...</h2>
            <p>L'IA prépare des questions uniques pour vous.</p>
          </div>
        ) : showResults ? (
          <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <Trophy size={64} color="var(--secondary-color)" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Quiz Terminé !</h2>
            <p style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>
              Votre score est de <strong>{score}</strong> sur {activeQuestions.length} au niveau <strong>{selectedDifficulty}</strong>.
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
                    <button className="btn btn-outline" onClick={handleCopyLink} style={{ padding: '0.5rem' }}>
                      {linkCopied ? <Check size={16} color="var(--success-color)" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-outline" onClick={handleCreateChallenge} disabled={creatingChallenge}>
                  {creatingChallenge ? <Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} /> : <Swords size={18} style={{ marginRight: '0.5rem' }} />}
                  Défier un ami
                </button>
              )}
            </div>
            
            <div style={{ textAlign: 'left', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Détail de vos réponses :</h3>
              {activeQuestions.map((q, idx) => {
                const isCorrect = userAnswers[idx] === q.correctAnswerIndex;
                const answered = userAnswers[idx] !== -1 && userAnswers[idx] !== null;
                return (
                  <div key={q.id} style={{
                    padding: '1.5rem',
                    backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${isCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
                    borderRadius: '8px',
                  }}>
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
              <button className="btn btn-primary" onClick={() => startQuiz(selectedDifficulty)}>
                <RefreshCw size={20} style={{ marginRight: '0.5rem' }} />
                Nouveau Quiz
              </button>
              <button className="btn btn-outline" onClick={() => setStarted(false)}>
                Changer de niveau ou catégorie
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                Question {currentQuestionIndex + 1}/{activeQuestions.length}
              </span>
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

            <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '99px', height: '8px', marginBottom: '2rem' }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--primary-color)',
                borderRadius: '99px',
                width: `${(currentQuestionIndex / activeQuestions.length) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ marginBottom: '1rem', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Catégorie : {activeQuestions[currentQuestionIndex].category}
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
              {activeQuestions[currentQuestionIndex].text}
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {activeQuestions[currentQuestionIndex].options.map((option, index) => {
                let buttonStyle = {};
                let showIcon = null;
                if (selectedAnswer !== null) {
                  if (index === activeQuestions[currentQuestionIndex].correctAnswerIndex) {
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
                      opacity: selectedAnswer !== null && index !== activeQuestions[currentQuestionIndex].correctAnswerIndex && index !== selectedAnswer ? 0.6 : 1
                    }}
                    onClick={() => handleAnswerClick(index)}
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
                  onClick={goToNextQuestion}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                  title="Fermer et continuer"
                >
                  <X size={20} />
                </button>
                <h4 style={{ color: isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isAnswerCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  {isAnswerCorrect ? 'Bonne réponse !' : 'Mauvaise réponse.'}
                </h4>
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                  <KeywordText 
                    text={activeQuestions[currentQuestionIndex].explanation} 
                    keywords={activeQuestions[currentQuestionIndex].keywords || []} 
                  />
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={goToNextQuestion} style={{ padding: '0.5rem 1rem' }}>
                    Continuer <ChevronRight size={18} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setStarted(false)} style={{ border: 'none', color: 'var(--text-secondary)' }}>
                Quitter le quiz
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
