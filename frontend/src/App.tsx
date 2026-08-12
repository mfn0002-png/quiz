import { useState } from 'react';
import { Difficulty } from './data/questions';
import { ActiveTab } from './constants';
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('quiz');

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
      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <main className="main-content">
        {activeTab === 'assistant' && <AssistantTab />}

        {activeTab === 'stats' && (
          <StatsTab user={user} authLoading={authLoading} refreshKey={quiz.statsRefreshKey} />
        )}

        {activeTab === 'leaderboard' && <LeaderboardTab currentUser={user} />}

        {activeTab === 'quiz' && (
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
        )}
      </main>
    </div>
  );
}

export default App;
