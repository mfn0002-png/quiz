/**
 * duaService.js
 *
 * Service d'invocations (Du'âs) authentiques via UmmahAPI (avec clé API)
 * et base de secours locale (Hisn al-Muslim / La Citadelle du Musulman).
 *
 * Fournit les textes en Arabe (avec diacritiques), Phonétique, Français et Références authentiques.
 */

const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Cache mémoire
const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

// Base de données locale de secours de la Citadelle du Musulman (Hisn al-Muslim)
const HISN_AL_MUSLIM_DATABASE = [
  {
    id: 'habit_neuf',
    category: 'clothing',
    title: 'Invocation en mettant un vêtement neuf (Nouvel habit)',
    topicKeywords: ['habit', 'vêtement', 'vetement', 'nouvel', 'neuf', 'habiller', 'chemise', 'vêtements', 'habits', 'garment', 'clothing'],
    arabic: 'اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ',
    phonetic: "Allahumma laka-l-hamdu Anta kasawtanihi, as'aluka min khayrihi wa khayri ma suni'a lahu, wa a'udhu bika min sharrihi wa sharri ma suni'a lahu.",
    french: "Ô Allah ! À Toi la louange. C'est Toi qui m'en as revêtu. Je Te demande son bien et le bien pour lequel il a été conçu, et je cherche refuge auprès de Toi contre son mal et le mal pour lequel il a été conçu.",
    source: 'Abu Dawud (n° 4020), At-Tirmidhi (n° 1767) - Hadith Sahih'
  },
  {
    id: 'mettre_vetement',
    category: 'clothing',
    title: 'Invocation en mettant un vêtement',
    topicKeywords: ['habit', 'vêtement', 'vetement', 's\'habiller', 'habiller'],
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا (الثَّوْبَ) وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    phonetic: "Al-hamdu lillahi lladhi kasani hadha (ath-thawba) wa razaqanihi min ghayri hawlin minni wa la quwwatin.",
    french: "Louange à Allah qui m'a vêtu de ce (vêtement) et me l'a accordé sans force ni puissance de ma part.",
    source: 'Abu Dawud, At-Tirmidhi, Ibn Majah - Hadith Hasan'
  },
  {
    id: 'enlever_vetement',
    category: 'clothing',
    title: 'Invocation en se déshabillant',
    topicKeywords: ['déshabiller', 'enlever', 'habit', 'vêtement', 'vetement'],
    arabic: 'بِسْمِ اللَّهِ',
    phonetic: 'Bismillah.',
    french: 'Au nom d\'Allah.',
    source: 'At-Tirmidhi (n° 606) - Sahih Al-Jami'
  },
  {
    id: 'repas_avant',
    category: 'eating',
    title: 'Invocation avant de manger',
    topicKeywords: ['repas', 'manger', 'nourriture', 'table', 'avant de manger', 'boire'],
    arabic: 'بِسْمِ اللَّهِ',
    phonetic: 'Bismillah.',
    french: 'Au nom d\'Allah. (Si l\'on oublie au début : Bismillahi fi awwalihi wa akhirihi - Au nom d\'Allah au début et à la fin).',
    source: 'Abu Dawud (n° 3767), At-Tirmidhi (n° 1858)'
  },
  {
    id: 'repas_apres',
    category: 'eating',
    title: 'Invocation après le repas',
    topicKeywords: ['repas', 'manger', 'après repas', 'fin du repas', 'nourriture'],
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    phonetic: "Al-hamdu lillahi lladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwatin.",
    french: "Louange à Allah qui m'a nourri de cela et me l'a accordé sans force ni puissance de ma part.",
    source: 'Abu Dawud, At-Tirmidhi, Ibn Majah - Hadith Sahih'
  },
  {
    id: 'sommeil_avant',
    category: 'sleep',
    title: 'Invocation avant de dormir',
    topicKeywords: ['dormir', 'coucher', 'sommeil', 'lit', 'nuit'],
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    phonetic: "Bismika l-lahumma amutu wa ahya.",
    french: "En Ton nom, ô Allah, je meurs et je vis.",
    source: 'Sahih Al-Bukhari (n° 6324)'
  },
  {
    id: 'sommeil_reveil',
    category: 'sleep',
    title: 'Invocation au réveil',
    topicKeywords: ['réveil', 'reveil', 'lever', 'matin', 'sommeil'],
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    phonetic: "Al-hamdu lillahi lladhi ahyana ba'da ma amatana wa ilayhi n-nushur.",
    french: "Louange à Allah qui nous a rendu la vie après nous avoir fait mourir, et c'est vers Lui que se fera la résurrection.",
    source: 'Sahih Al-Bukhari (n° 6312), Sahih Muslim'
  },
  {
    id: 'sortie_maison',
    category: 'home',
    title: 'Invocation en sortant de la maison',
    topicKeywords: ['maison', 'sortir', 'sortie', 'demeure', 'déplacement'],
    arabic: 'بِسْمِ اللَّهِ ، تَوَكَّلْتُ عَلَى اللَّهِ ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ',
    phonetic: "Bismillahi, tawakkaltu 'alallahi, wa la hawla wa la quwwata illa billah.",
    french: "Au nom d'Allah, je m'en remets à Allah, et il n'y a de force ni de puissance qu'en Allah.",
    source: 'Abu Dawud (n° 5095), At-Tirmidhi (n° 3426)'
  },
  {
    id: 'entree_mosquee',
    category: 'mosque',
    title: 'Invocation en entrant à la mosquée',
    topicKeywords: ['mosquée', 'mosquee', 'prière', 'masjid', 'prier'],
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    phonetic: "Allahumma ftah li abwaba rahmatik.",
    french: "Ô Allah, ouvre-moi les portes de Ta miséricorde.",
    source: 'Sahih Muslim (n° 713)'
  },
  {
    id: 'voyage',
    category: 'travel',
    title: 'Invocation du voyageur (Transport / Voyage)',
    topicKeywords: ['voyage', 'voyager', 'transport', 'voiture', 'avion', 'route', 'déplacement'],
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    phonetic: "Subhana lladhi sakhkhara lana hadha wa ma kunna lahu muqrinitn, wa inna ila Rabbina la-munqalibun.",
    french: "Gloire à Celui qui a mis ceci à notre disposition alors que nous n'étions pas capables de le dompter. Et c'est vers notre Seigneur que nous retournerons.",
    source: 'Sahih Muslim (n° 1342), Sourate Az-Zukhruf (43:13-14)'
  },
  {
    id: 'souci_tristesse',
    category: 'anxiety',
    title: 'Invocation en cas de souci ou de tristesse',
    topicKeywords: ['souci', 'tristesse', 'peur', 'angoisse', 'épreuve', 'chagrin', 'difficulté'],
    arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ',
    phonetic: "Allahumma inni 'abduka, ibnu 'abdika, ibnu amatika, nasiyati biyadika, madin fiyya hukmuka, 'adlun fiyya qada'uka...",
    french: "Ô Allah, je suis Ton serviteur, fils de Ton serviteur, fils de Ta servante. Mon front est dans Ta main, Ton jugement s'accomplit sur moi, Ton décret à mon égard est juste...",
    source: 'Ahmad (1/391) - Hadith Sahih (Al-Albani)'
  }
];

