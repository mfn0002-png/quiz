import { useEffect, useState } from 'react';
import { LearningTopic, isRecit } from '../types/learning';

const CACHE_KEY = 'learning_topics_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

interface CacheEnvelope {
  fetchedAt: number;
  topics: LearningTopic[];
}

/**
 * Validation minimale : un document JSON mal formé ne doit pas faire planter le rendu.
 */
function isValidTopic(candidate: unknown): candidate is LearningTopic {
  if (!candidate || typeof candidate !== 'object') return false;
  const t = candidate as Partial<LearningTopic>;

  if (typeof t.id !== 'string' || typeof t.title !== 'string') return false;
  if (typeof t.revision !== 'number') return false;
  if (t.format !== 'fiche' && t.format !== 'recit') return false;

  const units = t.format === 'recit'
    ? (t as { chapters?: unknown[] }).chapters
    : (t as { sections?: unknown[] }).sections;

  return Array.isArray(units) && units.length > 0;
}

function readCache(): LearningTopic[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope;
    if (Date.now() - envelope.fetchedAt > CACHE_TTL_MS) return null;
    return envelope.topics;
  } catch {
    return null;
  }
}

function writeCache(topics: LearningTopic[]): void {
  try {
    const envelope: CacheEnvelope = { fetchedAt: Date.now(), topics };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota : on se contente du cache mémoire de la session.
  }
}

export interface UseLearningContentResult {
  topics: LearningTopic[];
  loading: boolean;
  error: Error | null;
  isFallback: boolean;
  refresh: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

/**
 * Charge le contenu pédagogique depuis le backend API (qui interroge Firestore avec cache Redis).
 */
export function useLearningContent(): UseLearningContentResult {
  const [topics, setTopics] = useState<LearningTopic[]>(() => {
    const cached = readCache();
    return (cached && cached.length > 0) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = readCache();
    return !cached || cached.length === 0;
  });
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/learning/topics`);
        if (!response.ok) {
          throw new Error(`Le serveur a répondu ${response.status}`);
        }

        const json = await response.json();
        const rawList = Array.isArray(json?.data) ? json.data : [];
        const remote: LearningTopic[] = rawList.filter(isValidTopic);

        if (!active) return;

        if (remote.length > 0) {
          setTopics(remote);
          writeCache(remote);
          setIsFallback(false);
        }
        setError(null);
      } catch (err) {
        if (!active) return;
        console.warn('[useLearningContent] API backend inaccessible, utilisation du cache :', (err as Error).message);
        const cached = readCache();
        if (cached && cached.length > 0) {
          setTopics(cached);
          setError(null);
        } else {
          setError(err as Error);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return {
    topics,
    loading,
    error,
    isFallback,
    refresh: () => { setLoading(true); setNonce(n => n + 1); },
  };
}

/** Extrait toutes les SourceRef d'un topic, pour préchargement. */
export function collectSourceRefs(topic: LearningTopic) {
  const units = isRecit(topic) ? topic.chapters : topic.sections;
  return units.flatMap(unit =>
    unit.blocks.flatMap(block => {
      if (block.type === 'source') return [block.ref];
      if (block.type === 'flip' && block.sourceRef) return [block.sourceRef];
      return [];
    }),
  );
}