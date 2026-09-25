import { Database, RefreshCw, Plus, Trash2, Sparkles } from 'lucide-react';
import { SyncResult } from './types';

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
            Dynamiques
          </span>
        </div>

        {/* Badges collections */}
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

        {/* Ajout collection */}
        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '420px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Nom d'une nouvelle collection (ex: articles)"
            value={newCollectionInput}
            onChange={(e) => setNewCollectionInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddCollection())}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <button
            type="button"
            onClick={onAddCollection}
            className="btn btn-outline"
            style={{ padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>
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

      {/* Rapport */}
      {syncResult && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--primary-color)' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} /> Rapport de synchronisation
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
            <li><strong>Chunks insérés :</strong> {syncResult.totalIngested}</li>
            <li><strong>Chunks ignorés :</strong> {syncResult.skippedCount}</li>
            <li><strong>Erreurs :</strong> {syncResult.errorsCount}</li>
            <li><strong>Durée :</strong> {syncResult.elapsed} s</li>
          </ul>
        </div>
      )}
    </section>
  );
};
