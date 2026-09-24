import { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  Save,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import { User } from '../../firebase';
import { useAdminRole } from '../../hooks/useAdminRole';
import { AppModal, ModalState, ModalType } from './AppModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

interface AdminSettingsProps {
  user: User | null;
  authLoading: boolean;
}

const EMPTY_MODAL: ModalState = { open: false, type: 'info', title: '', message: '' };

export function AdminSettings({ user, authLoading }: AdminSettingsProps) {
  const { isAdmin, loading: roleLoading } = useAdminRole(user);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<{
    totalIngested: number;
    skippedCount: number;
    errorsCount: number;
    elapsed: string;
  } | null>(null);
  const [errorMessage, setErrorMessage]     = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(EMPTY_MODAL);

  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void) =>
    setModal({ open: true, type, title, message, onConfirm });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  // Config state
  const [ragModel,            setRagModel]            = useState('gemini-flash-lite-latest');
  const [embeddingModel,      setEmbeddingModel]      = useState('text-embedding-004');
  const [topK,                setTopK]                = useState(3);
  const [minSimilarityScore,  setMinSimilarityScore]  = useState(0.45);
  const [collections,         setCollections]         = useState<string[]>(['learningTopics', 'sources', 'assistant_evaluations']);
  const [newCollectionInput,  setNewCollectionInput]  = useState('');
  const [defaultQuestionCount,setDefaultQuestionCount]= useState(5);
  const [timerSeconds,        setTimerSeconds]        = useState(30);

  // Content creator
  const [formId,          setFormId]          = useState('');
  const [formTitle,       setFormTitle]       = useState('');
  const [formCategory,    setFormCategory]    = useState('prophetes');
  const [formFormat,      setFormFormat]      = useState('recit');
  const [formSummary,     setFormSummary]     = useState('');
  const [formContentText, setFormContentText] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Load config
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE_URL}/admin/rag/settings`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.config?.rag) {
            setRagModel(data.config.rag.model || 'gemini-flash-lite-latest');
            setEmbeddingModel(data.config.rag.embeddingModel || 'text-embedding-004');
            setTopK(data.config.rag.topK || 3);
            setMinSimilarityScore(data.config.rag.minSimilarityScore || 0.45);
            if (Array.isArray(data.config.rag.collectionsToSync))
              setCollections(data.config.rag.collectionsToSync);
          }
          if (data.config?.quiz) {
            setDefaultQuestionCount(data.config.quiz.defaultQuestionCount || 5);
            setTimerSeconds(data.config.quiz.timerSeconds || 30);
          }
        }
      } catch (err) {
        console.warn('Impossible de charger la config :', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleAddCollection = () => {
    const trimmed = newCollectionInput.trim();
    if (trimmed && !collections.includes(trimmed)) {
      setCollections([...collections, trimmed]);
      setNewCollectionInput('');
    }
  };

  const handleRemoveCollection = (colName: string) => {
    showModal(
      'confirm',
      `Retirer "${colName}" de la synchronisation ?`,
      `Cette action retire la collection "${colName}" de la liste RAG.\n\n` +
      `Vos donnees dans Firestore ne seront PAS supprimees. Seule la synchronisation vers Supabase est concernee.\n\n` +
      `Vous pourrez la rerajouter a tout moment.`,
      () => setCollections(collections.filter((c) => c !== colName))
    );
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/rag/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || '' },
        body: JSON.stringify({
          rag: { model: ragModel, embeddingModel, topK, minSimilarityScore, collectionsToSync: collections },
          quiz: { defaultQuestionCount, timerSeconds },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde');
      setSuccessMessage('Parametres sauvegardes avec succes !');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncRag = async (forceReindex = false) => {
    setSyncing(true);
    setSyncResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/rag/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || '' },
        body: JSON.stringify({ forceReindex, collections }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erreur lors de la synchronisation RAG');
      setSyncResult(data.data);
      setSuccessMessage('Synchronisation Firebase vers Supabase effectuee !');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    if (!formTitle.trim()) {
      showModal('warning', 'Titre requis',
        'Veuillez saisir le titre ou le sujet avant de lancer la generation IA.\n\nExemple : "Prophete Salih" ou "Invocations de la pluie".');
      return;
    }
    setGeneratingDraft(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/generate-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': user?.email || '' },
        body: JSON.stringify({ subject: formTitle.trim(), category: formCategory, format: formFormat }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erreur lors de la generation');
      const draft = data.draft;
      setFormId(draft.id || 'nouveau_sujet');
      if (draft.title)   setFormTitle(draft.title);
      if (draft.summary) setFormSummary(draft.summary);
      let text = '';
      if (Array.isArray(draft.chapters)) {
        text = draft.chapters
          .map((c: any) => `### ${c.title}\n\n${Array.isArray(c.paragraphs) ? c.paragraphs.join('\n\n') : c.content}`)
          .join('\n\n---\n\n');
      } else if (Array.isArray(draft.sections)) {
        text = draft.sections.map((s: any) => `### ${s.heading}\n\n${s.body}`).join('\n\n---\n\n');
      }
      setFormContentText(text);
      showModal('success', 'Brouillon IA genere !',
        "L'Agent IA a redige un premier brouillon.\nRelisez et modifiez le texte avant de l'enregistrer dans Firestore.");
    } catch (err: any) {
      showModal('error', 'Echec de la generation IA', err.message);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────
  if (authLoading || roleLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement du panneau d'administration...</p>
      </div>
    );
  }

  // ── Acces refuse ──────────────────────────────────────────
  if (!user || !isAdmin) {
    return (
      <div style={{ maxWidth: '560px', margin: '3rem auto', padding: '2.5rem', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Lock size={30} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Acces Restreint</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
          Cette section est reservee aux administrateurs autorises.
        </p>
      </div>
    );
  }

  // ── Layout principal ───────────────────────────────────────
  return (
    <>
      <AppModal modal={modal} onClose={closeModal} />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem 7rem' }}>

        {/* En-tete ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(5, 150, 105, 0.15)', color: 'var(--primary-color)' }}>
                <Settings size={22} />
              </div>
              <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                Administration & Parametres
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', margin: 0 }}>
              Gestion de l'IA Gemini, synchronisation RAG Firebase vers Supabase et reglages globaux.
            </p>
          </div>

          <button onClick={handleSaveSettings} disabled={saving} className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.3rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            <span>Enregistrer les modifications</span>
          </button>
        </div>

        {/* Bandeaux inline ────────────────────────────────── */}
        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', backgroundColor: 'rgba(239,68,68,0.09)', border: '1px solid var(--error-color)', borderRadius: 'var(--radius-lg)', color: 'var(--error-color)', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', backgroundColor: 'rgba(16,185,129,0.09)', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-lg)', color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ━━━ Section 1 : RAG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="admin-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
            <Database size={19} style={{ color: 'var(--primary-color)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Synchronisation RAG Vectorielle (Firebase vers Supabase)
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Le service extrait vos collections Firestore, les decoupe en chunks, genere des embeddings via Gemini et les stocke dans Supabase (<code style={{ backgroundColor: 'var(--surface-color-subtle)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.82rem' }}>pgvector</code>).
          </p>

          {/* Collections */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Collections Firestore a synchroniser :</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', backgroundColor: 'rgba(5, 150, 105, 0.1)', padding: '0.18rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                Dynamiques
              </span>
            </div>

            {/* Note info */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem 0.8rem', backgroundColor: 'rgba(59, 130, 246, 0.07)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-md)', marginBottom: '0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: '0.15rem', color: '#3b82f6' }} />
              <span>Retirer une collection <strong>ne supprime pas les donnees Firestore</strong>. Cela arrete uniquement la synchro RAG vers Supabase.</span>
            </div>

            {/* Badges collections */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.8rem' }}>
              {collections.map((col) => (
                <span key={col} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.8rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--border-color)', fontSize: '0.83rem', fontWeight: 600 }}>
                  <span>📁 {col}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCollection(col)}
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
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCollection())}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <button type="button" onClick={handleAddCollection} className="btn btn-outline"
                style={{ padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Plus size={15} /> Ajouter
              </button>
            </div>
          </div>

          {/* Boutons synchro */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={() => handleSyncRag(false)} disabled={syncing} className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-lg)' }}>
              <RefreshCw size={15} className={syncing ? 'spin' : ''} />
              <span>{syncing ? 'Synchronisation...' : 'Synchro incrementielle'}</span>
            </button>
            <button onClick={() => handleSyncRag(true)} disabled={syncing} className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-lg)' }}>
              <Database size={15} />
              <span>Forcer la reindexation complete</span>
            </button>
          </div>

          {/* Rapport */}
          {syncResult && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--primary-color)' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} /> Rapport de synchronisation
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.86rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                <li><strong>Chunks inseres :</strong> {syncResult.totalIngested}</li>
                <li><strong>Chunks ignores :</strong> {syncResult.skippedCount}</li>
                <li><strong>Erreurs :</strong> {syncResult.errorsCount}</li>
                <li><strong>Duree :</strong> {syncResult.elapsed} s</li>
              </ul>
            </div>
          )}
        </section>

        {/* ━━━ Section 2 : IA & Gemini ━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="admin-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Cpu size={19} style={{ color: 'var(--primary-color)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Intelligence Artificielle & Modele Gemini</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Modele LLM Gemini :</label>
              <select className="form-select" value={ragModel} onChange={(e) => setRagModel(e.target.value)}>
                <option value="gemini-flash-lite-latest">Gemini 1.5 Flash Lite (Ultra-rapide et economique)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard et equilibre)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Haute precision)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Modele d'Embedding Vectoriel :</label>
              <select className="form-select" value={embeddingModel} onChange={(e) => setEmbeddingModel(e.target.value)}>
                <option value="text-embedding-004">text-embedding-004 (768 dim. - Recommande)</option>
                <option value="gemini-embedding-001">gemini-embedding-001</option>
              </select>
            </div>
            <div>
              <label className="form-label">Nombre d'extraits documentaires (Top K) :</label>
              <select className="form-select" value={topK} onChange={(e) => setTopK(Number(e.target.value))}>
                <option value={3}>3 extraits (Recommande)</option>
                <option value={5}>5 extraits (Contexte etendu)</option>
                <option value={10}>10 extraits (Analyse approfondie)</option>
              </select>
            </div>
            <div>
              <label className="form-label">
                Seuil minimal de similarite : {Math.round(minSimilarityScore * 100)}%
              </label>
              <input
                type="range" min="0.30" max="0.80" step="0.05"
                value={minSimilarityScore}
                onChange={(e) => setMinSimilarityScore(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer', marginTop: '0.4rem' }}
              />
            </div>
          </div>
        </section>

        {/* ━━━ Section 3 : Quiz ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="admin-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Sliders size={19} style={{ color: 'var(--primary-color)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Parametres par Defaut du Quiz</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Nombre de questions par session :</label>
              <select className="form-select" value={defaultQuestionCount} onChange={(e) => setDefaultQuestionCount(Number(e.target.value))}>
                <option value={5}>5 questions (Rapide)</option>
                <option value={10}>10 questions (Standard)</option>
                <option value={15}>15 questions (Intensif)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Temps limite par question :</label>
              <select className="form-select" value={timerSeconds} onChange={(e) => setTimerSeconds(Number(e.target.value))}>
                <option value={15}>15 secondes</option>
                <option value={30}>30 secondes (Par defaut)</option>
                <option value={60}>60 secondes</option>
                <option value={0}>Illimite (Sans chrono)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ━━━ Section 4 : Createur de Contenu ━━━━━━━━━━━━━━━ */}
        <section className="admin-section" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Plus size={19} style={{ color: 'var(--primary-color)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Ajouter un Nouveau Contenu (Prophete, Doua, Recit)
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Creez un nouveau sujet d'apprentissage dans Firestore. Apres enregistrement, lancez la synchronisation RAG pour l'indexation dans Supabase.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!formId.trim() || !formTitle.trim() || !formContentText.trim()) {
                showModal('warning', 'Champs requis manquants',
                  'Veuillez renseigner les trois champs obligatoires :\n• ID Unique\n• Titre\n• Contenu principal');
                return;
              }
              try {
                const { doc, setDoc } = await import('firebase/firestore');
                const { db } = await import('../../firebase');
                const id = formId.trim();
                const newTopicDoc = {
                  id, title: formTitle.trim(), category: formCategory, format: formFormat,
                  summary: formSummary.trim(), published: true, createdAt: new Date().toISOString(),
                  ...(formFormat === 'recit'
                    ? { chapters: [{ title: 'Histoire principale', paragraphs: [formContentText] }] }
                    : { sections: [{ heading: 'Explication principale', body: formContentText }] }),
                };
                await setDoc(doc(db, 'learningTopics', id), newTopicDoc, { merge: true });
                showModal('success', 'Contenu cree avec succes !',
                  `"${formTitle.trim()}" a ete enregistre dans Firestore.\n\nLancez maintenant la synchronisation RAG pour l'indexer dans Supabase.`);
                setFormId(''); setFormTitle(''); setFormSummary(''); setFormContentText('');
              } catch (err: any) {
                showModal('error', 'Erreur lors de la creation', err.message);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
          >
            {/* Ligne 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">ID Unique (ex: prophet_hud)</label>
                <input className="form-input" type="text" required value={formId}
                  onChange={(e) => setFormId(e.target.value)} placeholder="prophete_hud" />
              </div>
              <div>
                <label className="form-label">Categorie</label>
                <select className="form-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                  <option value="prophetes">Prophetes (Histoire)</option>
                  <option value="duas">Duas et Invocations</option>
                  <option value="piliers">Piliers de l'Islam</option>
                  <option value="foi">Foi et Tawheed</option>
                  <option value="jurisprudence">Jurisprudence (Fiqh)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Format</label>
                <select className="form-select" value={formFormat} onChange={(e) => setFormFormat(e.target.value)}>
                  <option value="recit">Recit / Histoire</option>
                  <option value="fiche">Fiche d'apprentissage</option>
                </select>
              </div>
            </div>

            {/* Ligne 2 : Titre + bouton IA */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Titre</label>
                <button type="button" onClick={handleGenerateAiDraft} disabled={generatingDraft}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                  title="L'Agent IA genere un premier brouillon">
                  <Sparkles size={13} className={generatingDraft ? 'spin' : ''} />
                  <span>{generatingDraft ? 'Generation...' : "Generer avec l'IA"}</span>
                </button>
              </div>
              <input className="form-input" type="text" required value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)} placeholder="Prophete Hud (Alayhi s-salam)" />
            </div>

            {/* Ligne 3 : Resume */}
            <div>
              <label className="form-label">Resume / Synthese courte</label>
              <input className="form-input" type="text" value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)} placeholder="Apercu rapide en 1 ou 2 phrases..." />
            </div>

            {/* Ligne 4 : Contenu */}
            <div>
              <label className="form-label">Contenu Principal / Texte du recit</label>
              <textarea className="form-textarea" value={formContentText} rows={8} required
                onChange={(e) => setFormContentText(e.target.value)}
                placeholder="Redigez l'histoire ou l'explication complete ici..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary"
                style={{ padding: '0.65rem 1.3rem', borderRadius: 'var(--radius-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Save size={15} />
                <span>Valider et Enregistrer dans Firestore</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
