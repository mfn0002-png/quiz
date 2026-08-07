import { useState, useEffect, useCallback } from 'react';
import { Difficulty, Question } from '../data/questions';
import { generateQuestions } from '../services/geminiService';
import { playCorrect, playWrong, playTimeout } from '../utils/sounds';
import { saveSession } from '../services/firestoreService';
import { User } from '../firebase';
import { QUESTION_TIME } from '../constants';

export function useQuiz(user: User | null) {
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

  // Minuteur de la question en cours
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return {
    started, setStarted,
    loading,
    error, setError,
    currentQuestionIndex,
    score,
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
    handleAnswerClick,
    goToNextQuestion,
  };
}
