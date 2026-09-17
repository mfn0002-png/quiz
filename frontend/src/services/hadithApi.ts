import { HadithCollection, HadithBookResponse, HadithsResponse } from '../types/hadith';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

const collectionsCache = new Map<string, HadithCollection[]>();
const booksCache = new Map<string, HadithBookResponse>();
const hadithsCache = new Map<string, HadithsResponse>();

// Empty export for Vite HMR cache compatibility
export const FALLBACK_COLLECTIONS: HadithCollection[] = [];

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new Error("Délai d'attente dépassé (6s). Le serveur n'a pas répondu à temps.");
    }
    throw new Error("Impossible de se connecter au serveur backend. Veuillez vérifier votre connexion.");
  }
}

export async function fetchHadithCollections(group?: string): Promise<HadithCollection[]> {
  const cacheKey = group || 'all';
  if (collectionsCache.has(cacheKey)) {
    return collectionsCache.get(cacheKey)!;
  }

  const url = group
    ? `${API_BASE_URL}/hadiths/collections?group=${encodeURIComponent(group)}`
    : `${API_BASE_URL}/hadiths/collections`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`Erreur serveur lors de la récupération des recueils (${res.status})`);
  }
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error("Format de réponse invalide du serveur de hadiths.");
  }
  const list: HadithCollection[] = json.data;
  const filtered = group ? list.filter((c: HadithCollection) => c.group === group) : list;
  collectionsCache.set(cacheKey, filtered);
  return filtered;
}

export async function fetchCollectionBooks(collectionId: string): Promise<HadithBookResponse> {
  if (booksCache.has(collectionId)) {
    return booksCache.get(collectionId)!;
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/hadiths/collections/${collectionId}/books`);
  if (!res.ok) {
    throw new Error(`Impossible d'obtenir les livres du recueil (${res.status})`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error("Aucun livre disponible pour ce recueil.");
  }
  booksCache.set(collectionId, json.data);
  return json.data;
}

export async function fetchBookHadiths(collectionId: string, bookNumber: number): Promise<HadithsResponse> {
  const cacheKey = `${collectionId}:${bookNumber}`;
  if (hadithsCache.has(cacheKey)) {
    return hadithsCache.get(cacheKey)!;
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/hadiths/collections/${collectionId}/books/${bookNumber}`);
  if (!res.ok) {
    throw new Error(`Impossible de charger les hadiths de ce chapitre (${res.status})`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error("Aucun hadith trouvé pour ce chapitre.");
  }
  hadithsCache.set(cacheKey, json.data);
  return json.data;
}
