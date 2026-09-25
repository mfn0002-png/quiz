import { useEffect, useState } from 'react';
import { BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { SourceRef, ResolvedSource } from '../../types/learning';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

/* ------------------------------------------------------------------ */
/* Cache mémoire + sessionStorage                                      */
/* ------------------------------------------------------------------ */

const memoryCache = new Map<string, ResolvedSource>();
const inFlight = new Map<string, Promise<ResolvedSource>>();

export function refKey(ref: SourceRef): string {
  switch (ref.kind) {
    case 'quran':
      return `quran:${ref.surah}:${ref.ayah}${ref.ayahEnd ? `-${ref.ayahEnd}` : ''}`;
    case 'hadith':
      return `hadith:${ref.collection}:${ref.bookNumber}:${ref.hadithNumber}`;
    case 'dua':
      return `dua:${ref.hisnId}`;
  }
}

function readSessionCache(key: string): ResolvedSource | null {
  try {
    const raw = sessionStorage.getItem(`src:${key}`);
    return raw ? (JSON.parse(raw) as ResolvedSource) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, value: ResolvedSource): void {
  try {
    sessionStorage.setItem(`src:${key}`, JSON.stringify(value));
  } catch {
    // Quota dépassé ou mode privé : le cache mémoire suffit.
  }
}

export function getPreloadedSource(key: string): ResolvedSource | null {
  return memoryCache.get(key) ?? readSessionCache(key);
}

/**
 * Résout une référence scripturaire via l'API backend avec cache mémoire et sessionStorage.
 */
export async function resolveSource(ref: SourceRef): Promise<ResolvedSource> {
  const key = refKey(ref);

  const cached = getPreloadedSource(key);
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API_BASE_URL}/sources/${encodeURIComponent(key)}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Résolution impossible (${response.status}) pour ${key}`);
      }
      const data = (await response.json()) as ResolvedSource;
      memoryCache.set(key, data);
      writeSessionCache(key, data);
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    inFlight.delete(key);
  }
}

/** Préchargement — à appeler à l'ouverture d'un topic pour éviter le flash de chargement. */
export function prefetchSources(refs: SourceRef[]): void {
  refs.forEach(ref => {
    resolveSource(ref).catch(() => {});
  });
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

interface SourceBlockProps {
  refSource: SourceRef;
  note?: string;
  /** Rendu resserré, pour l'intérieur d'une carte retournable. */
  compact?: boolean;
}

export function SourceBlock({ refSource, note, compact = false }: SourceBlockProps) {
  const key = refKey(refSource);
  const [source, setSource] = useState<ResolvedSource | null>(() => getPreloadedSource(key));
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const pre = getPreloadedSource(key);
    if (pre) {
      setSource(pre);
      setFailed(false);
      return;
    }

    let active = true;
    setFailed(false);

    resolveSource(refSource)
      .then(data => {
        if (active) setSource(data);
      })
      .catch(err => {
        if (active) {
          console.warn(`[SourceBlock] Impossible de résoudre ${key} :`, err.message);
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [key, retryCount]);

  if (failed) {
    return (
      <div
        role="status"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '1rem 0',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-lg)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--surface-color-subtle)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={15} aria-hidden />
          <span>Texte temporairement indisponible ({key})</span>
        </div>
        <button
          onClick={() => setRetryCount(c => c + 1)}
          className="btn btn-outline"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <RefreshCw size={12} />
          Réessayer
        </button>
      </div>
    );
  }

  if (!source) {
    return (
      <div
        aria-busy="true"
        aria-label="Chargement de la source"
        style={{
          minHeight: compact ? '46px' : '72px',
          margin: '1rem 0',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface-color-subtle)',
          border: '1px dashed var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
        }}
      >
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid var(--border-color)',
            borderTopColor: 'var(--primary-color)',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
        <span>Chargement de la référence ({key})...</span>
      </div>
    );
  }

  return (
    <figure
      style={{
        margin: compact ? 0 : '1.25rem 0',
        padding: compact ? 0 : '1.1rem 1.25rem',
        maxWidth: '62ch',
        borderRadius: 'var(--radius-lg)',
        borderLeft: compact ? 'none' : '3px solid var(--primary-color)',
        backgroundColor: compact ? 'transparent' : 'var(--surface-color-subtle)',
      }}
    >
      <p
        className="arabic-text"
        dir="rtl"
        lang="ar"
        style={{ fontSize: '1.4rem', lineHeight: 2, marginBottom: '0.75rem', textAlign: 'right' }}
      >
        {source.arabic}
      </p>

      {source.phonetic && (
        <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          {source.phonetic}
        </p>
      )}

      <p style={{ fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '0.6rem' }}>
        {source.translation}
      </p>

      <figcaption
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--primary-color)',
        }}
      >
        <BookOpen size={13} aria-hidden />
        <span>{source.citation}</span>
      </figcaption>

      {note && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          {note}
        </p>
      )}
    </figure>
  );
}