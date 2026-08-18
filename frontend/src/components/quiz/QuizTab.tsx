import { Difficulty } from '../../data/questions';
import { User } from '../../firebase';
import { useQuiz } from '../../hooks/useQuiz';
import { QuizSetup } from './QuizSetup';
import { QuizLoadingScreen } from './QuizLoadingScreen';
import { QuizResultsScreen } from './QuizResultsScreen';
import { QuizQuestionScreen } from './QuizQuestionScreen';

interface QuizTabProps {
  user: User | null;
  quiz: ReturnType<typeof useQuiz>;
  challengeLink: string | null;
  creatingChallenge: boolean;
  linkCopied: boolean;
  onStartQuiz: (difficulty: Difficulty) => void;
  onCreateChallenge: () => void;
  onCopyLink: () => void;
}

export function QuizTab({
  user,
  quiz,
  challengeLink,
  creatingChallenge,
  linkCopied,
  onStartQuiz,
  onCreateChallenge,
  onCopyLink,
}: QuizTabProps) {
  if (!quiz.started) {
    return (
      <QuizSetup
        user={user}
        selectedCategory={quiz.selectedCategory}
        onCategoryChange={quiz.setSelectedCategory}
        error={quiz.error}
        onStart={onStartQuiz}
      />
    );
  }

  if (quiz.loading) {
    return <QuizLoadingScreen />;
  }

  if (quiz.showResults) {
    return (
      <QuizResultsScreen
        user={user}
        score={quiz.score}
        activeQuestions={quiz.activeQuestions}
        userAnswers={quiz.userAnswers}
        selectedDifficulty={quiz.selectedDifficulty}
        challengeLink={challengeLink}
        creatingChallenge={creatingChallenge}
        linkCopied={linkCopied}
        onCreateChallenge={onCreateChallenge}
        onCopyLink={onCopyLink}
        onRestart={() => onStartQuiz(quiz.selectedDifficulty)}
        onChangeSetup={() => quiz.setStarted(false)}
      />
    );
  }

  return (
    <QuizQuestionScreen
      question={quiz.activeQuestions[quiz.currentQuestionIndex]}
      questionIndex={quiz.currentQuestionIndex}
      totalQuestions={quiz.activeQuestions.length}
      score={quiz.score}
      timeLeft={quiz.timeLeft}
      selectedAnswer={quiz.selectedAnswer}
      isAnswerCorrect={quiz.isAnswerCorrect}
      onAnswer={quiz.handleAnswerClick}
      onNext={quiz.goToNextQuestion}
      onQuit={() => quiz.setStarted(false)}
    />
  );
}
