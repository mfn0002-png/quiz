import { useState } from 'react';
import { Database, RefreshCw, Plus, Trash2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SyncResult } from './types';

export const KNOWN_COLLECTIONS = [
  { name: 'learningTopics', desc: 'Fiches & Récits pédagogiques' },
  { name: 'sources', desc: 'Coran & Hadiths authentifiés' },
  { name: 'assistant_evaluations', desc: 'Évaluations certifiées RAG 👍' },
  { name: 'hadithCollections', desc: 'Recueils de Hadiths' },
  { name: 'hadithBookTitles', desc: 'Titres des livres de Hadiths' },
];

interface RagSyncSectionProps {
  collections: string[];
  newCollectionInput: string;
  setNewCollectionInput: (val: string) => void;
  onAddCollection: () => void;
  onRemoveCollection: (colName: string) => void;
  syncing: boolean;
  syncResult: SyncResult | null;
  onSyncRag: (forceReindex: boolean) => void;
}

export const RagSyncSection = ({
  collections,
  newCollectionInput,
  setNewCollectionInput,
  onAddCollection,
  onRemoveCollection,
  syncing,
  syncResult,
  onSyncRag,
}: RagSyncSectionProps) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const missingSuggestions = KNOWN_COLLECTIONS.filter(c => !collections.includes(c.name));

  const handleValidateAndAdd = () => {
    const trimmed = newCollectionInput.trim();
    if (!trimmed) {
      setValidationError('Veuillez saisir un nom de collection.');
      return;
    }

    const isKnown = KNOWN_COLLECTIONS.some(k => k.name === trimmed);
    if (!isKnown) {
      setValidationError(
        `⚠️ La collection "${trimmed}" n'existe pas dans Firebase. Seules les collections réelles de Firebase (${KNOWN_COLLECTIONS.map(k => k.name).join(', ')}) peuvent être ajoutées.`
      );
      return;
    }

    if (collections.includes(trimmed)) {
      setValidationError(`ℹ️ La collection "${trimmed}" est déjà présente dans la liste active.`);
      return;
    }

    setValidationError(null);
    onAddCollection();
  };

  const handleQuickAdd = (colName: string) => {
    setValidationError(null);
    setNewCollectionInput(colName);
    setTimeout(() => {
      if (!collections.includes(colName)) {
        onAddCollection();
      }
    }, 50);
  };

  return (
    <section className="admin-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
        <Database size={19} style={{ color: 'var(--primary-color)' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Synchronisation RAG Vectorielle (Firebase vers Supabase)
        </h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
        Le service extrait vos collections Firestore, les découpe en chunks, génère des embeddings via Gemini et les stocke dans Supabase (<code style={{ backgroundColor: 'var(--surface-color-subtle)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.82rem' }}>pgvector</code>).
      </p>

      {/* Collections */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Collections Firestore à synchroniser :</label>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: '0.18rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
            {collections.length} active(s)
          </span>
        </div>

        {/* Badges collections actives */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.8rem' }}>
          {collections.map((col) => (
            <span key={col} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.8rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--border-color)', fontSize: '0.83rem', fontWeight: 600 }}>
              <span>📁 {col}</span>
              <button
                type="button"
                onClick={() => onRemoveCollection(col)}
                title={`Retirer "${col}"`}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', borderRadius: '50%' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>

        {/* Ajout collection avec validation et autocomplétion datalist */}
        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '440px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
          <input
            type="text"
            list="known-collections-list"
            className="form-input"
            placeholder="Nom d'une collection (ex: learningTopics)"
            value={newCollectionInput}
            onChange={(e) => {
              setNewCollectionInput(e.target.value.replace(/\s+/g, ''));
              if (validationError) setValidationError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidateAndAdd();
              }
            }}
            style={{ flex: 1, minWidth: '220px' }}
          />
          <datalist id="known-collections-list">
            {KNOWN_COLLECTIONS.map(k => (
              <option key={k.name} value={k.name}>{k.desc}</option>
            ))}
          </datalist>
          <button
            type="button"
            onClick={handleValidateAndAdd}
            className="btn btn-outline"
            style={{ padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>

        {/* Message d'avertissement immédiat si la collection n'existe pas dans Firebase */}
        {validationError && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.45rem',
            color: '#dc2626',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '0.55rem 0.8rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            marginTop: '0.4rem',
            marginBottom: '0.6rem',
            maxWidth: '560px',
            lineHeight: 1.45
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Suggestions rapides en 1 clic */}
        {missingSuggestions.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Suggestions rapides :</span>
            {missingSuggestions.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => handleQuickAdd(s.name)}
                style={{
                  background: 'none',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.15rem 0.55rem',
                  fontSize: '0.74rem',
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                title={s.desc}
              >
                + {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Boutons synchro */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={() => onSyncRag(false)}
          disabled={syncing}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-lg)' }}
        >
          <RefreshCw size={15} className={syncing ? 'spin' : ''} />
          <span>{syncing ? 'Synchronisation...' : 'Synchro incrémentielle'}</span>
        </button>
        <button
          onClick={() => onSyncRag(true)}
          disabled={syncing}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-lg)' }}
        >
          <Database size={15} />
          <span>Forcer la réindexation complète</span>
        </button>
      </div>

      {/* Rapport de synchronisation */}
      {syncResult && (
        <div style={{ marginTop: '1.25rem', padding: '1.1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.92rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={15} /> Rapport de synchronisation
          </h4>
          
          <ul style={{ margin: '0 0 0.85rem', paddingLeft: '1.2rem', fontSize: '0.86rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
            <li><strong>Chunks insérés :</strong> {syncResult.totalIngested}</li>
            <li><strong>Chunks ignorés :</strong> {syncResult.skippedCount}</li>
            <li><strong>Erreurs :</strong> {syncResult.errorsCount}</li>
            <li><strong>Durée :</strong> {syncResult.elapsed} s</li>
          </ul>

          {/* Alertes d'avertissement (collections vides ou mal orthographiées) */}
          {syncResult.warnings && syncResult.warnings.length > 0 && (
            <div style={{ padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <AlertTriangle size={14} /> Attention / Vérifications d'orthographe :
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {syncResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Détails par collection */}
          {syncResult.details && syncResult.details.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)' }}>
              {syncResult.details.map((d, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '0.76rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    backgroundColor: d.status === 'empty' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: d.status === 'empty' ? '#f59e0b' : '#10b981',
                    fontWeight: 600,
                  }}
                >
                  {d.status === 'ok' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                  <span>{d.collection} : {d.found} doc(s)</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
