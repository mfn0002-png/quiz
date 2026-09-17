/**
 * Utility for Hadith Text Processing:
 * 1. Arabic Transliteration (Phonétique Arabe -> Latin)
 * 2. Automatic English -> French Translation with caching
 */

const translationCache = new Map();

/**
 * Translitère le texte arabe avec diacritiques en phonétique latine lisible.
 */
export function transliterateArabic(text) {
  if (!text) return '';

  let s = text;
  // Expressions religieuses fréquentes
  s = s.replace(/صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ|صلى الله عليه وسلم/g, ' (ṣallā-llāhu ‘alayhi wa-sallam) ');
  s = s.replace(/رَضِيَ اللَّهُ عَنْهُ|رضي الله عنه/g, ' (raḍiya-llāhu ‘anhu) ');
  s = s.replace(/رَضِيَ اللَّهُ عَنْهَا|رضي الله عنها/g, ' (raḍiya-llāhu ‘anhā) ');

  const charMap = {
    'أ': 'a', 'إ': 'i', 'آ': 'ā', 'ء': "'", 'ا': 'a', 'ٰ': 'ā', 'ى': 'ā',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'dj', 'ح': 'ḥ', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': '‘', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ة': 'h',
    '\u064E': 'a', // Fatha
    '\u064F': 'u', // Damma
    '\u0650': 'i', // Kasra
    '\u0652': '',  // Sukun
    '\u064B': 'an', // Tanwin Fath
    '\u064C': 'un', // Tanwin Damm
    '\u064D': 'in', // Tanwin Kasr
  };

  let res = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    // Shadda (doublement de la consonne)
    if (ch === '\u0651' && res.length > 0) {
      const prevChar = res[res.length - 1];
      if (/[a-zA-Zḥṣḍṭẓ‘]/.test(prevChar)) {
        res += prevChar;
      }
      continue;
    }

    if (charMap[ch] !== undefined) {
      res += charMap[ch];
    } else {
      res += ch;
    }
  }

  // Amélioration de la lisibilité des liaisons courantes
  res = res
    .replace(/al-([\s]+)/g, 'al-')
    .replace(/aabuw/g, 'abū')
    .replace(/aanaa/g, 'anā')
    .replace(/(\s+)aa/g, '$1ā')
    .replace(/\s+/g, ' ')
    .trim();

  return res.length > 0 ? res.charAt(0).toUpperCase() + res.slice(1) : res;
}

/**
 * Traduit un texte anglais en français via MyMemory API (gratuit & rapide) avec cache mémoire.
 */
export async function translateEnToFr(englishText) {
  if (!englishText || typeof englishText !== 'string') return '';
  const trimmed = englishText.trim();
  if (!trimmed) return '';

  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed);
  }

  try {
    // Découpage si le texte est long (MyMemory accepte ~500 caractères par segment)
    const chunks = trimmed.match(/.{1,450}(\s+|$)/g) || [trimmed];
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.trim())}&langpair=en|fr`;
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (!res.ok) return chunk;
        const data = await res.json();
        const translated = data.responseData?.translatedText;
        return translated && !translated.startsWith('QUERY LENGTH') ? translated : chunk;
      })
    );

    const fullFr = translatedChunks.join(' ');
    translationCache.set(trimmed, fullFr);
    return fullFr;
  } catch (err) {
    console.warn(`[HadithTransform] Erreur traduction FR: ${err.message}`);
    // En cas de timeout ou erreur réseau, on retourne l'anglais original
    return trimmed;
  }
}
