import { Difficulty, Question, Keyword } from '../data/questions';
export type { Keyword };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
const ANONYMOUS_SESSION_KEY = 'quiz_anonymous_session_id';

/**
 * Récupère ou génère un ID de session unique pour le client (invité ou connecté)
 */
export function getClientSessionId(userId?: string | null): string {
  if (userId) {
    return `user_${userId}`;
  }
  let anonId = localStorage.getItem(ANONYMOUS_SESSION_KEY);
  if (!anonId) {
    anonId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem(ANONYMOUS_SESSION_KEY, anonId);
  }
  return anonId;
}

export function resetClientSessionId(): string {
  const newAnonId = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
  localStorage.setItem(ANONYMOUS_SESSION_KEY, newAnonId);
  return newAnonId;
}

export interface ChatQuizData {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  keywords: Keyword[];
}

export interface AssistantResponse {
  answer: string;
  keywords: Keyword[];
  quizData?: ChatQuizData;
}

/**
 * Appelle l'API Backend Express pour générer des questions via Quiz Agent.
 */
export const generateQuestions = async (
  difficulty: Difficulty,
  topic: string = "Mélange",
  count: number = 5,
  sessionId?: string
): Promise<Question[]> => {
  const finalSessionId = sessionId || getClientSessionId();
  const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty, topic, count, sessionId: finalSessionId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Appelle l'API Backend Express pour la conversation avec l'Assistant IA Gemini Agent.
 */
export const askQuestion = async (userQuestion: string, sessionId?: string): Promise<AssistantResponse> => {
  const finalSessionId = sessionId || getClientSessionId();
  const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: userQuestion, sessionId: finalSessionId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Réinitialise l'historique de conversation de la session en cours.
 */
export const resetAssistantSession = async (sessionId?: string): Promise<void> => {
  const finalSessionId = sessionId || getClientSessionId();
  await fetch(`${API_BASE_URL}/assistant/session/${finalSessionId}`, {
    method: 'DELETE'
  }).catch(err => console.error("Erreur réinitialisation session :", err));
};

/**
 * Récupère l'historique de conversation sauvegardé dans Redis pour la session en cours.
 */
export const getAssistantHistory = async (sessionId?: string): Promise<{ role: 'user' | 'assistant'; content: string; keywords?: Keyword[] }[]> => {
  const finalSessionId = sessionId || getClientSessionId();
  const response = await fetch(`${API_BASE_URL}/assistant/history/${finalSessionId}`);
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({ history: [] }));
  return data.history || [];
};


