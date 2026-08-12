import { Difficulty, Question, Keyword } from '../data/questions';
export type { Keyword };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

export interface AssistantResponse {
  answer: string;
  keywords: Keyword[];
}

/**
 * Appelle l'API Backend Express pour générer des questions via Gemini AI Agent.
 */
export const generateQuestions = async (difficulty: Difficulty, topic: string = "Mélange", count: number = 5): Promise<Question[]> => {
  const response = await fetch(`${API_BASE_URL}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ difficulty, topic, count })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Appelle l'API Backend Express pour la conversation avec l'Assistant IA Gemini.
 */
export const askQuestion = async (userQuestion: string): Promise<AssistantResponse> => {
  const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: userQuestion })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur HTTP ${response.status}`);
  }

  return response.json();
};
