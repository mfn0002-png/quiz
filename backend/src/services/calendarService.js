/**
 * calendarService.js
 *
 * Service du calendrier hégirien (musulman) via UmmahAPI avec fallback Intl.
 * Fournit la date hégirienne exacte et les équivalences grégoriennes.
 */

const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

/**
 * Récupère la date hégirienne courante ou spécifique.
 *
 * @returns {Promise<{ hijriDate: string, gregorianDate: string, day: string, month: string, year: string, note: string }>}
 */
export async function fetchHijriCalendar() {
  const todayKey = new Date().toISOString().split('T')[0];
  if (cache.has(todayKey)) {
    console.log(`📖 [Calendar Service] Cache hit pour la date du jour (${todayKey})`);
    return cache.get(todayKey);
  }

  console.log(`📅 [Calendar Service] Récupération de la date hégirienne...`);

  const now = new Date();
  const gregorianDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Fallback avec l'Intl natif de Node.js
  let localHijri = '';
  try {
    localHijri = new Intl.DateTimeFormat('fr-FR-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(now);
  } catch {
    localHijri = '19 Safar 1448 AH';
  }

  try {
    const apiKey = getApiKey();
    const url = `https://ummahapi.com/api/hijri-date?apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.ok) {
      const data = await response.json();
      const hijri = data.data || data.hijri || {};
      const formatted = {
        hijriDate: hijri.date || hijri.formatted || `${hijri.day || ''} ${hijri.month?.en || hijri.month || ''} ${hijri.year || ''} AH`.trim() || localHijri,
        gregorianDate,
        day: String(hijri.day || ''),
        month: hijri.month?.en || hijri.month?.fr || 'Safar',
        year: String(hijri.year || '1448'),
        note: '💡 À noter : La date islamique peut varier d’un jour selon la méthode utilisée (calcul astronomique ou observation locale du croissant lunaire).'
      };

      console.log(`✅ [Calendar Service] Date hégirienne récupérée : ${formatted.hijriDate}`);
      cache.set(todayKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn(`⚠️ [Calendar Service] Échec API (${err.message}), utilisation du fallback Intl.`);
  }

  const fallbackResult = {
    hijriDate: localHijri,
    gregorianDate,
    day: '',
    month: '',
    year: '1448',
    note: '💡 À noter : La date islamique peut varier d’un jour selon la méthode utilisée (calcul astronomique ou observation locale du croissant lunaire).'
  };
  cache.set(todayKey, fallbackResult);
  return fallbackResult;
}

/**
 * Formate la date hégirienne en texte lisible.
 */
export function formatHijriCalendar(calendarData) {
  if (!calendarData) return '';
  return `📅 **Date Hégirienne (Calendrier Musulman)** :\n` +
    `• **Date hégirienne** : ${calendarData.hijriDate}\n` +
    `• **Date grégorienne** : ${calendarData.gregorianDate}\n\n` +
    `${calendarData.note}`;
}
