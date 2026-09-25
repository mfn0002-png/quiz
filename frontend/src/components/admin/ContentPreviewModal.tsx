import { useState, useEffect } from 'react';
import { X, Save, Edit3, BookOpen, AlignLeft, FileText } from 'lucide-react';

export interface ContentDraft {
  id: string;
  title: string;
  category: string;
  format: string;
  summary: string;
  contentText: string;
  rawDraft?: any;
}

interface ContentPreviewModalProps {
  draft: ContentDraft | null;
  onClose: () => void;
  onConfirm: (draft: ContentDraft) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  prophetes:     'Prophètes',
  duas:          "Duas & Invocations",
  piliers:       "Piliers de l'Islam",
  foi:           'Foi & Tawheed',
  jurisprudence: 'Jurisprudence',
};

const FORMAT_LABELS: Record<string, string> = {
  recit: 'Récit / Histoire',
  fiche: "Fiche d'apprentissage",
};

export function ContentPreviewModal({ draft, onClose, onConfirm }: ContentPreviewModalProps) {
  const [editMode,    setEditMode]    = useState(false);
  const [localDraft,  setLocalDraft]  = useState<ContentDraft | null>(null);

  // Sync local state whenever the parent opens a new draft
  useEffect(() => {
    if (draft) {
      setLocalDraft({ ...draft });
      setEditMode(false);
    } else {
      setLocalDraft(null);
    }
  }, [draft]);

  if (!draft || !localDraft) return null;

  const update = (patch: Partial<ContentDraft>) =>
    setLocalDraft((prev) => prev ? { ...prev, ...patch } : prev);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(780px, calc(100vw - 2rem))',
          maxHeight: 'calc(100vh - 3rem)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-color)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--border-color)',
          overflow: 'hidden',
          animation: 'slideUp 220ms cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Barre accent verte */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--primary-color), #34d399)', flexShrink: 0 }} />

        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0, gap: '1rem',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'rgba(5,150,105,0.13)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOpen size={17} />
              </div>
              <h2 id="cp-modal-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
                Prévisualisation avant enregistrement
              </h2>
            </div>
            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {localDraft.id && (
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.15rem 0.5rem', color: 'var(--text-muted)' }}>
                  #{localDraft.id}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: 'rgba(5,150,105,0.12)', color: 'var(--primary-color)', borderRadius: 'var(--radius-full)', padding: '0.15rem 0.6rem' }}>
                {CATEGORY_LABELS[localDraft.category] ?? localDraft.category}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 'var(--radius-full)', padding: '0.15rem 0.6rem' }}>
                {FORMAT_LABELS[localDraft.format] ?? localDraft.format}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Corps scrollable ─────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="custom-scrollbar">

          {/* Titre */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={12} /> Titre
            </label>
            {editMode ? (
              <input className="form-input" value={localDraft.title} onChange={(e) => update({ title: e.target.value })} />
            ) : (
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {localDraft.title || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </p>
            )}
          </div>

          {/* Résumé */}
          {(localDraft.summary || editMode) && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlignLeft size={12} /> Résumé
              </label>
              {editMode ? (
                <input className="form-input" value={localDraft.summary} onChange={(e) => update({ summary: e.target.value })} placeholder="Résumé court..." />
              ) : (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', backgroundColor: 'var(--surface-color-subtle)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-color)' }}>
                  {localDraft.summary}
                </p>
              )}
            </div>
          )}

          {/* Contenu principal */}
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={12} /> Contenu
            </label>
            <textarea
              className="form-textarea"
              value={localDraft.contentText}
              readOnly={!editMode}
              onChange={(e) => update({ contentText: e.target.value })}
              rows={20}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: '0.83rem',
                lineHeight: 1.75,
                backgroundColor: editMode ? undefined : 'var(--surface-color-subtle)',
                color: 'var(--text-primary)',
                cursor: editMode ? 'text' : 'default',
                resize: editMode ? 'vertical' : 'none',
              }}
            />
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className="btn btn-outline"
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Edit3 size={14} />
            {editMode ? 'Aperçu' : 'Modifier'}
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline"
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
              Annuler
            </button>
            <button
              type="button"
              onClick={() => localDraft && onConfirm(localDraft)}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={14} />
              Valider &amp; Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
