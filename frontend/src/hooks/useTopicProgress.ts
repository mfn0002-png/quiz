import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthUser } from './useAuthUser';
import { LearningTopic, TopicProgress, isRecit } from '../types/learning';

const GUEST_KEY = 'learning_progress_guest_v1';
const FLUSH_DELAY_MS = 1500;

type ProgressMap = Record<string, TopicProgress>;

function loadGuestProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '{}') as ProgressMap;
  } catch {
    return {};
  }
}

function saveGuestProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(map));
  } catch {
    // Ignoré : la progression invité est un confort, pas une donnée critique.
  }
}

function unitCount(topic: LearningTopic): number {
  return isRecit(topic) ? topic.chapters.length : topic.sections.length;
}

/**
 * Crée une entrée vierge, ou réinitialise celle qui existe si le contenu a été
 * révisé depuis. Sans ce contrôle, un utilisateur garderait « chapitre 3 validé »
 * sur un chapitre dont le texte a changé.
 */
function baseline(topic: LearningTopic, existing?: TopicProgress): TopicProgress {
  if (existing && existing.revision === topic.revision) return existing;
  return {
    topicId: topic.id,
    revision: topic.revision,
    completedUnits: [],
    checkpointResults: {},
    lastOpenedAt: new Date().toISOString(),
  };
}

export interface UseTopicProgressResult {
  progressByTopic: ProgressMap;
  loading: boolean;
  markUnitSeen: (topic: LearningTopic, unitId: string) => void;
  recordCheckpoint: (topic: LearningTopic, unitId: string, correct: boolean) => void;
  resetTopic: (topic: LearningTopic) => void;
}

/**
 * Progression d'apprentissage par utilisateur.
 *
 * Les mises à jour sont optimistes en local puis regroupées avant écriture
 * Firestore (debounce), pour éviter une écriture par chapitre feuilleté.
 * Un invité non connecté conserve sa progression en localStorage ; elle n'est
 * pas migrée automatiquement à la connexion — à décider côté produit.
 */
export function useTopicProgress(): UseTopicProgressResult {
  const { user } = useAuthUser();
  const [progressByTopic, setProgressByTopic] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  const dirtyIds = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<ProgressMap>({});

  latest.current = progressByTopic;

  /* --- chargement initial --- */
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      if (!user) {
        if (active) {
          setProgressByTopic(loadGuestProgress());
          setLoading(false);
        }
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'learningProgress'));
        const map: ProgressMap = {};
        snapshot.forEach(d => { map[d.id] = d.data() as TopicProgress; });
        if (active) setProgressByTopic(map);
      } catch {
        if (active) setProgressByTopic(loadGuestProgress());
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [user]);

  /* --- écriture groupée --- */
  const flush = useCallback(async () => {
    const ids = Array.from(dirtyIds.current);
    dirtyIds.current.clear();
    if (ids.length === 0) return;

    if (!user) {
      saveGuestProgress(latest.current);
      return;
    }

    await Promise.allSettled(
      ids.map(topicId => {
        const entry = latest.current[topicId];
        if (!entry) return Promise.resolve();

        // Nettoyage strict des clés 'undefined' incompatibles avec Firestore
        const cleanPayload: Record<string, any> = {
          topicId: entry.topicId,
          revision: entry.revision,
          completedUnits: entry.completedUnits || [],
          checkpointResults: entry.checkpointResults || {},
          lastOpenedAt: entry.lastOpenedAt || new Date().toISOString(),
          updatedAt: serverTimestamp(),
        };
        if (entry.completedAt) {
          cleanPayload.completedAt = entry.completedAt;
        }

        return setDoc(
          doc(db, 'users', user.uid, 'learningProgress', topicId),
          cleanPayload,
          { merge: true },
        );
      }),
    );
  }, [user]);

  const scheduleFlush = useCallback((topicId: string) => {
    dirtyIds.current.add(topicId);
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => { void flush(); }, FLUSH_DELAY_MS);
  }, [flush]);

  // Écriture immédiate si l'onglet passe en arrière-plan ou se ferme.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        if (flushTimer.current) clearTimeout(flushTimer.current);
        void flush();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      void flush();
    };
  }, [flush]);

  /* --- mutations --- */
  const markUnitSeen = useCallback((topic: LearningTopic, unitId: string) => {
    setProgressByTopic(prev => {
      const entry = baseline(topic, prev[topic.id]);
      if (entry.completedUnits.includes(unitId)) return prev;

      const completedUnits = [...entry.completedUnits, unitId];
      const isComplete = completedUnits.length >= unitCount(topic);

      const next: TopicProgress = {
        ...entry,
        completedUnits,
        lastOpenedAt: new Date().toISOString(),
      };
      if (isComplete) {
        next.completedAt = entry.completedAt ?? new Date().toISOString();
      } else if (entry.completedAt) {
        next.completedAt = entry.completedAt;
      }

      return { ...prev, [topic.id]: next };
    });

    scheduleFlush(topic.id);
  }, [scheduleFlush]);

  const recordCheckpoint = useCallback((topic: LearningTopic, unitId: string, correct: boolean) => {
    setProgressByTopic(prev => {
      const entry = baseline(topic, prev[topic.id]);
      // Première réponse seulement : rejouer ne doit pas repeindre un échec en réussite.
      if (unitId in entry.checkpointResults) return prev;

      return {
        ...prev,
        [topic.id]: {
          ...entry,
          checkpointResults: { ...entry.checkpointResults, [unitId]: correct },
          lastOpenedAt: new Date().toISOString(),
        },
      };
    });

    scheduleFlush(topic.id);
  }, [scheduleFlush]);

  const resetTopic = useCallback((topic: LearningTopic) => {
    setProgressByTopic(prev => ({ ...prev, [topic.id]: baseline(topic) }));
    scheduleFlush(topic.id);
  }, [scheduleFlush]);

  return { progressByTopic, loading, markUnitSeen, recordCheckpoint, resetTopic };
}