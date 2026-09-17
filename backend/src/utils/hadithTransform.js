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
 * Traduit un texte anglais en français via l'API AndroidTranslate avec cache mémoire.
 */
export async function translateEnToFr(englishText) {
  if (!englishText || typeof englishText !== 'string') return '';
  const trimmed = englishText.trim();
  if (!trimmed) return '';

  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/t?client=at&sl=en&tl=fr&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AndroidTranslate/5.3.0.RC02.130440794',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return trimmed;
    const json = await res.json();
    const translated = Array.isArray(json) ? json[0] : trimmed;
    const result = typeof translated === 'string' && translated ? translated : trimmed;

    translationCache.set(trimmed, result);
    return result;
  } catch (err) {
    console.warn(`[HadithTransform] Erreur traduction FR: ${err.message}`);
    return trimmed;
  }
}
