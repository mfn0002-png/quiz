/**
 * quizCacheService.js
 *
 * Service de cache et banque de questions de secours pour Redis.
 * Permet d'alimenter une réserve de questions complètes (avec explications & mots-clés)
 * et d'y piocher immédiatement si le quota Gemini (429) est dépassé.
 */

import { redis, memoryStore } from '../config/redis.js';

const TTL_CACHE_POOL = 2_592_000; // 30 jours dans Redis

/**
 * Normalise la clé de stockage pour la banque de questions.
 */
function getPoolKey(difficulty, topic) {
  const normDiff = (difficulty || 'Débutant').toLowerCase().trim();
  const normTopic = (topic || 'Mélange').toLowerCase().trim();
  return `quiz:pool:${normDiff}:${normTopic}`;
}

/**
 * Enregistre un lot de questions entièrement vérifiées dans la banque de secours Redis.
 * @param {Array} questions - Questions complètes (text, options, correctAnswerIndex, explanation, keywords...)
 * @param {string} difficulty
 * @param {string} topic
 */
export async function saveQuestionsToPool(questions, difficulty, topic) {
  if (!Array.isArray(questions) || questions.length === 0) return;

  const key = getPoolKey(difficulty, topic);
  console.log(`💾 [Quiz Cache] Sauvegarde de ${questions.length} questions complètes dans le pool Redis : "${key}"`);

  let existing = [];
  if (redis) {
    existing = (await redis.get(key)) || [];
  } else {
    existing = memoryStore.get(key) || [];
  }

  // Éviter les doublons exacts par le texte de la question
  const existingTexts = new Set(existing.map(q => q.text.trim().toLowerCase()));
  const newQuestions = questions.filter(q => !existingTexts.has(q.text.trim().toLowerCase()));

  const updatedPool = [...existing, ...newQuestions].slice(-100); // Conserver jusqu'à 100 questions par catégorie

  if (redis) {
    await redis.set(key, updatedPool, { ex: TTL_CACHE_POOL });
  } else {
    memoryStore.set(key, updatedPool);
  }
}

/**
 * Récupère des questions de secours depuis le pool Redis (en cas d'erreur 429 Gemini).
 * @param {string} difficulty
 * @param {string} topic
 * @param {number} count
 * @returns {Promise<Array>} Liste de questions complètes avec explications
 */
export async function getQuestionsFromPool(difficulty, topic, count = 5) {
  const key = getPoolKey(difficulty, topic);
  const fallbackKey = getPoolKey('débutant', 'mélange');

  let pool = [];
  if (redis) {
    pool = (await redis.get(key)) || (await redis.get(fallbackKey)) || [];
  } else {
    pool = memoryStore.get(key) || memoryStore.get(fallbackKey) || [];
  }

  if (pool.length === 0) {
    console.warn(`⚠️ [Quiz Cache] Aucun fallback disponible dans "${key}".`);
    return [];
  }

  // Mélanger le pool et prendre le nombre demandé
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  console.log(`📦 [Quiz Cache Fallback] ${selected.length} questions complètes avec explications extraites du pool Redis ("${key}")`);
  return selected;
}

const DEFAULT_STATIC_QUESTIONS = [
  {
    id: 101,
    text: "Combien y a-t-il de piliers en Islam ?",
    options: ["3", "4", "5", "6"],
    correctAnswerIndex: 2,
    explanation: "Il y a 5 piliers en Islam : la Shahada, la Salat, la Zakat, le Sawm (Ramadan) et le Hajj.",
    difficulty: "Débutant",
    category: "Piliers",
    keywords: [
      { term: "Shahada", definition: "Attestation de foi en l'unicité d'Allah et la prophétie de Muhammad (ﷺ)." },
      { term: "Salat", definition: "Prière rituelle quotidienne effectuée 5 fois par jour." }
    ]
  },
  {
    id: 102,
    text: "Quel est le nom du dernier Prophète et Messager en Islam ?",
    options: ["Jésus (Îsâ)", "Moïse (Mûsâ)", "Abraham (Ibrâhîm)", "Muhammad (ﷺ)"],
    correctAnswerIndex: 3,
    explanation: "Le Prophète Muhammad (ﷺ) est le sceau des prophètes (Khatam an-Nabiyyin).",
    difficulty: "Débutant",
    category: "Prophètes",
    keywords: [
      { term: "Prophète", definition: "Messager choisi par Allah pour guider l'humanité." }
    ]
  },
  {
    id: 103,
    text: "Combien de sourates le Saint Coran comporte-t-il ?",
    options: ["114", "110", "120", "99"],
    correctAnswerIndex: 0,
    explanation: "Le Coran est composé de 114 sourates révélées au Prophète (ﷺ).",
    difficulty: "Intermédiaire",
    category: "Coran",
    keywords: [
      { term: "Sourate", definition: "Chapitre du Coran." }
    ]
  },
  {
    id: 104,
    text: "Comment appelle-t-on la prière rituelle de la nuit pendant le mois de Ramadan ?",
    options: ["La Tahajjud", "La Tarawih", "La Duha", "La Witr"],
    correctAnswerIndex: 1,
    explanation: "Les prières de Tarawih sont les prières nocturnes surérogatoires accomplies pendant le mois de Ramadan.",
    difficulty: "Débutant",
    category: "Pratiques",
    keywords: [
      { term: "Tarawih", definition: "Prière nocturne recommandée effectuée en groupe pendant le Ramadan." }
    ]
  },
  {
    id: 105,
    text: "Quelle sourate est surnommée la 'Mère du Livre' (Oumm al-Kitab) ?",
    options: ["Al-Ikhlas", "Al-Fatiha", "Al-Baqarah", "Yasin"],
    correctAnswerIndex: 1,
    explanation: "Al-Fatiha est la sourate d'ouverture du Coran, récitée dans chaque unité de prière (rak'ah).",
    difficulty: "Débutant",
    category: "Coran",
    keywords: [
      { term: "Al-Fatiha", definition: "Première sourate du Coran, signifiant 'L'Ouverture'." }
    ]
  },
  {
    id: 106,
    text: "Quel compagnon fut le premier Calife de l'Islam après la mort du Prophète (ﷺ) ?",
    options: ["'Umar ibn al-Khattâb", "Ali ibn Abi Talib", "Abou Bakr As-Siddiq", "Othmân ibn Affân"],
    correctAnswerIndex: 2,
    explanation: "Abou Bakr As-Siddiq (qu'Allah l'agrée) fut le premier calife bien guidé de l'Islam.",
    difficulty: "Intermédiaire",
    category: "Histoire",
    keywords: [
      { term: "Calife", definition: "Successeur à la tête de la communauté musulmane." }
    ]
  }
];

export function getStaticFallbackQuestions(difficulty, count = 5) {
  const shuffled = [...DEFAULT_STATIC_QUESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
