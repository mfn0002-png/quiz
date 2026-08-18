export type Difficulty = 'Débutant' | 'Intermédiaire' | 'Avancé';

export interface Keyword {
  term: string;
  definition: string;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  category: string;
  keywords?: Keyword[];
}

export const questions: Question[] = [
  // Débutant
  {
    id: 1,
    text: "Combien y a-t-il de piliers en Islam ?",
    options: ["3", "4", "5", "6"],
    correctAnswerIndex: 2,
    explanation: "Il y a 5 piliers en Islam : l'attestation de foi, la prière, l'aumône légale, le jeûne du Ramadan et le pèlerinage à La Mecque.",
    difficulty: "Débutant",
    category: "Piliers"
  },
  {
    id: 2,
    text: "Quel est le nom du dernier Prophète en Islam ?",
    options: ["Jésus (Îsâ)", "Moïse (Mûsâ)", "Abraham (Ibrâhîm)", "Muhammad (ﷺ)"],
    correctAnswerIndex: 3,
    explanation: "Muhammad (ﷺ) est le dernier des prophètes et messagers envoyés par Allah.",
    difficulty: "Débutant",
    category: "Prophètes"
  },
  {
    id: 3,
    text: "Comment appelle-t-on la prière rituelle en Islam ?",
    options: ["La Zakat", "La Salat", "Le Hajj", "Le Sawm"],
    correctAnswerIndex: 1,
    explanation: "La Salat est la prière rituelle, le deuxième pilier de l'Islam.",
    difficulty: "Débutant",
    category: "Pratiques"
  },
  {
    id: 4,
    text: "Quel est le livre sacré des musulmans ?",
    options: ["La Torah", "L'Évangile", "Le Coran", "Les Psaumes"],
    correctAnswerIndex: 2,
    explanation: "Le Coran est la parole d'Allah révélée au Prophète Muhammad (ﷺ).",
    difficulty: "Débutant",
    category: "Coran"
  },
  {
    id: 5,
    text: "Vers quelle ville les musulmans se dirigent-ils pour prier ?",
    options: ["Médine", "Jérusalem", "La Mecque", "Damas"],
    correctAnswerIndex: 2,
    explanation: "Les musulmans prient en direction de la Kaaba, située à La Mecque.",
    difficulty: "Débutant",
    category: "Pratiques"
  },
  
  // Intermédiaire
  {
    id: 6,
    text: "Combien de sourates compte le Coran ?",
    options: ["114", "110", "120", "99"],
    correctAnswerIndex: 0,
    explanation: "Le Coran est composé de 114 sourates (chapitres).",
    difficulty: "Intermédiaire",
    category: "Coran"
  },
  {
    id: 7,
    text: "Quel compagnon du Prophète (ﷺ) est devenu le premier Calife ?",
    options: ["'Umar ibn al-Khattâb", "Ali ibn Abi Talib", "Abou Bakr As-Siddiq", "Othmân ibn Affân"],
    correctAnswerIndex: 2,
    explanation: "Abou Bakr As-Siddiq fut le premier calife bien guidé après la mort du Prophète (ﷺ).",
    difficulty: "Intermédiaire",
    category: "Histoire"
  },
  {
    id: 8,
    text: "Quelle est la traduction littérale du mot 'Islam' ?",
    options: ["Paix", "Soumission", "Croyance", "Pardon"],
    correctAnswerIndex: 1,
    explanation: "Le mot 'Islam' vient de la racine arabe signifiant à la fois paix et soumission à la volonté de Dieu.",
    difficulty: "Intermédiaire",
    category: "Généralités"
  },
  {
    id: 9,
    text: "Laquelle de ces batailles fut la première grande bataille de l'Islam ?",
    options: ["Uhud", "Le Fossé (Khandaq)", "Badr", "Khaybar"],
    correctAnswerIndex: 2,
    explanation: "La bataille de Badr, ayant eu lieu en l'an 2 de l'Hégire, fut la première victoire majeure des musulmans.",
    difficulty: "Intermédiaire",
    category: "Histoire"
  },
  {
    id: 10,
    text: "Qui était le père du prophète Ibrahim (Abraham) selon la tradition islamique ?",
    options: ["Terah", "Azar", "Imran", "Ya'qub"],
    correctAnswerIndex: 1,
    explanation: "Le Coran nomme le père d'Ibrahim 'Azar'.",
    difficulty: "Intermédiaire",
    category: "Prophètes"
  },

  // Avancé
  {
    id: 11,
    text: "Quelle sourate du Coran ne commence pas par la 'Basmala' (Au nom d'Allah...) ?",
    options: ["Al-Fatiha", "At-Tawbah", "Al-Baqarah", "Al-Kahf"],
    correctAnswerIndex: 1,
    explanation: "La sourate At-Tawbah (Le Repentir) est la seule des 114 sourates à ne pas commencer par la Basmala.",
    difficulty: "Avancé",
    category: "Coran"
  },
  {
    id: 12,
    text: "Combien d'années a duré la révélation du Coran ?",
    options: ["10 ans", "23 ans", "33 ans", "40 ans"],
    correctAnswerIndex: 1,
    explanation: "La révélation s'est étendue sur environ 23 années, 13 ans à La Mecque et 10 ans à Médine.",
    difficulty: "Avancé",
    category: "Coran"
  },
  {
    id: 13,
    text: "Qui était le roi justicier d'Abyssinie chez qui les premiers musulmans ont trouvé refuge ?",
    options: ["Le Négus (An-Najashi)", "Héraclius", "Chosroès", "Pharaon"],
    correctAnswerIndex: 0,
    explanation: "Le Négus d'Abyssinie a accueilli les musulmans persécutés par les Qurayshites lors de la première émigration.",
    difficulty: "Avancé",
    category: "Histoire"
  },
  {
    id: 14,
    text: "Parmi ces recueils de Hadiths, lequel ne fait pas partie des 'Kutub al-Sittah' (les 6 livres canoniques) ?",
    options: ["Sahih Al-Bukhari", "Sunan Ibn Majah", "Muwatta Imam Malik", "Sunan Abi Dawud"],
    correctAnswerIndex: 2,
    explanation: "Le Muwatta de l'Imam Malik est un recueil authentique et majeur, mais il ne fait traditionnellement pas partie des 6 livres (Kutub al-Sittah).",
    difficulty: "Avancé",
    category: "Hadith"
  },
  {
    id: 15,
    text: "Comment s'appelle l'ange chargé de souffler dans la Trompe au Jour du Jugement ?",
    options: ["Jibril (Gabriel)", "Mikail (Michaël)", "Israfil", "Malik"],
    correctAnswerIndex: 2,
    explanation: "Israfil est l'ange qui soufflera dans la Trompe (As-Sur) pour annoncer la fin des temps.",
    difficulty: "Avancé",
    category: "Croyances"
  }
];
