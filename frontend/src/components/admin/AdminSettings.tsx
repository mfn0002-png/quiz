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
} from 'lucide-react';
import { User } from '../../firebase';
import { useAdminRole } from '../../hooks/useAdminRole';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

interface AdminSettingsProps {
  user: User | null;
  authLoading: boolean;
}

export function AdminSettings({ user, authLoading }: AdminSettingsProps) {
  const { isAdmin, loading: roleLoading } = useAdminRole(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    totalIngested: number;
    skippedCount: number;
    errorsCount: number;
    elapsed: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Configuration state
  const [ragModel, setRagModel] = useState('gemini-flash-lite-latest');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-004');
  const [topK, setTopK] = useState(3);
  const [minSimilarityScore, setMinSimilarityScore] = useState(0.45);
  const [collections, setCollections] = useState<string[]>(['learningTopics', 'sources', 'assistant_evaluations']);
  const [newCollectionInput, setNewCollectionInput] = useState('');
  const [defaultQuestionCount, setDefaultQuestionCount] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(30);

  // Form states for Content Creator
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('prophetes');
  const [formFormat, setFormFormat] = useState('recit');
  const [formSummary, setFormSummary] = useState('');
  const [formContentText, setFormContentText] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const handleGenerateAiDraft = async () => {
    if (!formTitle.trim()) {
      alert('Veuillez d\'abord saisir le titre ou le sujet (ex: "Prophète Sâlih" ou "Invocations de la pluie").');
      return;
    }

    setGeneratingDraft(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({
          subject: formTitle.trim(),
          category: formCategory,
          format: formFormat,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du brouillon IA');
      }

      const draft = data.draft;
      setFormId(draft.id || formId || 'nouveau_sujet');
      if (draft.title) setFormTitle(draft.title);
      if (draft.summary) setFormSummary(draft.summary);

      // Extraire le texte principal des chapitres ou sections
      let text = '';
      if (Array.isArray(draft.chapters)) {
        text = draft.chapters.map((c: any) => `### ${c.title}\n\n${Array.isArray(c.paragraphs) ? c.paragraphs.join('\n\n') : c.content}`).join('\n\n---\n\n');
      } else if (Array.isArray(draft.sections)) {
        text = draft.sections.map((s: any) => `### ${s.heading}\n\n${s.body}`).join('\n\n---\n\n');
      }

      setFormContentText(text);
      alert('✨ Le brouillon a été généré par l\'Agent IA avec succès !\nVous pouvez relire et modifier le texte ci-dessous avant de l\'enregistrer.');
    } catch (err: any) {
      alert(`Échec de la génération IA : ${err.message}`);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Charger la configuration
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
            if (Array.isArray(data.config.rag.collectionsToSync)) {
              setCollections(data.config.rag.collectionsToSync);
            }
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
    setCollections(collections.filter(c => c !== colName));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const resp = await fetch(`${API_BASE_URL}/admin/rag/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({
          rag: {
            model: ragModel,
            embeddingModel,
            topK,
            minSimilarityScore,
            collectionsToSync: collections,
          },
          quiz: {
            defaultQuestionCount,
            timerSeconds,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSuccessMessage('Paramètres de la plateforme sauvegardés avec succès ! ✨');
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
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({
          forceReindex,
          collections,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la synchronisation RAG');
      }

      setSyncResult(data.data);
      setSuccessMessage('Synchronisation Firebase ➔ Supabase effectuée ! 🚀');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Chargement du panneau d'administration...</p>
      </div>
    );
  }

  // Écran d'accès refusé si l'utilisateur n'est pas admin
  if (!user || !isAdmin) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2.5rem', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Accès Restreint</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Cette section de paramétrage de la plateforme et de synchronisation RAG est réservée exclusivement aux **administrateurs autorisés**.
        </p>
        {!user && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-color-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            Veuillez vous connecter avec votre compte administrateur pour accéder à ces réglages.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(5, 150, 105, 0.15)', color: 'var(--primary-color)' }}>
              <Settings size={22} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Administration & Paramètres
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Gestion de l'IA Gemini, synchronisation RAG Firebase ➔ Supabase et réglages globaux.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}
        >
          {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
          <span>Enregistrer les modifications</span>
        </button>
      </div>

      {/* Messages d'alerte */}
      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', borderRadius: 'var(--radius-lg)', color: 'var(--error-color)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-lg)', color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Section 1 : Synchronisation RAG Firebase ➔ Supabase */}
      <section style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Database size={20} style={{ color: 'var(--primary-color)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Synchronisation RAG Vectorielle (Firebase ➔ Supabase)
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Le service extrait les documents de vos collections Firebase Firestore, les découpe, génère leurs embeddings vectoriels avec Gemini et les stocke dans Supabase (<code style={{ backgroundColor: 'var(--surface-color-subtle)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>pgvector</code>).
        </p>

        {/* Collections paramétrables */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
            Collections Firebase Firestore à synchroniser :
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {collections.map(col => (
              <span
                key={col}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <span>📁 {col}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCollection(col)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}
                  title="Supprimer la collection"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Nom d'une nouvelle collection (ex: articles)"
              value={newCollectionInput}
              onChange={(e) => setNewCollectionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCollection())}
              style={{ flex: 1, padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
            <button
              type="button"
              onClick={handleAddCollection}
              className="btn btn-outline"
              style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Plus size={15} />
              Ajouter
            </button>
          </div>
        </div>

        {/* Boutons d'Action Synchro */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => handleSyncRag(false)}
            disabled={syncing}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-lg)' }}
          >
            <RefreshCw size={16} className={syncing ? 'spin' : ''} />
            <span>{syncing ? 'Synchronisation en cours...' : '⚡ Lancer la Synchro Incrémentielle'}</span>
          </button>

          <button
            onClick={() => handleSyncRag(true)}
            disabled={syncing}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-lg)' }}
          >
            <Database size={16} />
            <span>Forcer la Réindexation Complète</span>
          </button>
        </div>

        {/* Rapport de synchronisation */}
        {syncResult && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-color-subtle)', border: '1px solid var(--primary-color)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} /> Rapport de Synchronisation :
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              <li><strong>Nouveaux Chunks Insérés :</strong> {syncResult.totalIngested}</li>
              <li><strong>Chunks Ignorés (déjà en base) :</strong> {syncResult.skippedCount}</li>
              <li><strong>Erreurs :</strong> {syncResult.errorsCount}</li>
              <li><strong>Durée totale :</strong> {syncResult.elapsed} secondes</li>
            </ul>
          </div>
        )}
      </section>

      {/* Section 2 : Configuration du RAG & IA Gemini */}
      <section style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Cpu size={20} style={{ color: 'var(--primary-color)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Intelligence Artificielle & Modèle Gemini
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Choix du Modèle Gemini */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Modèle LLM Gemini :
            </label>
            <select
              value={ragModel}
              onChange={(e) => setRagModel(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value="gemini-flash-lite-latest">Gemini 1.5 Flash Lite (Ultra-rapide & Économique)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard & Équilibré)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Haute Précision & Raisonnement)</option>
            </select>
          </div>

          {/* Choix du Modèle d'Embedding */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Modèle d'Embedding Vectoriel :
            </label>
            <select
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value="text-embedding-004">text-embedding-004 (768 dimensions - Recommandé)</option>
              <option value="gemini-embedding-001">gemini-embedding-001</option>
            </select>
          </div>

          {/* Top K Chunks */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Nombre d'extraits documentaires (Top K) :
            </label>
            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value={3}>3 extraits (Recommandé - Équilibré)</option>
              <option value={5}>5 extraits (Contexte étendu)</option>
              <option value={10}>10 extraits (Analyse approfondie)</option>
            </select>
          </div>

          {/* Seuil minimal de similarité */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Seuil minimal de similarité cosinus : {Math.round(minSimilarityScore * 100)}%
            </label>
            <input
              type="range"
              min="0.30"
              max="0.80"
              step="0.05"
              value={minSimilarityScore}
              onChange={(e) => setMinSimilarityScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
            />
          </div>
        </div>
      </section>

      {/* Section 3 : Réglages des Quiz & Défis */}
      <section style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Sliders size={20} style={{ color: 'var(--primary-color)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Paramètres par Défaut des Quiz
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Nombre de questions par session :
            </label>
            <select
              value={defaultQuestionCount}
              onChange={(e) => setDefaultQuestionCount(Number(e.target.value))}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value={5}>5 questions (Rapide)</option>
              <option value={10}>10 questions (Standard)</option>
              <option value={15}>15 questions (Intensif)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              Temps limite par question :
            </label>
            <select
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value={15}>15 secondes</option>
              <option value={30}>30 secondes (Défaut)</option>
              <option value={60}>60 secondes</option>
              <option value={0}>Illimité (Sans chrono)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 4 : Créateur de Contenu (Prophètes, Duas, Récits) */}
      <section style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Plus style={{ color: 'var(--primary-color)' }} size={20} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            Ajouter un Nouveau Contenu (Prophète, Doua, Récit)
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Créez directement un nouveau sujet d'apprentissage dans Firestore. Une fois enregistré, déclenchez la synchronisation RAG pour l'indexation dans Supabase.
        </p>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!formId.trim() || !formTitle.trim() || !formContentText.trim()) {
            alert('Veuillez remplir l\'identifiant, le titre et le contenu principal.');
            return;
          }

          try {
            const { doc, setDoc } = await import('firebase/firestore');
            const { db } = await import('../../firebase');

            const id = formId.trim();
            const newTopicDoc = {
              id,
              title: formTitle.trim(),
              category: formCategory,
              format: formFormat,
              summary: formSummary.trim(),
              published: true,
              createdAt: new Date().toISOString(),
              ...(formFormat === 'recit' ? {
                chapters: [{ title: 'Histoire principale', paragraphs: [formContentText] }]
              } : {
                sections: [{ heading: 'Explication principale', body: formContentText }]
              })
            };

            await setDoc(doc(db, 'learningTopics', id), newTopicDoc, { merge: true });
            alert(`✅ '${formTitle}' a été créé dans Firestore avec succès !\nVous pouvez maintenant lancer la synchronisation RAG.`);
            setFormId('');
            setFormTitle('');
            setFormSummary('');
            setFormContentText('');
          } catch (err: any) {
            alert(`Erreur lors de la création : ${err.message}`);
          }
        }} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                ID Unique (ex: prophet_hud, dua_voyage) :
              </label>
              <input value={formId} onChange={(e) => setFormId(e.target.value)} type="text" required placeholder="prophet_hud" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                Titre (ex: Prophète Hûd) :
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} type="text" required placeholder="Prophète Hûd (Alayhi s-salâm)" style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                <button
                  type="button"
                  onClick={handleGenerateAiDraft}
                  disabled={generatingDraft}
                  className="btn btn-outline"
                  style={{ padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                  title="Demander à l'Agent IA de générer un premier brouillon"
                >
                  <Sparkles size={14} className={generatingDraft ? 'spin' : ''} />
                  <span>{generatingDraft ? 'Génération...' : 'Générer avec l\'IA'}</span>
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                Catégorie :
              </label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                <option value="prophetes">Prophètes (Histoire)</option>
                <option value="duas">Duas & Invocations</option>
                <option value="piliers">Piliers de l'Islam</option>
                <option value="foi">Foi & Tawheed</option>
                <option value="jurisprudence">Jurisprudence (Fiqh)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                Format :
              </label>
              <select value={formFormat} onChange={(e) => setFormFormat(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                <option value="recit">Récit / Histoire</option>
                <option value="fiche">Fiche d'apprentissage</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              Résumé / Synthèse courte :
            </label>
            <input value={formSummary} onChange={(e) => setFormSummary(e.target.value)} type="text" placeholder="Aperçu rapide en 1 ou 2 phrases..." style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              Contenu Principal / Texte du récit :
            </label>
            <textarea value={formContentText} onChange={(e) => setFormContentText(e.target.value)} rows={6} required placeholder="Rédigez l'histoire ou l'explication complète ici (ou cliquez sur 'Générer avec l'IA' pour remplir automatiquement)..." style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.6 }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={16} />
              <span>Valider & Enregistrer dans Firestore</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
