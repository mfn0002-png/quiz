/**
 * sourceResolverService.js
 *
 * Résolution déterministe des références scripturaires utilisées par la section
 * apprentissage. Contrairement à ragService, ce service ne fait aucune recherche
 * approximative : on demande un verset précis, on obtient ce verset.
 *
 * Le texte du Coran ne change jamais → cache Redis sans expiration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { adminDb } from '../config/firebaseAdmin.js';
import { redis } from '../config/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticSourcesPath = path.resolve(__dirname, '../../data/staticSources.json');

let localStaticSources = {};
try {
  if (fs.existsSync(staticSourcesPath)) {
    localStaticSources = JSON.parse(fs.readFileSync(staticSourcesPath, 'utf8'));
  }
} catch (err) {
  console.warn('⚠️ [Source Resolver] Impossible de lire staticSources.json:', err.message);
}

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const TIMEOUT_MS = 5000;
const EDITIONS = 'quran-uthmani,en.transliteration,fr.hamidullah';

/** Noms français des sourates, pour composer une citation lisible. */
const SURAH_NAMES = {
  2: 'Al-Baqarah',
  3: 'Âl \'Imrân',
  4: 'An-Nisâ\'',
  5: 'Al-Mâ\'idah',
  6: 'Al-An\'âm',
  7: 'Al-A\'râf',
  10: 'Yûnus',
  11: 'Hûd',
  12: 'Yûsuf',
  14: 'Ibrâhîm',
  15: 'Al-Hijr',
  17: 'Al-Isrâ\'',
  18: 'Al-Kahf',
  19: 'Maryam',
  20: 'Tâ-Hâ',
  21: 'Al-Anbiyâ\'',
  26: 'Ash-Shu\'arâ\'',
  27: 'An-Naml',
  28: 'Al-Qasas',
  29: 'Al-\'Ankabût',
  33: 'Al-Ahzâb',
  37: 'As-Sâffât',
  38: 'Sâd',
  39: 'Az-Zumar',
  41: 'Fussilat',
  46: 'Al-Ahqâf',
  47: 'Muhammad',
  48: 'Al-Fath',
  49: 'Adh-Dhâriyât',
  54: 'Al-Qamar',
  66: 'At-Tahrîm',
  68: 'Al-Qalam',
  69: 'Al-Hâqqah',
  71: 'Nûh',
  87: 'Al-A\'lâ',
  89: 'Al-Fajr',
};

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

async function fromCache(key) {
  try {
    if (!redis) return null;
    const hit = await redis.get(`source:${key}`);
    if (!hit) return null;
    const parsed = typeof hit === 'string' ? JSON.parse(hit) : hit;
    // Si c'est un verset du Coran et qu'il manque le champ phonétique mis à jour, on invalide l'ancien cache
    if (key.startsWith('quran') && !parsed?.phonetic) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn(`⚠️ [Source Resolver] Cache indisponible : ${err.message}`);
    return null;
  }
}

