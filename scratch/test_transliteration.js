/**
 * Arabic Transliteration Utility (Phonétique du texte Arabe en Alphabet Latin)
 */
function transliterateArabic(text) {
  if (!text) return '';

  // Nettoyage et remplacements des expressions religieuses fréquentes
  let s = text;
  s = s.replace(/صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ|صلى الله عليه وسلم/g, ' (ṣallā-llāhu ‘alayhi wa-sallam) ');
  s = s.replace(/رَضِيَ اللَّهُ عَنْهُ|رضي الله عنه/g, ' (raḍiya-llāhu ‘anhu) ');
  s = s.replace(/رَضِيَ اللَّهُ عَنْهَا|رضي الله عنها/g, ' (raḍiya-llāhu ‘anhā) ');

  const charMap = {
    'أ': 'a', 'إ': 'i', 'آ': 'ā', 'ء': "'", 'ا': 'a', 'ٰ': 'ā', 'ى': 'ā',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh',
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

    // Shadda (gemination)
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

  // Nettoyage des espaces doubles
  return res.replace(/\s+/g, ' ').trim();
}

const sampleArabic = "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ مُحَمَّدٍ، قَالَ حَدَّثَنِي عَبْدُ الصَّمَدِ، قَالَ حَدَّثَنِي شُعْبَةُ، قَالَ حَدَّثَنِي أَبُو بَكْرِ بْنُ حَفْصٍ، قَالَ سَمِعْتُ أَبَا سَلَمَةَ، يَقُولُ دَخَلْتُ أَنَا وَأَخُو، عَائِشَةَ عَلَى عَائِشَةَ فَسَأَلَهَا أَخُوهَا عَنْ غُسْلِ النَّبِيِّ، صلى الله عليه وسلم";

console.log("Input Arabic:\n", sampleArabic);
console.log("\nPhonétique:\n", transliterateArabic(sampleArabic));
