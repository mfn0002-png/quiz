/**
 * hadithService.js
 *
 * Service de recherche de hadiths via UmmahAPI (gratuit, sans clé API).
 * Fournit des hadiths authentiques pour enrichir le RAG de l'assistant.
 *
 * API : https://ummahapi.com/api/hadith/search?q={query}&limit={limit}
 * Collections : Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, etc.
 */

const API_BASE = 'https://ummahapi.com/api/hadith';
const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cache mémoire avec TTL
const cache = new Map();

function getCacheKey(topic, limit) {
  return `${topic}:${limit}`;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Traduction FR → EN pour les termes islamiques courants (l'API UmmahAPI fonctionne en anglais)
const FR_TO_EN_KEYWORDS = {
  'prière': 'prayer',
  'prieres': 'prayer',
  'salat': 'prayer',
  'jeûne': 'fasting',
  'jeune': 'fasting',
  'ramadan': 'ramadan',
  'zakat': 'zakat',
  'pèlerinage': 'pilgrimage',
  'hajj': 'pilgrimage',
  'coran': 'quran',
  'quran': 'quran',
  'hadith': 'hadith',
  'prophète': 'prophet',
  'prophetes': 'prophet',
  'muhammad': 'muhammad',
  'allah': 'allah',
  'foi': 'faith',
  'croyant': 'believer',
  'pardon': 'forgiveness',
  'miséricorde': 'mercy',
  'patience': 'patience',
  'sabr': 'patience',
  'charité': 'charity',
  'aumône': 'charity',
  'ablution': 'ablution',
  'woudou': 'ablution',
  'pilier': 'pillar',
  'piliers': 'pillars',
  'bismillah': 'bismillah',
  'tawhid': 'monotheism',
  'monothéisme': 'monotheism',
  'djinn': 'jinn',
  'anges': 'angels',
  'ange': 'angel',
  'paradis': 'paradise',
  'enfer': 'hell',
  'journée': 'day',
  'destin': 'fate',
  'qadr': 'fate',
  'salat': 'prayer',
  'imam': 'imam',
  'mosquée': 'mosque',
  'combattant': 'jihad',
  'jihad': 'jihad',
  'commerce': 'trade',
  'mariage': 'marriage',
  'divorce': 'divorce',
  'héritage': 'inheritance',
  'tahara': 'purification',
  'purification': 'purification',
  ' Hajj': 'hajj',
  'umra': 'umrah',
  'umrah': 'umrah',
  'pillars': 'pillars',
};

/**
 * Traduit les termes islamiques FR courants en anglais pour la recherche API.
 */
function translateToEnglish(topic) {
  const lower = topic.toLowerCase().trim();
  return FR_TO_EN_KEYWORDS[lower] || lower;
}

/**
 * Recherche des hadiths par mot-clé via UmmahAPI.
 *
 * @param {string} topic - Le thème ou mot-clé à rechercher
 * @param {number} limit - Nombre maximal de hadiths (défaut: 3)
 * @returns {Promise<Array<{collection: string, bookNumber: string, hadithNumber: string, narrator: string|null, text: string}>>}
 */
export async function fetchHadiths(topic, limit = 3) {
  if (!topic || topic === 'Mélange') return [];

  const cacheKey = getCacheKey(topic, limit);
  const cached = getFromCache(cacheKey);
  if (cached !== null) {
    console.log(`📖 [Hadith Service] Cache hit pour "${topic}"`);
    return cached;
  }

  console.log(`📖 [Hadith Service] Recherche de hadiths pour "${topic}" (limit: ${limit})...`);

  try {
    const searchQuery = translateToEnglish(topic);
    const url = `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`⚠️ [Hadith Service] Erreur HTTP ${response.status} pour "${topic}"`);
      return [];
    }

    const data = await response.json();
    const rawHadiths = data.data?.hadiths || data.data || data.hadiths || [];
    const hadiths = (Array.isArray(rawHadiths) ? rawHadiths : [])
      .slice(0, limit)
      .map(h => ({
        collection: h.collection_name || h.collection || 'Inconnu',
        bookNumber: h.bookNumber || h.book_number || '',
        hadithNumber: h.hadithnumber || h.hadithNumber || h.hadith_number || '',
        narrator: h.narrator || h.chain || null,
        text: (typeof h.english === 'string' ? h.english : h.english?.text) || h.text || h.body || '',
      }))
      .filter(h => h.text); // Filtrer les hadiths sans texte

    console.log(`✅ [Hadith Service] ${hadiths.length} hadith(s) trouvé(s) pour "${topic}"`);
    setCache(cacheKey, hadiths);
    return hadiths;
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      console.warn(`⚠️ [Hadith Service] Timeout pour "${topic}" (${TIMEOUT_MS}ms)`);
    } else {
      console.warn(`⚠️ [Hadith Service] Erreur pour "${topic}": ${err.message}`);
    }
    return [];
  }
}

/**
 * Formate des hadiths en texte lisible pour injection dans le prompt RAG.
 *
 * @param {Array} hadiths - Tableau de hadiths (issu de fetchHadiths)
 * @returns {string} Texte formaté des hadiths
 */
export function formatHadiths(hadiths) {
  if (!hadiths || hadiths.length === 0) return '';

  return hadiths
    .map(h => {
      const source = `${h.collection}${h.bookNumber ? ` ${h.bookNumber}` : ''}${h.hadithNumber ? `:${h.hadithNumber}` : ''}`;
      const narrator = h.narrator ? ` (Narrateur: ${h.narrator})` : '';
      return `• [Hadith - ${source}]${narrator} : "${h.text}"`;
    })
    .join('\n');
}
