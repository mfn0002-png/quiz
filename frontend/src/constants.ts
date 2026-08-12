import { Difficulty } from './data/questions';

export type ActiveTab = 'quiz' | 'assistant' | 'stats' | 'leaderboard';

export const CATEGORIES = ['Mélange', 'Prophètes', 'Coran', "Piliers de l'Islam", 'Histoire', 'Pratiques'];

export const DIFFICULTIES: Difficulty[] = ['Débutant', 'Intermédiaire', 'Avancé'];

export const QUESTION_TIME = 20;
