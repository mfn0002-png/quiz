import { useState, useEffect, useCallback } from 'react';
import { Difficulty, Question } from '../data/questions';
import { generateQuestions, getClientSessionId, sendQuizResults } from '../services/apiService';
import { getGlobalLivesState, consumeGlobalLife, LivesState } from '../services/livesService';
import { playCorrect, playWrong, playTimeout } from '../utils/sounds';
import { saveSession } from '../services/firestoreService';
import { User } from '../firebase';
import { QUESTION_TIME, DEFAULT_QUESTION_COUNT } from '../constants';
import { parseApiError } from '../utils/errorUtils';

export function useQuiz(user: User | null) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [livesState, setLivesState] = useState<LivesState>(() => getGlobalLivesState());
  const [isGameOver, setIsGameOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Auto');
  const [selectedCategory, setSelectedCategory] = useState<string>('Mélange');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // Minuteur de rafraîchissement continu des Vies (1 vie / X sec)
  useEffect(() => {
    const timer = setInterval(() => {
      setLivesState(getGlobalLivesState());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startQuiz = async (difficulty: Difficulty) => {
    const currentLives = getGlobalLivesState();
    if (currentLives.lives <= 0) {
      setError("Vous n'avez plus de vie disponible. Veuillez attendre la recharge automatique.");
      return;
    }

    setSelectedDifficulty(difficulty);
    setLoading(true);
    setError(null);
    setStarted(true);
    setIsGameOver(false);

    try {
      const sessionId = getClientSessionId(user?.uid);
      const generatedQuestions = await generateQuestions(difficulty, selectedCategory, DEFAULT_QUESTION_COUNT, sessionId);
      setActiveQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResults(false);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setUserAnswers(new Array(generatedQuestions.length || DEFAULT_QUESTION_COUNT).fill(null));
      setTimeLeft(QUESTION_TIME);
    } catch (err: any) {
      console.error(err);
      const { icon, title, detail, hint } = parseApiError(err);
      setError(`${icon} ${title} : ${detail}${hint ? ` (${hint})` : ''}`);
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const finishQuiz = useCallback((finalScore: number, gameOver: boolean = false) => {
    setShowResults(true);
    if (gameOver) setIsGameOver(true);

    const sessionId = getClientSessionId(user?.uid);
    const results = activeQuestions.map((q, idx) => ({
      questionId: q.id,
      isCorrect: userAnswers[idx] === q.correctAnswerIndex,
      category: q.category || selectedCategory,
    }));
    sendQuizResults(sessionId, results);

    if (user) {
      saveSession(user.uid, selectedDifficulty, selectedCategory, finalScore, activeQuestions.length, activeQuestions, userAnswers)
        .then(() => setStatsRefreshKey(k => k + 1))
        .catch(err => console.error("Erreur sauvegarde session :", err));
    }
  }, [user, selectedDifficulty, selectedCategory, activeQuestions, userAnswers]);

  const replayQuiz = (replayQuestions: Question[], difficulty: Difficulty, category: string) => {
    const currentLives = getGlobalLivesState();
    if (currentLives.lives <= 0) {
      setError("Vous n'avez plus de vie disponible. Veuillez attendre la recharge.");
      setStarted(false);
      return;
    }

    setSelectedDifficulty(difficulty);
    setSelectedCategory(category);
    setActiveQuestions(replayQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsGameOver(false);
    setShowResults(false);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setUserAnswers(new Array(replayQuestions.length).fill(null));
    setTimeLeft(QUESTION_TIME);
    setStarted(true);
  };

  // Minuteur de la question en cours (suspendu si 0 vie en attente)
  useEffect(() => {
    let timer: number;
    const hasLives = livesState.lives > 0;
    if (started && !loading && !showResults && selectedAnswer === null && timeLeft > 0 && hasLives) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && selectedAnswer === null && hasLives) {
      playTimeout();
      handleAnswerClick(-1);
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, loading, showResults, selectedAnswer, timeLeft, livesState.lives]);

  const handleAnswerClick = (optionIndex: number) => {
    if (selectedAnswer !== null) return;
    const correct = optionIndex === activeQuestions[currentQuestionIndex].correctAnswerIndex;
    setSelectedAnswer(optionIndex);
    setIsAnswerCorrect(correct);

    if (correct) {
      playCorrect();
      setScore(prev => prev + 1);
    } else {
      playWrong();
      // Consommer 1 Vie Globale de la réserve
      const updatedLivesState = consumeGlobalLife();
      setLivesState(updatedLivesState);
      if (updatedLivesState.lives <= 0) {
        setIsGameOver(true);
      }
    }

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
      finishQuiz(score, livesState.lives <= 0 || isGameOver);
    }
  };

  const quitQuiz = () => {
    finishQuiz(score, livesState.lives <= 0 || isGameOver);
  };

  return {
    started, setStarted,
    loading,
    error, setError,
    currentQuestionIndex,
    score,
    lives: livesState.lives,
    livesState,
    isGameOver,
    showResults,
    selectedAnswer,
    isAnswerCorrect,
    selectedDifficulty,
    selectedCategory, setSelectedCategory,
    activeQuestions,
    timeLeft,
    userAnswers,
    statsRefreshKey,
    startQuiz,
    replayQuiz,
    handleAnswerClick,
    goToNextQuestion,
    quitQuiz,
  };
}
