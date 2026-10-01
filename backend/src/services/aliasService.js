/**
 * aliasService.js
 *
 * Service de gestion dynamique des alias et synonymes scripturaires (Prophètes, Notions).
 * Stocké dans Firebase Firestore (`settings/aliases`) avec fallback mémoire / JSON.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { adminDb } from '../config/firebaseAdmin.js';

export const DEFAULT_PROPHET_ALIASES = [
  { canonical: 'Idris', aliases: ['idriss', 'idris', 'edris', 'إدريس'] },
  { canonical: 'Moïse', aliases: ['moussa', 'musa', 'moïse', 'moise', 'موسى'] },
  { canonical: 'Jésus', aliases: ['issa', 'isa', 'jesus', 'fils de marie', 'عيسى', 'al-massih'] },
  { canonical: 'Jonas', aliases: ['younous', 'yunus', 'younes', 'dhun-nun', 'dhun nun', 'يونس'] },
  { canonical: 'Joseph', aliases: ['youssouf', 'youssef', 'yusuf', 'youcef', 'يوسف'] },
  { canonical: 'Abraham', aliases: ['ibrahim', 'abraham', 'ibraheem', 'إبراهيم', 'khalil'] },
  { canonical: 'Noé', aliases: ['nouh', 'nuh', 'noe', 'نوح'] },
  { canonical: 'Salomon', aliases: ['soulayman', 'sulayman', 'souleyman', 'salomon', 'سليمان'] },
  { canonical: 'David', aliases: ['daoud', 'dawud', 'david', 'داود'] },
  { canonical: 'Job', aliases: ['ayoub', 'ayyub', 'job', 'أيوب'] },
  { canonical: 'Jacob', aliases: ['yacoub', 'yaqub', 'jacob', 'yaacov', 'يعقوب', 'israël', 'israel'] },
  { canonical: 'Aaron', aliases: ['haroun', 'harun', 'aaron', 'هارون'] },
  { canonical: 'Ismaël', aliases: ['ismail', 'ismael', 'isma\'il', 'إسماعيل'] },
  { canonical: 'Isaac', aliases: ['ishaq', 'isaac', 'ishak', 'إسحاق'] },
  { canonical: 'Zacharie', aliases: ['zakariya', 'zacharie', 'zakaria', 'زكريا'] },
  { canonical: 'Jean', aliases: ['yahya', 'jean', 'jean-baptiste', 'يحيى'] },
  { canonical: 'Adam', aliases: ['adam', 'آدم'] },
  { canonical: 'Houd', aliases: ['hud', 'houd', 'هود'] },
  { canonical: 'Salih', aliases: ['salih', 'saleh', 'صالح'] },
  { canonical: 'Chuaïb', aliases: ['chouayb', 'chuaib', 'chouaib', 'jethro', 'شعيب'] },
  { canonical: 'Elie', aliases: ['ilyas', 'ilyass', 'elie', 'elias', 'إلياس'] },
  { canonical: 'Élisée', aliases: ['al-yasa', 'alyasa', 'elisée', 'elisee', 'اليسع'] },
  { canonical: 'Dhul-Kifl', aliases: ['dhul-kifl', 'dhul kifl', 'doul-kifl', 'dulkifl', 'ذا الكفل'] },
  { canonical: 'Muhammad', aliases: ['mohammed', 'muhammad', 'mohamed', 'ahmad', 'ahmed', 'محمد', 'أحمد'] },
];

let cachedLookup = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Construit une Map de recherche rapide à partir de la liste des alias
 * @param {Array<{ canonical: string, aliases: string[] }>} list 
 * @returns {Map<string, string[]>} Map alias (minuscule) -> [termes de recherche]
 */
function buildLookupMap(list) {
  const map = new Map();
  for (const item of list) {
    const terms = Array.from(new Set([item.canonical, ...item.aliases]));
    for (const alias of item.aliases) {
      const cleanAlias = alias.toLowerCase().trim();
      map.set(cleanAlias, terms);
    }
    map.set(item.canonical.toLowerCase().trim(), terms);
  }
  return map;
}

/**
 * Récupère les alias depuis Firestore (avec fallback et cache mémoire)
 * @returns {Promise<Map<string, string[]>>}
 */
export async function getAliasesMap() {
  const now = Date.now();
  if (cachedLookup && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedLookup;
  }

  let list = DEFAULT_PROPHET_ALIASES;

  try {
    if (adminDb) {
      const snap = await adminDb.collection('settings').doc('aliases').get();
      if (snap.exists && Array.isArray(snap.data()?.prophets)) {
        list = snap.data().prophets;
      } else {
        // Initialisation automatique du document dans Firestore s'il n'existe pas
        await adminDb.collection('settings').doc('aliases').set({
          prophets: DEFAULT_PROPHET_ALIASES,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } else {
      const snap = await getDoc(doc(db, 'settings', 'aliases'));
      if (snap.exists() && Array.isArray(snap.data()?.prophets)) {
        list = snap.data().prophets;
      }
    }
  } catch (err) {
    console.warn(`ℹ️ [Alias Service] Lecture Firestore (fallback par défaut actif) : ${err.message}`);
  }

  cachedLookup = buildLookupMap(list);
  lastFetchTime = now;
  return cachedLookup;
}

/**
 * Trouve les termes de recherche pour un mot donné (ex: 'idriss' -> ['Idris', 'idriss', 'edris'])
 * @param {string} word 
 * @returns {Promise<string[]>}
 */
export async function getSearchAliasesForWord(word) {
  if (!word || typeof word !== 'string') return [];
  const clean = word.toLowerCase().trim();
  const lookup = await getAliasesMap();
  return lookup.get(clean) || [word];
}

/**
 * Sauvegarde une nouvelle liste d'alias dans Firestore
 * @param {Array<{ canonical: string, aliases: string[] }>} newAliases 
 */
export async function saveProphetAliases(newAliases) {
  if (!Array.isArray(newAliases)) throw new Error('Liste d\'alias invalide.');
  
  if (adminDb) {
    await adminDb.collection('settings').doc('aliases').set({
      prophets: newAliases,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await setDoc(doc(db, 'settings', 'aliases'), {
      prophets: newAliases,
      updatedAt: new Date().toISOString(),
    });
  }

  cachedLookup = buildLookupMap(newAliases);
  lastFetchTime = Date.now();
  console.log(`✅ [Alias Service] ${newAliases.length} groupes d'alias sauvegardés dans Firestore (settings/aliases).`);
}
