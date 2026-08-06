import { useState } from 'react';
import { BookOpen, Trophy, Play, CheckCircle2, XCircle, RefreshCw, ChevronRight, X, Loader2, MessageCircle } from 'lucide-react';
import { Difficulty, Question } from './data/questions';
import { generateQuestions } from './services/geminiService';
import { Assistant } from './components/Assistant';
import { KeywordText } from './components/KeywordText';
import './App.css';

type ActiveTab = 'quiz' | 'assistant';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quiz');

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
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);

  const startQuiz = async (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setLoading(true);
    setError(null);
    setStarted(true);

    try {
      const generatedQuestions = await generateQuestions(difficulty, 'Mélange', 5);
      setActiveQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResults(false);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    } catch (err: any) {
      console.error(err);
      setError("Erreur IA : " + (err.message || JSON.stringify(err)));
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerClick = (optionIndex: number) => {
    if (selectedAnswer !== null) return;
    const correct = optionIndex === activeQuestions[currentQuestionIndex].correctAnswerIndex;
    setSelectedAnswer(optionIndex);
    setIsAnswerCorrect(correct);
    if (correct) setScore(prev => prev + 1);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    } else {
      setShowResults(true);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Quiz Islamique</h1>
        <p>Testez vos connaissances et posez vos questions grâce à l'Intelligence Artificielle.</p>
      </header>

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-full)', padding: '0.35rem', boxShadow: 'var(--shadow-sm)' }}>
        {[
          { id: 'quiz', label: '🎯 Quiz', icon: null },
          { id: 'assistant', label: '💬 Assistant', icon: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            style={{
              flex: 1,
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
        ) : !started ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <BookOpen size={64} color="var(--primary-color)" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Prêt à commencer ?</h2>
            <p style={{ marginBottom: '1rem' }}>Choisissez votre niveau de difficulté.</p>
            <p style={{ marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Les questions seront générées instantanément par l'IA Gemini.
            </p>

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
            <Loader2 size={64} color="var(--primary-color)" style={{ animation: 'spin 2s linear infinite', marginBottom: '1.5rem' }} />
            <h2>Création du quiz en cours...</h2>
            <p>L'IA prépare des questions uniques pour vous.</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : showResults ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Trophy size={64} color="var(--secondary-color)" style={{ margin: '0 auto 1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Quiz Terminé !</h2>
            <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
              Votre score est de <strong>{score}</strong> sur {activeQuestions.length} au niveau <strong>{selectedDifficulty}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => startQuiz(selectedDifficulty)}>
                <RefreshCw size={20} style={{ marginRight: '0.5rem' }} />
                Nouveau Quiz
              </button>
              <button className="btn btn-outline" onClick={() => setStarted(false)}>
                Changer de niveau
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
