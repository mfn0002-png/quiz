/**
 * ragService.js
 *
 * Service de Retrieval-Augmented Generation (RAG) pour le Quiz Islamique.
 * Fournit du contexte authentique (Coran et Hadiths avec références exactes)
 * en combinant une base locale rapide et un fallback API REST.
 */

// Dataset local de références islamiques authentiques
const ISLAMIC_KNOWLEDGE_BASE = {
  'Piliers de l\'Islam': [
    {
      source: 'Coran 2:43',
      text: 'Et accomplissez la Salât et acquittez la Zakât, et inclinez-vous avec ceux qui s\'inclinent.',
      topic: 'Salat et Zakat'
    },
    {
      source: 'Hadith (Bukhari & Muslim - Hadith Arba\'in #3)',
      text: 'L\'Islam est bâti sur cinq piliers : l\'attestation qu\'il n\'y a de divinité digne d\'adoration qu\'Allah et que Muhammad est Son messager, l\'accomplissement de la prière, l\'acquittement de la Zakat, le pèlerinage à la Maison et le jeûne du mois de Ramadan.',
      topic: '5 Piliers'
    }
  ],
  'Coran': [
    {
      source: 'Coran 17:88',
      text: 'Dis : Si les hommes et les djinns s\'unissaient pour produire quelque chose de semblable à ce Coran, ils ne sauraient produire rien de semblable, même s\'ils se soutenaient les uns les autres.',
      topic: 'Inimitabilité du Coran'
    },
    {
      source: 'Coran 15:9',
      text: 'En vérité c\'est Nous qui avons fait descendre le Rappel (le Coran), et c\'est Nous qui en sommes le gardien.',
      topic: 'Préservation du Coran'
    },
    {
      source: 'Coran 114 (An-Nas)',
      text: 'Dernière sourate du Coran, composée de 6 versets. Le Coran compte 114 sourates et 6236 versets.',
      topic: 'Structure du Coran'
    }
  ],
  'Prophètes': [
    {
      source: 'Coran 4:163',
      text: 'Nous t\'avons fait une révélation comme Nous fîmes une révélation à Nuh (Noé) et aux prophètes après lui. Et Nous avons fait une révélation à Ibrahim, Isma\'il, Ishaq, Ya\'qub, les Tribus, \'Isa, Ayyub, Yunus, Harun et Sulayman, et Nous avons donné le Zabur à Dawud.',
      topic: 'Chaîne des Prophètes'
    },
    {
      source: 'Coran 33:40',
      text: 'Muhammad n\'a jamais été le père de l\'un de vos hommes, mais le messager d\'Allah et le dernier des prophètes.',
      topic: 'Sceau des Prophètes'
    },
    {
      source: 'Coran 21:107',
      text: 'Et Nous ne t\'avons envoyé qu\'en miséricorde pour l\'univers.',
      topic: 'Mission du Prophète Muhammad (saws)'
    }
  ],
  'Histoire islamique': [
    {
      source: 'Événement de l\'Hégire (622)',
      text: 'L\'émigration du Prophète (saws) et de ses compagnons de La Mecque vers Médine (Yathrib) marque le début du calendrier hégirien (A.H.), instauré sous le califat d\'Umar ibn al-Khattab.',
      topic: 'Hégire et Calendrier'
    },
    {
      source: 'Bataille de Badr (2 A.H. / 624)',
      text: 'Première grande bataille victorieuse des musulmans à Badr, mentionnée dans la sourate Al-Anfal (8:9-12).',
      topic: 'Batailles majeures'
    },
    {
      source: 'Les 4 Califes Bien Guidés (Al-Khulafa ar-Rashidun)',
      text: '1. Abu Bakr As-Siddiq, 2. Umar ibn al-Khattab, 3. Uthman ibn Affan, 4. Ali ibn Abi Talib (qu\'Allah les agrée tous).',
      topic: 'Califat'
    }
  ],
  'Pratiques': [
    {
      source: 'Hadith (Muslim #223)',
      text: 'La purification (At-Tahour) est la moitié de la foi.',
      topic: 'Purification & Woudou'
    },
    {
      source: 'Coran 2:183',
      text: 'Ô les croyants ! On vous a prescrit le Jeûne (As-Siyam) comme on l\'a prescrit à ceux qui vous ont précédés, ainsi atteindrez-vous la piété.',
      topic: 'Jeûne de Ramadan'
    },
    {
      source: 'Coran 3:97',
      text: 'Et c\'est un devoir envers Allah pour les gens qui ont les moyens, d\'aller faire le pèlerinage de la Maison (Hajj).',
      topic: 'Hajj'
    }
  ]
};

/**
 * Nettoie le nom d'un thème pour la recherche sémantique API
 * (ex: "la patience (As-Sabr)" -> "patience")
 */
function cleanSearchKeyword(topic) {
  if (!topic) return '';
  return topic
    .replace(/\(.*?\)/g, '')                         // Supprime tout ce qui est entre parenthèses
    .replace(/^(la|le|les|l'|du|de|des)\s+/i, '')    // Supprime les articles de début
    .trim();
}

/**
 * Recherche des sources authentiques pour un thème donné.
 * @param {string} topic - Le thème recherché
 * @returns {Promise<string>} Résumé du contexte enrichi de sources
 */
export async function fetchIslamicRAGContext(topic) {
  if (!topic || topic === 'Mélange') {
    return 'Contexte général : Le quiz couvre l\'ensemble des sciences islamiques (Foi, Coran, Prophètes, Histoire, Jurisprudence et Pratiques).';
  }

  // 1. Chercher dans la base locale d'abord (ultra rapide)
  const localRefs = ISLAMIC_KNOWLEDGE_BASE[topic] || [];
  if (localRefs.length > 0) {
    const formatted = localRefs
      .map(r => `• [${r.source}] (${r.topic}) : "${r.text}"`)
      .join('\n');
    console.log(`📖 [RAG Service] ${localRefs.length} références locales trouvées pour "${topic}"`);
    return `Références authentiques pour "${topic}" :\n${formatted}`;
  }

  // 2. Nettoyage du terme de recherche pour l'API REST
  const searchKeyword = cleanSearchKeyword(topic);
  console.log(`🌐 [RAG Service] Interrogation de l'API alquran.cloud pour : "${topic}" (mot-clé: "${searchKeyword}")...`);

  // 3. Fallback API REST (api.alquran.cloud) si thème spécifique
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(searchKeyword)}/all/fr.hamidullah`, {
      signal: AbortSignal.timeout(3000), // Timeout 3s
    });

    if (response.ok) {
      const data = await response.json();
      const matches = data.data?.matches?.slice(0, 3) || [];
      if (matches.length > 0) {
        const apiFormatted = matches
          .map(m => `• [Sourate ${m.surah.englishName} (${m.surah.number}):${m.numberInSurah}] : "${m.text.trim()}"`)
          .join('\n');
        console.log(`🌐 [RAG Service] ${matches.length} versets récupérés via API alquran.cloud pour "${topic}"`);
        return `Versets de référence pour "${topic}" :\n${apiFormatted}`;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [RAG Service] Échec API externe (${err.message}), fallback sur contexte générique.`);
  }

  // 4. Contexte par défaut
  return `Contexte pour "${topic}" : Utiliser les notions authentiques reconnues du Coran et de la Sunnah authentique.`;
}
