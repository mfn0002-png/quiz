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
import { AppModal, ModalState, ModalType } from './AppModal';
import { ContentPreviewModal, ContentDraft } from './ContentPreviewModal';

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
  const [previewDraft,    setPreviewDraft]    = useState<ContentDraft | null>(null);

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
      const resp = await fetch(`${API_BASE_URL}/admin/rag/generate-content`, {
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
        // ── Format RÉCIT enrichi ──────────────────────────────────────────
        const lines: string[] = [];

        // Note sources
        if (draft.metadata?.sources_note) {
          lines.push(`> **Sources** : ${draft.metadata.sources_note}\n`);
        }

        draft.chapters.forEach((c: any, idx: number) => {
          lines.push(`### ${c.title || `Chapitre ${idx + 1}`}`);
          lines.push('');

          // Blocs (text, source, stats)
          if (Array.isArray(c.blocks) && c.blocks.length > 0) {
            lines.push('**Contenu du chapitre :**');
            c.blocks.forEach((b: any) => {
              if (b.type === 'text') {
                lines.push(b.value);
                lines.push('');
              } else if (b.type === 'source') {
                const src = b.ref?.kind === 'quran' ? `Coran ${b.ref.surah}:${b.ref.ayah}` : 'Source';
                lines.push(`> 📖 **${src}** : ${b.note || ''}`);
                lines.push('');
              } else if (b.type === 'stats' && Array.isArray(b.items)) {
                lines.push(`📊 **Chiffres clés** : ${b.items.map((it: any) => `${it.value} (${it.label})`).join(', ')}`);
                lines.push('');
              }
            });
          } else if (Array.isArray(c.paragraphs) && c.paragraphs.length > 0) {
            lines.push('**Texte narratif :**');
            lines.push(c.paragraphs.join('\n\n'));
            lines.push('');
          }

          // Versets (legacy fallback)
          if (Array.isArray(c.versets) && c.versets.length > 0) {
            lines.push('**Versets :**');
            c.versets.forEach((v: any) => lines.push(`- ${v.ref} — ${v.content}`));
            lines.push('');
          }

          // Glossaire
          const glossaryList = c.glossary || c.glossaire || [];
          if (Array.isArray(glossaryList) && glossaryList.length > 0) {
            lines.push('**Glossaire :**');
            glossaryList.forEach((g: any) => {
              const term = g.term || g.terme;
              const arabic = (g.arabic || g.arabe) ? ` (${g.arabic || g.arabe})` : '';
              lines.push(`- **${term}**${arabic} — ${g.definition}`);
            });
            lines.push('');
          }

          // Checkpoint QCM
          if (c.checkpoint) {
            const cp = c.checkpoint;
            const correctIdx = typeof cp.correctIndex === 'number' ? cp.correctIndex : (typeof cp.answer === 'number' ? cp.answer : 0);
            const explanation = cp.explanation || cp.explication || '';
            lines.push('**Point de contrôle (QCM) :**');
            lines.push(`- Q : « ${cp.question} »`);
            if (Array.isArray(cp.options)) {
              lines.push(`- Options : ${cp.options.map((o: string, oi: number) => `[${oi === correctIdx ? '✓' : ' '}] ${o}`).join(' | ')}`);
            }
            if (explanation) {
              lines.push(`- Explication : ${explanation}`);
            }
            lines.push('');
          }

          lines.push('---');
          lines.push('');
        });

        // Tableau récapitulatif des versets
        const allVersets: any[] = draft.chapters.flatMap((c: any) => c.versets || []);
        if (allVersets.length > 0) {
          lines.push('## Récapitulatif des versets utilisés');
          lines.push('');
          lines.push('| Verset | Contenu |');
          lines.push('|--------|---------|');
          allVersets.forEach((v: any) => lines.push(`| ${v.ref} | ${v.content} |`));
          lines.push('');
        }

        // Métadonnées techniques
        if (draft.metadata) {
          const m = draft.metadata;
          lines.push('## Données techniques');
          lines.push('');
          if (m.nb_chapitres)  lines.push(`- **Chapitres** : ${m.nb_chapitres}`);
          if (m.nb_versets)    lines.push(`- **Versets coraniques** : ${m.nb_versets}`);
          if (m.duree_min)     lines.push(`- **Durée estimée** : ${m.duree_min} min`);
          lines.push('');
        }

        text = lines.join('\n');

      } else if (Array.isArray(draft.sections)) {
        // ── Format FICHE ──────────────────────────────────────────────────
        text = draft.sections.map((s: any) => {
          let block = `### ${s.heading}\n\n${s.body}`;
          if (Array.isArray(s.versets) && s.versets.length > 0) {
            block += '\n\n**Références :**\n' + s.versets.map((v: any) => `- ${v.ref} — ${v.content}`).join('\n');
          }
          return block;
        }).join('\n\n---\n\n');
      }

      setFormContentText(text);
      // Ouvrir directement le popup de previsualisation
      setPreviewDraft({
        id:          draft.id || 'nouveau_sujet',
        title:       draft.title || formTitle.trim(),
        category:    formCategory,
        format:      formFormat,
        summary:     draft.summary || formSummary.trim(),
        contentText: text,
        rawDraft:    draft,
      });

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

  // Ecriture dans Firestore apres validation dans le preview
  const saveToFirestore = async (confirmed: ContentDraft) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');

      // Construction des chapitres ou sections structurés
      let chapters: any[] = [];
      let sections: any[] = [];

      if (confirmed.format === 'recit') {
        if (confirmed.rawDraft && Array.isArray(confirmed.rawDraft.chapters) && confirmed.rawDraft.chapters.length > 0) {
          chapters = confirmed.rawDraft.chapters.map((c: any, idx: number) => {
            const chapterId = c.id || `${confirmed.id}-ch${idx + 1}`;
            const blocks: any[] = [];
            if (Array.isArray(c.blocks) && c.blocks.length > 0) {
              c.blocks.forEach((b: any) => blocks.push(b));
            } else {
              if (Array.isArray(c.paragraphs)) {
                c.paragraphs.forEach((p: string) => {
                  if (p && p.trim()) blocks.push({ type: 'text', value: p });
                });
              }
              if (Array.isArray(c.versets)) {
                c.versets.forEach((v: any) => {
                  const match = v.ref?.match(/Coran\s+(\d+)[:\.](\d+)/i);
                  if (match) {
                    blocks.push({
                      type: 'source',
                      ref: { kind: 'quran', surah: parseInt(match[1], 10), ayah: parseInt(match[2], 10) },
                      note: v.content,
                    });
                  } else if (v.ref) {
                    blocks.push({
                      type: 'text',
                      value: `📖 ${v.ref} : ${v.content || ''}`,
                    });
                  }
                });
              }
            }
            const rawGlossary = c.glossary || c.glossaire || [];
            const glossary = Array.isArray(rawGlossary)
              ? rawGlossary.map((g: any) => ({
                  term: g.term || g.terme || '',
                  definition: g.definition || '',
                  arabic: g.arabic || g.arabe || '',
                })).filter((g: any) => g.term && g.definition)
              : [];

            let checkpoint = undefined;
            if (c.checkpoint && c.checkpoint.question) {
              checkpoint = {
                question: c.checkpoint.question,
                options: Array.isArray(c.checkpoint.options) ? c.checkpoint.options : [],
                correctIndex: typeof c.checkpoint.correctIndex === 'number'
                  ? c.checkpoint.correctIndex
                  : (typeof c.checkpoint.answer === 'number' ? c.checkpoint.answer : 0),
                explanation: c.checkpoint.explanation || c.checkpoint.explication || '',
              };
            }

            return {
              id: chapterId,
              label: c.label || c.title?.replace(/^Chapitre\s+\d+\s*[-—:]\s*/i, '') || `Chapitre ${idx + 1}`,
              title: c.title || `Chapitre ${idx + 1}`,
              blocks: blocks.length > 0 ? blocks : [{ type: 'text', value: confirmed.contentText }],
              glossary,
              checkpoint,
            };
          });
        } else {
          // Création manuelle : découpage par sections markdown (###)
          const parts = confirmed.contentText.split(/(?=^###\s+)/m).filter(p => p.trim());
          if (parts.length > 1) {
            chapters = parts.map((part, idx) => {
              const lines = part.trim().split('\n');
              const headingLine = lines[0].replace(/^###\s+/, '').trim();
              const body = lines.slice(1).join('\n').trim();
              return {
                id: `${confirmed.id}-ch${idx + 1}`,
                label: headingLine.replace(/^Chapitre\s+\d+\s*[-—:]\s*/i, '') || `Chapitre ${idx + 1}`,
                title: headingLine || `Chapitre ${idx + 1}`,
                blocks: [{ type: 'text', value: body || headingLine }],
              };
            });
          } else {
            chapters = [{
              id: `${confirmed.id}-ch1`,
              label: 'Récit',
              title: confirmed.title,
              blocks: [{ type: 'text', value: confirmed.contentText }],
            }];
          }
        }
      } else {
        // Format Fiche
        if (confirmed.rawDraft && Array.isArray(confirmed.rawDraft.sections) && confirmed.rawDraft.sections.length > 0) {
          sections = confirmed.rawDraft.sections.map((s: any, idx: number) => ({
            id: s.id || `${confirmed.id}-sec${idx + 1}`,
            heading: s.heading || `Section ${idx + 1}`,
            blocks: Array.isArray(s.blocks) && s.blocks.length > 0 ? s.blocks : [{ type: 'text', value: s.body || '' }],
            glossary: s.glossary || s.glossaire || [],
          }));
        } else {
          const parts = confirmed.contentText.split(/(?=^###\s+)/m).filter(p => p.trim());
          if (parts.length > 1) {
            sections = parts.map((part, idx) => {
              const lines = part.trim().split('\n');
              const headingLine = lines[0].replace(/^###\s+/, '').trim();
              const body = lines.slice(1).join('\n').trim();
              return {
                id: `${confirmed.id}-sec${idx + 1}`,
                heading: headingLine || `Section ${idx + 1}`,
                blocks: [{ type: 'text', value: body || headingLine }],
              };
            });
          } else {
            sections = [{
              id: `${confirmed.id}-sec1`,
              heading: confirmed.title,
              blocks: [{ type: 'text', value: confirmed.contentText }],
            }];
          }
        }
      }

      const raw = confirmed.rawDraft || {};
      const newTopicDoc = {
        id: confirmed.id,
        title: confirmed.title,
        subtitle: raw.subtitle || (confirmed.summary ? (confirmed.summary.length > 90 ? confirmed.summary.slice(0, 90) + '...' : confirmed.summary) : ''),
        category: confirmed.category,
        format: confirmed.format,
        icon: raw.icon || (confirmed.category === 'prophetes' ? '🌿' : confirmed.category === 'duas' ? '🤲' : '📖'),
        gradient: raw.gradient || (confirmed.category === 'prophetes'
          ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
          : confirmed.category === 'duas'
          ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
          : 'linear-gradient(135deg, #059669 0%, #10b981 100%)'),
        badge: raw.badge || (confirmed.category === 'prophetes' ? 'Prophète' : 'Apprentissage'),
        summary: confirmed.summary,
        published: true,
        order: raw.order ?? 999,
        revision: raw.revision ?? 1,
        quizCategoryTarget: raw.quizCategoryTarget || (confirmed.category === 'prophetes' ? 'Prophètes' : undefined),
        estimatedMinutes: raw.estimatedMinutes || (confirmed.format === 'recit' ? Math.max(3, (chapters.length || 1) * 3) : undefined),
        createdAt: new Date().toISOString(),
        ...(confirmed.format === 'recit' ? { chapters } : { sections }),
      };

      await setDoc(doc(db, 'learningTopics', confirmed.id), newTopicDoc, { merge: true });
      setPreviewDraft(null);
      showModal('success', 'Contenu enregistre !',
        `"${confirmed.title}" a ete sauvegarde dans Firestore.\n\nLancez la synchronisation RAG pour l'indexer dans Supabase.`);
      // Reset form
      setFormId(''); setFormTitle(''); setFormSummary(''); setFormContentText('');
    } catch (err: any) {
      setPreviewDraft(null);
      showModal('error', 'Erreur lors de la creation', err.message);
    }
  };

  return (
    <>
      <AppModal modal={modal} onClose={closeModal} />
      <ContentPreviewModal
        draft={previewDraft}
        onClose={() => setPreviewDraft(null)}
        onConfirm={saveToFirestore}
      />

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
            onSubmit={(e) => {
              e.preventDefault();
              if (!formId.trim() || !formTitle.trim() || !formContentText.trim()) {
                showModal('warning', 'Champs requis manquants',
                  'Veuillez renseigner les trois champs obligatoires :\n• ID Unique\n• Titre\n• Contenu principal');
                return;
              }
              // Ouvrir le popup de previsualisation avant d'ecrire dans Firestore
              setPreviewDraft({
                id:          formId.trim(),
                title:       formTitle.trim(),
                category:    formCategory,
                format:      formFormat,
                summary:     formSummary.trim(),
                contentText: formContentText,
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
          >
            {/* Banniere d'information en cours de generation */}
            {generatingDraft && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.9rem 1.2rem',
                backgroundColor: 'rgba(5, 150, 105, 0.09)',
                border: '1px solid rgba(5, 150, 105, 0.35)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
              }}>
                <RefreshCw size={20} className="spin" style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-color)' }}>
                    Génération IA en cours...
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Recherche des sources authentiques (Coran &amp; Hadiths) et structuration des chapitres. Veuillez patienter quelques secondes sans relancer.
                  </div>
                </div>
              </div>
            )}

            {/* Ligne 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">ID Unique (ex: prophet_hud)</label>
                <input className="form-input" type="text" required value={formId} disabled={generatingDraft}
                  onChange={(e) => setFormId(e.target.value)} placeholder="prophete_hud" />
              </div>
              <div>
                <label className="form-label">Categorie</label>
                <select className="form-select" value={formCategory} disabled={generatingDraft} onChange={(e) => setFormCategory(e.target.value)}>
                  <option value="prophetes">Prophetes (Histoire)</option>
                  <option value="duas">Duas et Invocations</option>
                  <option value="piliers">Piliers de l'Islam</option>
                  <option value="foi">Foi et Tawheed</option>
                  <option value="jurisprudence">Jurisprudence (Fiqh)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Format</label>
                <select className="form-select" value={formFormat} disabled={generatingDraft} onChange={(e) => setFormFormat(e.target.value)}>
                  <option value="recit">Recit / Histoire</option>
                  <option value="fiche">Fiche d'apprentissage</option>
                </select>
              </div>
            </div>

            {/* Ligne 2 : Titre + bouton IA */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Titre</label>
                <button
                  type="button"
                  onClick={handleGenerateAiDraft}
                  disabled={generatingDraft}
                  className="btn btn-outline"
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                    opacity: generatingDraft ? 0.65 : 1,
                    cursor: generatingDraft ? 'not-allowed' : 'pointer',
                  }}
                  title={generatingDraft ? "Génération déjà en cours..." : "L'Agent IA génère un premier brouillon"}
                >
                  {generatingDraft ? (
                    <RefreshCw size={13} className="spin" style={{ color: 'var(--primary-color)' }} />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{generatingDraft ? 'Génération en cours...' : "Générer avec l'IA"}</span>
                </button>
              </div>
              <input className="form-input" type="text" required value={formTitle} disabled={generatingDraft}
                onChange={(e) => setFormTitle(e.target.value)} placeholder="Prophete Hud (Alayhi s-salam)" />
            </div>

            {/* Ligne 3 : Resume */}
            <div>
              <label className="form-label">Resume / Synthese courte</label>
              <input className="form-input" type="text" value={formSummary} disabled={generatingDraft}
                onChange={(e) => setFormSummary(e.target.value)} placeholder="Apercu rapide en 1 ou 2 phrases..." />
            </div>

            {/* Ligne 4 : Contenu */}
            <div>
              <label className="form-label">Contenu Principal / Texte du recit</label>
              <textarea className="form-textarea" value={formContentText} rows={8} required disabled={generatingDraft}
                onChange={(e) => setFormContentText(e.target.value)}
                placeholder="Redigez l'histoire ou l'explication complete ici..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={generatingDraft}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.3rem',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: generatingDraft ? 0.6 : 1,
                  cursor: generatingDraft ? 'not-allowed' : 'pointer',
                }}
              >
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
