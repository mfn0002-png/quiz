/**
 * prayerService.js
 *
 * Service d'horaires de prières musulmanes via UmmahAPI.
 * Fournit les heures de Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha pour une ville ou coordonnées GPS.
 */

const TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const cache = new Map();

function getApiKey() {
  return process.env.UMMAH_API_KEY || 'umh_66afc20db0ba0e06c689383759f1e7ef872852e9';
}

// Coordonnées approximatives des grandes villes francophones
const CITY_COORDINATES = {
  paris: { lat: 48.8566, lng: 2.3522 },
  lyon: { lat: 45.7640, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
  lille: { lat: 50.6292, lng: 3.0573 },
  toulouse: { lat: 43.6047, lng: 1.4442 },
  bordeaux: { lat: 44.8378, lng: -0.5792 },
  bruxelles: { lat: 50.8503, lng: 4.3517 },
  genève: { lat: 46.2044, lng: 6.1432 },
  casablanca: { lat: 33.5731, lng: -7.5898 },
  rabat: { lat: 34.0209, lng: -6.8416 },
  tunis: { lat: 36.8065, lng: 10.1815 },
  alger: { lat: 36.7538, lng: 3.0588 },
  dakar: { lat: 14.7167, lng: -17.4677 },
  abidjan: { lat: 5.3600, lng: -4.0083 },
};

/**
 * Récupère les heures de prière musulmanes pour une ville ou des coordonnées.
 *
 * @param {{ city?: string, latitude?: number, longitude?: number }} params
 * @returns {Promise<{ city: string, date: string, timings: Object }>}
 */
export async function fetchPrayerTimes({ city = 'Paris', latitude, longitude }) {
  const cleanCity = (city || 'Paris').trim().toLowerCase();
  const coords = (latitude && longitude)
    ? { lat: latitude, lng: longitude }
    : (CITY_COORDINATES[cleanCity] || CITY_COORDINATES.paris);

  const cacheKey = `prayer:${coords.lat.toFixed(2)}:${coords.lng.toFixed(2)}`;
  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      console.log(`📖 [Prayer Service] Cache hit pour prières (${city})`);
      return entry.data;
    }
    cache.delete(cacheKey);
  }

  console.log(`🕌 [Prayer Service] Recherche des heures de prière pour "${city}" (${coords.lat}, ${coords.lng})...`);

  try {
    const apiKey = getApiKey();
    const url = `https://ummahapi.com/api/prayer-times?lat=${coords.lat}&lng=${coords.lng}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.ok) {
      const data = await response.json();
      const rawTimings = data.data?.timings || data.timings || data.data || {};
      
      const result = {
        city: city.charAt(0).toUpperCase() + city.slice(1),
        date: data.data?.date?.readable || new Date().toLocaleDateString('fr-FR'),
        timings: {
          Fajr: rawTimings.Fajr || '05:30',
          Sunrise: rawTimings.Sunrise || '07:00',
          Dhuhr: rawTimings.Dhuhr || '13:30',
          Asr: rawTimings.Asr || '16:45',
          Maghrib: rawTimings.Maghrib || '19:45',
          Isha: rawTimings.Isha || '21:15',
        }
      };

      console.log(`✅ [Prayer Service] Horaires récupérés avec succès pour ${result.city}`);
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (err) {
    console.warn(`⚠️ [Prayer Service] Échec ou timeout API: ${err.message}`);
  }

  // Fallback sur horaires indicatifs
  const fallback = {
    city: city.charAt(0).toUpperCase() + city.slice(1),
    date: new Date().toLocaleDateString('fr-FR'),
    timings: {
      Fajr: '05:30',
      Sunrise: '07:00',
      Dhuhr: '13:30',
      Asr: '16:45',
      Maghrib: '19:45',
      Isha: '21:15',
    }
  };
  return fallback;
}

/**
 * Formate les horaires de prière en texte structuré.
 */
export function formatPrayerTimes(prayerData) {
  if (!prayerData || !prayerData.timings) return '';

  const { city, date, timings } = prayerData;
  return `🕌 **Heures de prière pour ${city}** (Date : ${date}) :\n` +
    `• **Fajr (Aube)** : ${timings.Fajr}\n` +
    `• **Chourouq (Lever du soleil)** : ${timings.Sunrise}\n` +
    `• **Dhuhr (Midi)** : ${timings.Dhuhr}\n` +
    `• **Asr (Après-midi)** : ${timings.Asr}\n` +
    `• **Maghrib (Coucher du soleil)** : ${timings.Maghrib}\n` +
    `• **Isha (Nuit)** : ${timings.Isha}`;
}
