import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Difficulty } from './data/questions';
import { useAuthUser } from './hooks/useAuthUser';
import { useQuiz } from './hooks/useQuiz';
import { useChallenge } from './hooks/useChallenge';
import { Sidebar } from './components/Sidebar';
import { AssistantTab } from './components/AssistantTab';
import { StatsTab } from './components/StatsTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { QuizTab } from './components/quiz/QuizTab';
import { LearningHub } from './components/learning/LearningHub';
import { FloatingAssistant } from './components/FloatingAssistant';
import { ChallengePage } from './components/challenge/ChallengePage';
import { ThemeProvider } from './context/ThemeContext';
import { AdminSettings } from './components/admin/AdminSettings';
import './App.css';

function AppContent() {
  const { user, authLoading } = useAuthUser();
  const quiz = useQuiz(user);
  const challenge = useChallenge({ user, onError: quiz.setError });
  const navigate = useNavigate();

  // Un défi (créé ou reçu via ?challenge=ID) prend le pas sur les onglets normaux
  if (challenge.challenge || challenge.challengeLoading) {
    return <ChallengePage user={user} authLoading={authLoading} challenge={challenge} />;
  }

  const handleStartQuiz = (difficulty: Difficulty) => {
    challenge.resetChallengeLink();
    quiz.startQuiz(difficulty);
  };

  const handleStartQuizFromCategory = (category: string, difficulty: Difficulty = 'Auto') => {
    challenge.resetChallengeLink();
    quiz.startQuiz(difficulty, category);
    navigate('/');
  };

  const handleCreateChallenge = () => {
    challenge.createChallengeFromResult(quiz.activeQuestions, quiz.score, quiz.userAnswers);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar user={user} authLoading={authLoading} livesState={quiz.livesState} />

      {/* Main Workspace Taking All Remaining Space */}
      <div className="main-workspace">
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <QuizTab
                  user={user}
                  quiz={quiz}
                  challengeLink={challenge.challengeLink}
                  creatingChallenge={challenge.creatingChallenge}
                  linkCopied={challenge.linkCopied}
                  onStartQuiz={handleStartQuiz}
                  onCreateChallenge={handleCreateChallenge}
                  onCopyLink={challenge.copyLink}
                />
              }
            />
            <Route
              path="/learn"
              element={<LearningHub onStartQuizWithCategory={handleStartQuizFromCategory} />}
            />
            <Route path="/assistant" element={<AssistantTab />} />
            <Route
              path="/stats"
              element={<StatsTab user={user} authLoading={authLoading} refreshKey={quiz.statsRefreshKey} onReplayQuiz={quiz.replayQuiz} />}
            />
            <Route path="/leaderboard" element={<LeaderboardTab currentUser={user} />} />
            <Route path="/admin" element={<AdminSettings user={user} authLoading={authLoading} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating AI Assistant Action Button + Widget */}
      <FloatingAssistant />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
