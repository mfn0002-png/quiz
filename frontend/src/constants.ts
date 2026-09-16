import { Difficulty } from './data/questions';

export type ActiveTab = 'quiz' | 'assistant' | 'stats' | 'leaderboard';

export const CATEGORIES = ['Mélange', 'Prophètes', 'Coran', "Piliers de l'Islam", 'Histoire', 'Pratiques'];

export const DIFFICULTIES: Difficulty[] = ['Auto', 'Débutant', 'Intermédiaire', 'Expert'];

export const QUESTION_TIME = 30;
export const DEFAULT_QUESTION_COUNT = 6;
export const MAX_GLOBAL_LIVES = 5;
export const INITIAL_LIVES = MAX_GLOBAL_LIVES;
export const RECHARGE_TIME_SECONDS = 180; // Modifiable pour le temps de recharge

export const LEARNING_CATEGORIES = [
  { id: 'all', label: '✨ Tout voir' },
  { id: 'piliers', label: "🕌 Piliers de l'Islam" },
  { id: 'foi', label: '💫 Piliers de la Foi' },
  { id: 'duas', label: '🤲 Invocations & Duas' },
  { id: 'prophetes', label: '📜 Les Prophètes' },
  { id: 'noms', label: "🌟 Noms d'Allah" },
];