async function toCache(key, value) {
  try {
    if (!redis) return;
    // Pas de TTL : le texte scripturaire est immuable.
    await redis.set(`source:${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`⚠️ [Source Resolver] Écriture cache échouée : ${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Coran                                                               */
/* ------------------------------------------------------------------ */

async function fetchAyah(surah, ayah) {
  const url = `${QURAN_API_BASE}/ayah/${surah}:${ayah}/editions/${EDITIONS}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`AlQuran Cloud a répondu ${response.status} pour ${surah}:${ayah}`);
  }

  const payload = await response.json();
  const editions = payload?.data;

  if (!Array.isArray(editions) || editions.length < 2) {
    throw new Error(`Réponse inattendue pour ${surah}:${ayah}`);
  }

  const arabicEdition = editions.find(e => e.edition?.identifier === 'quran-uthmani');
  const transliterationEdition = editions.find(e => e.edition?.identifier === 'en.transliteration');
  const frenchEdition = editions.find(e => e.edition?.language === 'fr');

  return {
    arabic: arabicEdition?.text ?? '',
    phonetic: transliterationEdition?.text ?? '',
    translation: frenchEdition?.text ?? '',
    surahName: arabicEdition?.surah?.englishName ?? SURAH_NAMES[surah] ?? `Sourate ${surah}`,
  };
}

async function resolveQuran({ surah, ayah, ayahEnd }) {
  const last = ayahEnd && ayahEnd > ayah ? ayahEnd : ayah;

  // Les plages restent volontairement courtes : au-delà on cite la référence,
  // on ne recopie pas des pages entières.
  if (last - ayah > 9) {
    throw new Error('Plage de versets trop large (10 maximum)');
  }

  const numbers = [];
  for (let n = ayah; n <= last; n += 1) numbers.push(n);

  const parts = await Promise.all(numbers.map(n => fetchAyah(surah, n)));

  const surahName = SURAH_NAMES[surah] ?? parts[0]?.surahName ?? `Sourate ${surah}`;
  const range = last === ayah ? `${ayah}` : `${ayah}-${last}`;

  return {
    ref: { kind: 'quran', surah, ayah, ...(ayahEnd ? { ayahEnd } : {}) },
    arabic: parts.map(p => p.arabic).join(' '),
    phonetic: parts.map(p => p.phonetic).filter(Boolean).join(' '),
    translation: parts.map(p => p.translation).join(' '),
    citation: `${surahName} ${surah}:${range}`,
  };
}

/* ------------------------------------------------------------------ */
/* Noms d'Allah                                                        */
/* ------------------------------------------------------------------ */

/**
 * Les 99 noms forment une liste fermée et stable : idéale pour l'ingestion.
 * À appeler une fois par un script d'ingestion, puis à stocker dans Firestore —
 * pas à la volée à chaque affichage.
 */
export async function fetchAsmaAlHusna(index) {
  const response = await fetch(`${ASMA_API}/${index}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Aladhan a répondu ${response.status}`);

  const payload = await response.json();
  const entry = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;

  return {
    number: entry?.number,
    arabic: entry?.name,
    transliteration: entry?.transliteration,
    meaning: entry?.en?.meaning,
  };
}

/* ------------------------------------------------------------------ */
/* Point d'entrée                                                      */
/* ------------------------------------------------------------------ */

/** Parse une clé du type `quran:11:50-60`, `hadith:bukhari:2:13`, `dua:hisn_042`. */
export function parseRefKey(key) {
  const [kind, ...rest] = key.split(':');

  if (kind === 'quran') {
    const [surahRaw, ayahRaw] = rest;
    const [ayahRaw2, endRaw] = (ayahRaw || '').split('-');
    const surah = Number(surahRaw);
    const ayah = Number(ayahRaw2);

    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;
    if (!Number.isInteger(ayah) || ayah < 1) return null;

    const ayahEnd = endRaw ? Number(endRaw) : undefined;
    if (endRaw && (!Number.isInteger(ayahEnd) || ayahEnd < ayah)) return null;

    return { kind: 'quran', surah, ayah, ...(ayahEnd ? { ayahEnd } : {}) };
  }

  if (kind === 'hadith') {
    const [collectionName, bookNumber, hadithNumber] = rest;
    if (!['bukhari', 'muslim'].includes(collectionName)) return null;
    if (!bookNumber || !hadithNumber) return null;
    return { kind: 'hadith', collection: collectionName, bookNumber, hadithNumber };
  }

  if (kind === 'dua') {
    const [hisnId] = rest;
    return hisnId ? { kind: 'dua', hisnId } : null;
  }

  return null;
}

export async function resolveSourceRef(key) {
  // 1. Cache Redis
  const cached = await fromCache(key);
  if (cached) return cached;

  // 2. Base locale statique backend (0 ms)
  if (localStaticSources[key]) {
    await toCache(key, localStaticSources[key]);
    return localStaticSources[key];
  }

  // 3. Firestore collection 'sources'
  try {
    const firestoreKey = key.replace(/[:/]/g, '_');
    if (adminDb) {
      const snap = await adminDb.collection('sources').doc(firestoreKey).get();
      if (snap.exists) {
        const data = snap.data();
        await toCache(key, data);
        return data;
      }
    } else {
      const snap = await getDoc(doc(db, 'sources', firestoreKey));
      if (snap.exists()) {
        const data = snap.data();
        await toCache(key, data);
        return data;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Source Resolver] Échec lecture Firestore : ${err.message}`);
  }

  // 4. Résolution à la volée via API
  const ref = parseRefKey(key);
  if (!ref) {
    const err = new Error(`Référence invalide : ${key}`);
    err.statusCode = 400;
    throw err;
  }

  let resolved;
  switch (ref.kind) {
    case 'quran':
      resolved = await resolveQuran(ref);
      break;
    case 'hadith':
      throw Object.assign(new Error('Résolution de hadith par référence non encore implémentée'), { statusCode: 501 });
    case 'dua':
      throw Object.assign(new Error('Résolution de dua par identifiant non encore implémentée'), { statusCode: 501 });
    default:
      throw Object.assign(new Error('Type de référence inconnu'), { statusCode: 400 });
  }

  // 5. Sauvegarde en cache Redis et Firestore
  await toCache(key, resolved);
  try {
    const firestoreKey = key.replace(/[:/]/g, '_');
    if (adminDb) {
      await adminDb.collection('sources').doc(firestoreKey).set(resolved, { merge: true });
    } else {
      await setDoc(doc(db, 'sources', firestoreKey), resolved, { merge: true });
    }
  } catch (err) {
    console.warn(`⚠️ [Source Resolver] Échec écriture Firestore : ${err.message}`);
  }

  return resolved;
}