/**
 * Traduit ou apparie les mots-clés FR vers la catégorie/thème des Duas
 */
function normalizeDuaQuery(topic) {
  if (!topic) return '';
  const clean = topic.toLowerCase().trim();
  
  if (clean.includes('habit') || clean.includes('vetement') || clean.includes('vêtement') || clean.includes('chemise') || clean.includes('s\'habiller')) {
    return 'clothing';
  }
  if (clean.includes('manger') || clean.includes('repas') || clean.includes('nourriture')) {
    return 'eating';
  }
  if (clean.includes('dormir') || clean.includes('sommeil') || clean.includes('coucher') || clean.includes('réveil') || clean.includes('reveil')) {
    return 'sleep';
  }
  if (clean.includes('voyage') || clean.includes('transport') || clean.includes('voiture')) {
    return 'travel';
  }
  if (clean.includes('mosquée') || clean.includes('mosquee') || clean.includes('masjid')) {
    return 'mosque';
  }
  if (clean.includes('souci') || clean.includes('tristesse') || clean.includes('angoisse') || clean.includes('peur')) {
    return 'anxiety';
  }
  return clean;
}

/**
 * Recherche des invocations authentiques (API UmmahAPI + fallback locale Hisn al-Muslim)
 *
 * @param {string} topic - Le thème recherché (ex: "nouvel habit", "voyage", "repas")
 * @param {number} limit - Nombre maximal d'invocations
 * @returns {Promise<Array<{title: string, arabic: string, phonetic: string, french: string, source: string}>>}
 */
