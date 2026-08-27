import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuiz } from './useQuiz';
import { MAX_GLOBAL_LIVES } from '../constants';

const mocks = vi.hoisted(() => ({
  getGlobalLivesState: vi.fn(),
  consumeGlobalLife: vi.fn(),
  generateQuestions: vi.fn(),
  getClientSessionId: vi.fn(),
  parseApiError: vi.fn(),
  saveSession: vi.fn(),
  playCorrect: vi.fn(),
  playWrong: vi.fn(),
  playTimeout: vi.fn(),
}));

vi.mock('../services/apiService', () => ({
  generateQuestions: mocks.generateQuestions,
  getClientSessionId: mocks.getClientSessionId,
  sendQuizResults: vi.fn(),
}));
vi.mock('../services/livesService', () => ({
  getGlobalLivesState: mocks.getGlobalLivesState,
  consumeGlobalLife: mocks.consumeGlobalLife,
}));
vi.mock('../services/firestoreService', () => ({
  saveSession: mocks.saveSession,
}));
vi.mock('../utils/errorUtils', () => ({
  parseApiError: mocks.parseApiError,
}));
vi.mock('../utils/sounds', () => ({
  playCorrect: mocks.playCorrect,
  playWrong: mocks.playWrong,
  playTimeout: mocks.playTimeout,
}));

const fullLives = { lives: MAX_GLOBAL_LIVES, nextRechargeSeconds: 0, isMaxLives: true };

const question = {
  id: 1,
  text: 'Quel est le premier pilier ?',
  options: ['Shahada', 'Salat', 'Zakat', 'Sawm'],
  correctAnswerIndex: 0,
  explanation: 'La Shahada.',
  difficulty: 'Débutant',
  category: 'Piliers',
  keywords: [],
};

describe('useQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGlobalLivesState.mockReturnValue(fullLives);
    mocks.getClientSessionId.mockReturnValue('user_test');
    // Reflète le comportement réel de parseApiError : propage le message pour une erreur générique
    mocks.parseApiError.mockImplementation((err) => ({
      icon: '!',
      title: 'Erreur',
      detail: err?.message || '',
      hint: '',
    }));
  });

  it('n\'active pas le minuteur de vies quand le quiz n\'est pas démarré', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useQuiz(null));
      expect(mocks.getGlobalLivesState).toHaveBeenCalledTimes(1); // init uniquement

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      // Toujours 1 appel : aucun timer de vies ne tourne hors quiz
      expect(mocks.getGlobalLivesState).toHaveBeenCalledTimes(1);

      expect(result.current.started).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('démarre un quiz et charge les questions', async () => {
    mocks.generateQuestions.mockResolvedValue([question]);
    const { result } = renderHook(() => useQuiz(null));

    await act(async () => {
      await result.current.startQuiz('Débutant');
    });

    expect(result.current.started).toBe(true);
    expect(result.current.activeQuestions).toHaveLength(1);
    expect(mocks.generateQuestions).toHaveBeenCalled();
  });

  it('ne crashe pas quand aucune question n\'est générée', async () => {
    mocks.generateQuestions.mockResolvedValue([]);
    const { result } = renderHook(() => useQuiz(null));

    await act(async () => {
      await result.current.startQuiz('Débutant');
    });

    expect(result.current.started).toBe(false);
    expect(result.current.error).toContain('Aucune question');
  });

  it('consomme une vie quand la réponse est fausse', async () => {
    const livesAfter = { lives: MAX_GLOBAL_LIVES - 1, nextRechargeSeconds: 300, isMaxLives: false };
    mocks.generateQuestions.mockResolvedValue([question]);
    mocks.consumeGlobalLife.mockReturnValue(livesAfter);

    const { result } = renderHook(() => useQuiz(null));

    await act(async () => {
      await result.current.startQuiz('Débutant');
    });

    await act(async () => {
      result.current.handleAnswerClick(1); // mauvaise réponse (index 1)
    });

    expect(mocks.consumeGlobalLife).toHaveBeenCalledTimes(1);
    expect(result.current.lives).toBe(MAX_GLOBAL_LIVES - 1);
    expect(result.current.selectedAnswer).toBe(1);
  });

  it('ne consomme pas de vie quand la réponse est bonne', async () => {
    mocks.generateQuestions.mockResolvedValue([question]);
    mocks.consumeGlobalLife.mockReturnValue({ ...fullLives, lives: MAX_GLOBAL_LIVES - 1 });

    const { result } = renderHook(() => useQuiz(null));

    await act(async () => {
      await result.current.startQuiz('Débutant');
    });

    await act(async () => {
      result.current.handleAnswerClick(0); // bonne réponse
    });

    expect(mocks.consumeGlobalLife).not.toHaveBeenCalled();
    expect(result.current.score).toBe(1);
  });
});
