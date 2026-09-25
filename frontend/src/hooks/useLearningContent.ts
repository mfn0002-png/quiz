import { useEffect, useState } from 'react';
import { LearningTopic, TopicSummary, isRecit } from '../types/learning';

const CACHE_SUMMARIES_KEY = 'learning_summaries_v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

interface SummariesCacheEnvelope {
  fetchedAt: number;
  summaries: TopicSummary[];
}

const detailMemoryCache = new Map<string, LearningTopic>();

/**
 * Validation minimale d'un résumé de topic.
 */
function isValidSummary(candidate: unknown): candidate is TopicSummary {
  if (!candidate || typeof candidate !== 'object') return false;
  const s = candidate as Partial<TopicSummary>;
  return typeof s.id === 'string' && typeof s.title === 'string' && (s.format === 'fiche' || s.format === 'recit');
}

/**
 * Validation d'un topic complet avec ses chapitres/sections.
 */
function isValidTopic(candidate: unknown): candidate is LearningTopic {
  if (!candidate || typeof candidate !== 'object') return false;
  const t = candidate as Partial<LearningTopic>;

  if (typeof t.id !== 'string' || typeof t.title !== 'string') return false;
  if (t.format !== 'fiche' && t.format !== 'recit') return false;

  const units = t.format === 'recit'
    ? (t as { chapters?: unknown[] }).chapters
    : (t as { sections?: unknown[] }).sections;

  return Array.isArray(units) && units.length > 0;
}


function readSummariesCache(): TopicSummary[] | null {
  try {
    const raw = localStorage.getItem(CACHE_SUMMARIES_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SummariesCacheEnvelope;
    if (Date.now() - envelope.fetchedAt > CACHE_TTL_MS) return null;
    return envelope.summaries;
  } catch {
    return null;
  }
}

function writeSummariesCache(summaries: TopicSummary[]): void {
  try {
    const envelope: SummariesCacheEnvelope = { fetchedAt: Date.now(), summaries };
    localStorage.setItem(CACHE_SUMMARIES_KEY, JSON.stringify(envelope));
  } catch {
    // Quota : cache mémoire
  }
}

export interface UseLearningContentResult {
  topics: TopicSummary[];
  loading: boolean;
  error: Error | null;
  isFallback: boolean;
  refresh: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

/**
 * Charge les résumés légers des sujets pédagogiques (pour le Hub).
 */
export function useLearningContent(): UseLearningContentResult {
  const [topics, setTopics] = useState<TopicSummary[]>(() => {
    const cached = readSummariesCache();
    return (cached && cached.length > 0) ? cached : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = readSummariesCache();
    return !cached || cached.length === 0;
  });
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(`${API_BASE_URL}/learning/topics`, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`Le serveur a répondu (${response.status})`);
        }

        const json = await response.json();
        const rawList = Array.isArray(json?.data) ? json.data : [];
        const remote: TopicSummary[] = rawList.filter(isValidSummary);

        if (!active) return;

        if (remote.length > 0) {
          setTopics(remote);
          writeSummariesCache(remote);
          setIsFallback(false);
        }
        setError(null);
      } catch (err) {
        if (!active) return;
        const msg = (err as Error).name === 'AbortError'
          ? 'Délai d\'attente dépassé pour charger les fiches d\'apprentissage.'
          : (err as Error).message;
        console.warn('[useLearningContent] Erreur API :', msg);
        const cached = readSummariesCache();
        if (cached && cached.length > 0) {
          setTopics(cached);
          setError(null);
        } else {
          setError(new Error(msg));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [nonce]);

  return {
    topics,
    loading,
    error,
    isFallback,
    refresh: () => { setLoading(true); setNonce(n => n + 1); },
  };
}

export interface UseTopicDetailResult {
  topic: LearningTopic | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Charge à la demande le contenu complet d'un sujet (chapitres, blocs, quiz, glossaire)
 * lors de l'ouverture de la modale.
 */
export function useTopicDetail(topicId: string | null): UseTopicDetailResult {
  const [topic, setTopic] = useState<LearningTopic | null>(() => {
    return topicId ? (detailMemoryCache.get(topicId) || null) : null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return topicId ? !detailMemoryCache.has(topicId) : false;
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!topicId) {
      setTopic(null);
      setLoading(false);
      return;
    }

    if (detailMemoryCache.has(topicId)) {
      setTopic(detailMemoryCache.get(topicId)!);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(`${API_BASE_URL}/learning/topics/${encodeURIComponent(topicId)}`, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`Le serveur a répondu (${response.status})`);
        }

        const json = await response.json();
        const data = json?.data;

        if (data && isValidTopic(data) && active) {
          detailMemoryCache.set(topicId, data);
          setTopic(data);
        }
      } catch (err) {
        if (active) {
          const msg = (err as Error).name === 'AbortError'
            ? 'Délai d\'attente dépassé (6s). Les données de la fiche sont temporairement inaccessibles.'
            : (err as Error).message;
          setError(new Error(msg));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [topicId]);

  return { topic, loading, error };
}

/** Extrait toutes les SourceRef d'un topic, pour préchargement. */
export function collectSourceRefs(topic: LearningTopic) {
  const units = isRecit(topic) ? (topic.chapters || []) : (topic.sections || []);
  if (!Array.isArray(units)) return [];
  return units.flatMap(unit =>
    (Array.isArray(unit.blocks) ? unit.blocks : []).flatMap(block => {
      if (block.type === 'source') return [block.ref];
      if (block.type === 'flip' && block.sourceRef) return [block.sourceRef];
      return [];
    }),
  );
}