export async function fetchDuas(topic, limit = 3) {
  if (!topic || topic === 'Mélange') return [];

  const normalizedTopic = normalizeDuaQuery(topic);
  const cacheKey = `dua:${normalizedTopic}:${limit}`;
  
  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      console.log(`📖 [Dua Service] Cache hit pour "${topic}"`);
      return entry.data;
    }
    cache.delete(cacheKey);
  }

  console.log(`📖 [Dua Service] Recherche d'invocations pour "${topic}"...`);

  // 1. Tenter la recherche dans la base locale authentique Hisn al-Muslim (réponse ultra rapide en français)
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const localMatches = HISN_AL_MUSLIM_DATABASE.filter(item => {
    if (item.category === normalizedTopic) return true;
    return item.topicKeywords.some(kw => topicWords.some(tw => kw.includes(tw) || tw.includes(kw)));
  });

  if (localMatches.length > 0) {
    const results = localMatches.slice(0, limit);
    console.log(`✅ [Dua Service - Base Locale] ${results.length} invocation(s) authentique(s) trouvée(s) pour "${topic}"`);
    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  }

  // 2. Fallback API UmmahAPI (https://ummahapi.com/api/duas)
  try {
    const apiKey = getApiKey();
    const url = `https://ummahapi.com/api/duas?apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.ok) {
      const json = await response.json();
      const rawDuas = json.data || json.duas || (Array.isArray(json) ? json : []);
      
      const matched = rawDuas.filter(d => {
        const cat = (d.category || '').toLowerCase();
        const title = (d.title || '').toLowerCase();
        const translit = (d.transliteration || '').toLowerCase();
        const trans = (d.translation || '').toLowerCase();
        return cat.includes(normalizedTopic) || title.includes(normalizedTopic) || translit.includes(normalizedTopic) || trans.includes(normalizedTopic);
      });

      const itemsToUse = (matched.length > 0 ? matched : rawDuas).slice(0, limit);
      const formattedApiResults = itemsToUse.map(d => ({
        title: d.title || 'Invocation',
        arabic: d.arabic || '',
        phonetic: d.transliteration || '',
        french: d.translation || '',
        source: d.source || 'Hisn al-Muslim'
      })).filter(d => d.arabic || d.french);

      if (formattedApiResults.length > 0) {
        console.log(`✅ [Dua Service - API UmmahAPI] ${formattedApiResults.length} invocation(s) trouvée(s) pour "${topic}"`);
        cache.set(cacheKey, { data: formattedApiResults, timestamp: Date.now() });
        return formattedApiResults;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Dua Service - API Externe] Échec ou timeout: ${err.message}`);
  }

  // 3. Fallback par défaut sur les 2 premières du'âs générales si rien trouvé
  const fallback = HISN_AL_MUSLIM_DATABASE.slice(0, Math.min(limit, 2));
  cache.set(cacheKey, { data: fallback, timestamp: Date.now() });
  return fallback;
}

/**
 * Formate un tableau de Duas en texte lisible pour injection dans le prompt RAG.
 *
 * @param {Array} duas - Tableau d'invocations issu de fetchDuas
 * @returns {string} Texte formaté des invocations
 */
export function formatDuas(duas) {
  if (!duas || duas.length === 0) return '';

  return duas
    .map(d => {
      let out = `• [Invocation - ${d.title}] (Source: ${d.source})\n`;
      if (d.arabic) out += `  Arabe : "${d.arabic}"\n`;
      if (d.phonetic) out += `  Phonétique : "${d.phonetic}"\n`;
      if (d.french) out += `  Traduction : "${d.french}"`;
      return out;
    })
    .join('\n\n');
}
