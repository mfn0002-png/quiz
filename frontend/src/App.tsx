import { Routes, Route, Navigate } from 'react-router-dom';
import { Difficulty } from './data/questions';
import { useAuthUser } from './hooks/useAuthUser';
import { useQuiz } from './hooks/useQuiz';
import { useChallenge } from './hooks/useChallenge';
import { Header } from './components/Header';
import { TabNav } from './components/TabNav';
import { AssistantTab } from './components/AssistantTab';
import { StatsTab } from './components/StatsTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { QuizTab } from './components/quiz/QuizTab';
import { ChallengePage } from './components/challenge/ChallengePage';
import './App.css';

function App() {
  const { user, authLoading } = useAuthUser();
  const quiz = useQuiz(user);
  const challenge = useChallenge({ user, onError: quiz.setError });

  // Un défi (créé ou reçu via ?challenge=ID) prend le pas sur les onglets normaux
  if (challenge.challenge || challenge.challengeLoading) {
    return <ChallengePage user={user} authLoading={authLoading} challenge={challenge} />;
  }

  const handleStartQuiz = (difficulty: Difficulty) => {
    challenge.resetChallengeLink();
    quiz.startQuiz(difficulty);
  };

  const handleCreateChallenge = () => {
    challenge.createChallengeFromResult(quiz.activeQuestions, quiz.score, quiz.userAnswers);
  };

  return (
    <div className="app-container">
      <Header user={user} authLoading={authLoading} />
      <TabNav />

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
          <Route path="/assistant" element={<AssistantTab />} />
          <Route
            path="/stats"
            element={<StatsTab user={user} authLoading={authLoading} refreshKey={quiz.statsRefreshKey} onReplayQuiz={quiz.replayQuiz} />}
          />
          <Route path="/leaderboard" element={<LeaderboardTab currentUser={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
