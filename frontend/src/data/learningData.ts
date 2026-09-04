export interface LearningTopic {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  gradient: string;
  badge: string;
  summary: string;
  details: {
    heading: string;
    text: string;
    arabic?: string;
    phonetic?: string;
    source?: string;
    points?: string[];
  }[];
  quizCategoryTarget?: string; // Correspondance avec les questions du quiz
}

export const LEARNING_CATEGORIES = [
  { id: 'all', label: '✨ Tout voir' },
  { id: 'piliers', label: "🕌 Piliers de l'Islam" },
  { id: 'foi', label: '💫 Piliers de la Foi' },
  { id: 'duas', label: '🤲 Invocations & Duas' },
  { id: 'prophetes', label: '📜 Les Prophètes' },
  { id: 'noms', label: "🌟 Noms d'Allah" },
];

export const LEARNING_MODULES: LearningTopic[] = [
  // 1. Piliers de l'Islam
  {
    id: 'piliers-islam',
    title: "Les 5 Piliers de l'Islam",
    subtitle: "Les fondements pratiques essentiels de la vie du musulman",
    category: 'piliers',
    icon: '🕌',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    badge: 'Fondamental',
    summary: "L'Islam repose sur cinq actes fondamentaux d'adoration qui structurent la foi et les actions quotidiennes.",
    quizCategoryTarget: "Piliers de l'Islam",
    details: [
      {
        heading: "1. La Shahada (L'attestation de foi)",
        arabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ",
        phonetic: "Ach-hadou an lâ ilâha ill-Allâh, wa ach-hadou anna Muhammadan rasûl-Allâh",
        text: "C'est le témoignage qu'il n'y a de divinité digne d'adoration qu'Allah et que Muhammad est Son serviteur et messager. Elle constitue la clé d'entrée dans l'Islam."
      },
      {
        heading: "2. La Salat (La prière rituelle)",
        text: "Cinq prières quotidiennes obligatoires (Fajr, Dhuhr, Asr, Maghrib, Isha) qui maintiennent le lien permanent entre le croyant et son Créateur."
      },
      {
        heading: "3. La Zakat (L'aumône purificatrice)",
        text: "Un prélèvement annuel de 2,5% sur l'épargne excédant le seuil (Nissab), destiné aux nécessiteux pour purifier les biens et instaurer la solidarité."
      },
      {
        heading: "4. Le Sawm (Le jeûne du mois de Ramadan)",
        text: "L'abstinence de nourriture, boisson et désirs de l'aube au coucher du soleil durant le 9ème mois lunaire, développant la piété et la maîtrise de soi."
      },
      {
        heading: "5. Le Hajj (Le grand pèlerinage à La Mecque)",
        text: "Obligatoire au moins une fois dans sa vie pour toute personne ayant la capacité physique et financière requise."
      }
    ]
  },

  // 2. Les Piliers de la Foi (Iman)
  {
    id: 'piliers-foi',
    title: 'Les 6 Piliers de la Foi (Iman)',
    subtitle: 'Les convictions du cœur enseignées dans le hadith de Jibril',
    category: 'foi',
    icon: '💫',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
    badge: 'Croyance',
    summary: 'La foi musulmane repose sur six articles de foi indispensables qui éclairent le cheminement spirituel.',
    quizCategoryTarget: 'Mélange',
    details: [
      {
        heading: "1. La foi en Allah",
        text: "Croire en Son existence, Son unicité absolue (Tawhid), Sa souveraineté, et en Ses Noms et Attributs sublimes."
      },
      {
        heading: "2. La foi aux Anges",
        text: "Créés de lumière, ils obéissent parfaitement à Allah. Parmi eux : Jibril (révélation), Mikaïl (subsistance), Israfil (le cor), Malak al-Mawt (la mort)."
      },
      {
        heading: "3. La foi aux Livres révélés",
        text: "Croire aux révélations divines originelles : les Feuillets d'Abraham, la Torah à Moïse, les Psaumes (Zabur) à David, l'Évangile (Injil) à Jésus et le Coran à Muhammad ﷺ."
      },
      {
        heading: "4. La foi aux Messagers et Prophètes",
        text: "Reconnaître tous les prophètes envoyés par Allah pour guider l'humanité, du premier (Adam) au sceau des prophètes (Muhammad ﷺ)."
      },
      {
        heading: "5. La foi au Jour Dernier",
        text: "La résurrection, le Jugement Dernier, la balance des actes, le Paradis (Jannah) et l'Enfer (Jahannam)."
      },
      {
        heading: "6. La foi au Destin (Al-Qadr)",
        text: "Croire que tout arrive selon la science, la volonté, l'écriture et la création d'Allah, qu'il s'agisse de bien ou d'épreuves."
      }
    ]
  },

  // 3. Invocations & Duas du Quotidien
  {
    id: 'duas-quotidien',
    title: 'Invocations & Adhkar Essentiels',
    subtitle: 'Les paroles prophétiques pour illuminer chaque moment de la journée',
    category: 'duas',
    icon: '🤲',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    badge: 'Pratique',
    summary: 'Le Prophète ﷺ nous a enseigné des invocations protectrices et bénies pour chaque instant de la vie.',
    quizCategoryTarget: 'Pratiques',
    details: [
      {
        heading: "Au réveil",
        arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        phonetic: "Al-hamdu li-llâhi-l-ladhî ahyânâ ba'da mâ amâtanâ wa ilayhi-n-nuchûr",
        text: "« Louange à Allah qui nous a rendu la vie après nous avoir fait mourir, et c'est vers Lui que se fera le retour. »",
        source: "Rapporté par Al-Bukhari & Muslim"
      },
      {
        heading: "En sortant de chez soi",
        arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ",
        phonetic: "Bismi-llâh, tawakkaltu 'alâ-llâh, wa lâ hawla wa lâ quwwata illâ bi-llâh",
        text: "« Au nom d'Allah, je m'en remets à Allah. Il n'y a de force ni de puissance que par Allah. »",
        source: "Rapporté par Abu Dawud & At-Tirmidhi"
      },
      {
        heading: "Pour demander le savoir bénéfique",
        arabic: "رَبِّ زِدْنِي عِلْمًا",
        phonetic: "Rabbi zidnî 'ilmâ",
        text: "« Ô mon Seigneur, accrois mes connaissances ! »",
        source: "Sourate Tâ-Hâ, v.114"
      },
      {
        heading: "En cas d'épreuve ou de tristesse",
        arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
        phonetic: "Hasbuna-llâhu wa ni'ma-l-wakîl",
        text: "« Allah nous suffit, et Il est le meilleur Garant. »",
        source: "Sourate Âl 'Imrân, v.173"
      }
    ]
  },

  // 4. Les Récits des Prophètes
  {
    id: 'prophetes-recits',
    title: 'Les Grandes Figures Prophétiques',
    subtitle: "Modèles de patience, de foi et de persévérance à travers l'histoire",
    category: 'prophetes',
    icon: '📜',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    badge: 'Histoire',
    summary: "Découvrez les leçons intemporelles transmises par les messagers les plus résolus (Ouloul 'Azm).",
    quizCategoryTarget: 'Prophètes',
    details: [
      {
        heading: "Adam ('alayhi salam) - Le premier homme",
        text: "Créé d'argile, père de l'humanité à qui les anges se sont prosternés sur ordre divin. Il symbolise le repentir sincère accepté par Allah."
      },
      {
        heading: "Nuh / Noé ('alayhi salam) - La persévérance",
        text: "A appelé son peuple pendant 950 ans avec patience inébranlable avant la construction de l'Arche et le Déluge."
      },
      {
        heading: "Ibrahim / Abraham ('alayhi salam) - L'ami intime d'Allah (Khalilullah)",
        text: "Champion du monothéisme pur (Hanif), bâtisseur de la Kaaba avec son fils Ismaïl et modèle de soumission absolue."
      },
      {
        heading: "Moussa / Moïse ('alayhi salam) - Kalimullah",
        text: "A qui Allah a parlé directement, guidant les Enfants d'Israël hors de la tyrannie de Pharaon grâce aux miracles divins."
      },
      {
        heading: "Muhammad (ﷺ) - Le Sceau des Prophètes",
        text: "Envoyé comme une miséricorde pour l'univers, porteur du Coran éternel et exemple parfait de moralité et d'amour."
      }
    ]
  },

  // 5. Les Noms d'Allah
  {
    id: 'noms-allah',
    title: "Les Noms d'Allah (Al-Asma Al-Husna)",
    subtitle: 'Connaître son Créateur pour fortifier son amour et son recueillement',
    category: 'noms',
    icon: '🌟',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
    badge: 'Spiritualité',
    summary: "« C'est à Allah qu'appartiennent les plus beaux Noms. Invoquez-Le par ces Noms. » (Sourate Al-A'raf, 180)",
    quizCategoryTarget: 'Mélange',
    details: [
      {
        heading: "Ar-Rahman (الرَّحْمَنُ) & Ar-Rahim (الرَّحِيمُ)",
        text: "Le Tout-Miséricordieux et le Très-Miséricordieux : Sa miséricorde infinie embrasse toute chose dans ce monde et dans l'au-delà."
      },
      {
        heading: "Al-Malik (الْمَلِكُ) & Al-Quddus (الْقُدُّوسُ)",
        text: "Le Souverain absolu, le Pur et Exempt de tout défaut ou imperfection."
      },
      {
        heading: "As-Salam (السَّلَامُ)",
        text: "La Paix et la Source de toute quiétude, Celui qui préserve Ses créatures."
      },
      {
        heading: "Al-'Alim (الْعَلِيمُ) & Al-Hakim (الْحَكِيمُ)",
        text: "L'Omniscient dont rien n'échappe et le Sage dont chaque décret renferme une profonde sagesse."
      }
    ]
  }
];
