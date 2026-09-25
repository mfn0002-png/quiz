import { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, CheckCircle, AlertTriangle, Lock, Save } from 'lucide-react';

import { User } from '../../firebase';
import { useAdminRole } from '../../hooks/useAdminRole';
import { setGlobalLifeConfig, getRechargeIntervalSeconds, getMaxLives } from '../../services/livesService';
import { AppModal } from './AppModal';
import { ContentPreviewModal } from './ContentPreviewModal';
import { RagSyncSection } from './RagSyncSection';
import { AiModelSection } from './AiModelSection';
import { QuizConfigSection } from './QuizConfigSection';
import { TopicListSection } from './TopicListSection';
import { ContentCreatorSection } from './ContentCreatorSection';
import { ModalState, ModalType, ContentDraft, TopicSummaryAdmin, SyncResult } from './types';

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
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
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
  const [lifeRechargeSeconds, setLifeRechargeSeconds] = useState(() => getRechargeIntervalSeconds());
  const [maxLives,            setMaxLives]            = useState(() => getMaxLives());

  // Topics management state
  const [topics, setTopics]                   = useState<TopicSummaryAdmin[]>([]);
  const [loadingTopics, setLoadingTopics]     = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  // Content creator state
  const [formId,          setFormId]          = useState('');
  const [formTitle,       setFormTitle]       = useState('');
  const [formCategory,    setFormCategory]    = useState('prophetes');
  const [formFormat,      setFormFormat]      = useState('recit');
  const [formSummary,     setFormSummary]     = useState('');
  const [formContentText, setFormContentText] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [previewDraft,    setPreviewDraft]    = useState<ContentDraft | null>(null);

  // Fetch topics list
  const fetchTopics = useCallback(async () => {
    try {
      setLoadingTopics(true);
      const resp = await fetch(`${API_BASE_URL}/admin/rag/topics`, {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || '',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.data)) {
          setTopics(data.data);
        }
      }
    } catch (err) {
      console.warn('Impossible de charger les fiches :', err);
    } finally {
      setLoadingTopics(false);
    }
  }, [user]);

  // Load initial settings and topics
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE_URL}/admin/rag/settings`, {
          headers: {
            'x-user-id': user?.uid || '',
            'x-user-email': user?.email || '',
          },
        });
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
            if (typeof data.config.quiz.lifeRechargeSeconds === 'number') {
              setLifeRechargeSeconds(data.config.quiz.lifeRechargeSeconds);
            }
            if (typeof data.config.quiz.maxLives === 'number') {
              setMaxLives(data.config.quiz.maxLives);
            }
            setGlobalLifeConfig({
              rechargeSeconds: data.config.quiz.lifeRechargeSeconds,
              maxLives: data.config.quiz.maxLives,
            });
          }
        }
      } catch (err) {
        console.warn('Impossible de charger la config :', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
    fetchTopics();
  }, [fetchTopics, user]);

  // ── Handlers Collections ──────────────────────────────────
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
      `Vos données dans Firestore ne seront PAS supprimées. Seule la synchronisation vers Supabase est concernée.\n\n` +
      `Vous pourrez la réajouter à tout moment.`,
      () => setCollections(collections.filter((c) => c !== colName))
    );
  };

  // ── Handler Delete Topic ──────────────────────────────────
  const handleDeleteTopic = (topic: TopicSummaryAdmin) => {
    if (topic.source === 'local') {
      showModal(
        'info',
        'Fiche intégrée par défaut (Code source)',
        `"${topic.title}" fait partie du catalogue de base intégré localement.\n\n` +
        `Pour la remplacer ou la modifier, vous pouvez créer une fiche portant le même identifiant ("${topic.id}") dans Firestore.`
      );
      return;
    }

    showModal(
      'confirm',
      `Supprimer la fiche "${topic.title}" ?`,
      `Cette action supprimera définitivement cette fiche de Firestore, videra le cache serveur et retirera ses données vectorielles RAG.\n\n` +
      `Êtes-vous sûr de vouloir supprimer définitivement "${topic.id}" ?`,
      async () => {
        try {
          setDeletingTopicId(topic.id);
          const resp = await fetch(`${API_BASE_URL}/admin/rag/topics/${encodeURIComponent(topic.id)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user?.uid || '',
              'x-user-email': user?.email || '',
            },
          });
          const data = await resp.json();
          if (!resp.ok || !data.success) {
            throw new Error(data.error || 'Erreur lors de la suppression');
          }
          setTopics((prev) => prev.filter((t) => t.id !== topic.id));
          showModal('success', 'Fiche supprimée !', `La fiche "${topic.title}" a été supprimée avec succès.`);
        } catch (err: any) {
          showModal('error', 'Échec de la suppression', err.message);
        } finally {
          setDeletingTopicId(null);
        }
      }
    );
  };

  // ── Save global config ────────────────────────────────────
  const handleSaveSettings = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/rag/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({
          rag: { model: ragModel, embeddingModel, topK, minSimilarityScore, collectionsToSync: collections },
          quiz: { defaultQuestionCount, timerSeconds, lifeRechargeSeconds, maxLives },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erreur lors de la sauvegarde');
      setGlobalLifeConfig({ rechargeSeconds: lifeRechargeSeconds, maxLives });
      setSuccessMessage('Paramètres sauvegardés avec succès !');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Trigger RAG Sync ──────────────────────────────────────
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
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({ forceReindex, collections }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erreur lors de la synchronisation RAG');
      setSyncResult(data.data);
      setSuccessMessage('Synchronisation Firebase vers Supabase effectuée !');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ── Generate AI Draft ─────────────────────────────────────
  const handleGenerateAiDraft = async () => {
    if (!formTitle.trim()) {
      showModal(
        'warning',
        'Titre requis',
        'Veuillez saisir le titre ou le sujet avant de lancer la génération IA.\n\nExemple : "Prophète Salih" ou "Invocations de la pluie".'
      );
      return;
    }
    setGeneratingDraft(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/admin/rag/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || '',
        },
        body: JSON.stringify({ subject: formTitle.trim(), category: formCategory, format: formFormat }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Erreur lors de la génération');
      const draft = data.draft;
      setFormId(draft.id || 'nouveau_sujet');
      if (draft.title)   setFormTitle(draft.title);
      if (draft.summary) setFormSummary(draft.summary);

      let text = '';

      if (Array.isArray(draft.chapters)) {
        const lines: string[] = [];
        if (draft.metadata?.sources_note) {
          lines.push(`> **Sources** : ${draft.metadata.sources_note}\n`);
        }

        draft.chapters.forEach((c: any, idx: number) => {
          lines.push(`### ${c.title || `Chapitre ${idx + 1}`}`);
          lines.push('');

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

          if (Array.isArray(c.versets) && c.versets.length > 0) {
            lines.push('**Versets :**');
            c.versets.forEach((v: any) => lines.push(`- ${v.ref} — ${v.content}`));
            lines.push('');
          }

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

        text = lines.join('\n');
      } else if (Array.isArray(draft.sections)) {
        text = draft.sections.map((s: any) => {
          let block = `### ${s.heading}\n\n${s.body}`;
          if (Array.isArray(s.versets) && s.versets.length > 0) {
            block += '\n\n**Références :**\n' + s.versets.map((v: any) => `- ${v.ref} — ${v.content}`).join('\n');
          }
          return block;
        }).join('\n\n---\n\n');
      }

      setFormContentText(text);
      setPreviewDraft({
        id:          draft.id || 'nouveau_sujet',
        title:       draft.title || formTitle.trim(),
        category:    formCategory,
        format:      formFormat as 'recit' | 'fiche',
        summary:     draft.summary || formSummary.trim(),
        contentText: text,
        rawDraft:    draft,
      });

    } catch (err: any) {
      showModal('error', 'Échec de la génération IA', err.message);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // ── Save to Firestore ─────────────────────────────────────
  const saveToFirestore = async (confirmed: ContentDraft) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');

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
                    blocks.push({ type: 'text', value: `📖 ${v.ref} : ${v.content || ''}` });
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
      fetchTopics();
      setPreviewDraft(null);
      showModal('success', 'Contenu enregistré !',
        `"${confirmed.title}" a été sauvegardé dans Firestore.\n\nLancez la synchronisation RAG pour l'indexer dans Supabase.`);
      // Reset form
      setFormId(''); setFormTitle(''); setFormSummary(''); setFormContentText('');
    } catch (err: any) {
      setPreviewDraft(null);
      showModal('error', 'Erreur lors de la création', err.message);
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

  // ── Accès refusé ──────────────────────────────────────────
  if (!user || !isAdmin) {
    return (
      <div style={{ maxWidth: '560px', margin: '3rem auto', padding: '2.5rem', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Lock size={30} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>Accès Restreint</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
          Cette section est réservée aux administrateurs autorisés.
        </p>
      </div>
    );
  }

  // ── Layout Principal ──────────────────────────────────────
  return (
    <>
      <AppModal modal={modal} onClose={closeModal} />
      <ContentPreviewModal
        draft={previewDraft}
        onClose={() => setPreviewDraft(null)}
        onConfirm={saveToFirestore}
      />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem 7rem' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(5, 150, 105, 0.15)', color: 'var(--primary-color)' }}>
                <Settings size={22} />
              </div>
              <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                Administration &amp; Paramètres
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', margin: 0 }}>
              Gestion de l'IA Gemini, synchronisation RAG Firebase vers Supabase et réglages globaux.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.3rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}
          >
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            <span>Enregistrer les modifications</span>
          </button>
        </div>

        {/* Bandeaux de notification */}
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

        {/* 1. Synchronisation RAG */}
        <RagSyncSection
          collections={collections}
          newCollectionInput={newCollectionInput}
          setNewCollectionInput={setNewCollectionInput}
          onAddCollection={handleAddCollection}
          onRemoveCollection={handleRemoveCollection}
          syncing={syncing}
          syncResult={syncResult}
          onSyncRag={handleSyncRag}
        />

        {/* 2. Modèle IA */}
        <AiModelSection
          ragModel={ragModel}
          setRagModel={setRagModel}
          embeddingModel={embeddingModel}
          setEmbeddingModel={setEmbeddingModel}
          topK={topK}
          setTopK={setTopK}
          minSimilarityScore={minSimilarityScore}
          setMinSimilarityScore={setMinSimilarityScore}
        />

        {/* 3. Paramètres Quiz */}
        <QuizConfigSection
          defaultQuestionCount={defaultQuestionCount}
          setDefaultQuestionCount={setDefaultQuestionCount}
          timerSeconds={timerSeconds}
          setTimerSeconds={setTimerSeconds}
          lifeRechargeSeconds={lifeRechargeSeconds}
          setLifeRechargeSeconds={setLifeRechargeSeconds}
          maxLives={maxLives}
          setMaxLives={setMaxLives}
        />

        {/* 4. Gestion et Suppression des Fiches */}
        <TopicListSection
          topics={topics}
          loadingTopics={loadingTopics}
          deletingTopicId={deletingTopicId}
          onRefreshTopics={fetchTopics}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* 5. Créateur de Contenu */}
        <ContentCreatorSection
          formId={formId}
          setFormId={setFormId}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          formFormat={formFormat}
          setFormFormat={setFormFormat}
          formSummary={formSummary}
          setFormSummary={setFormSummary}
          formContentText={formContentText}
          setFormContentText={setFormContentText}
          generatingDraft={generatingDraft}
          onGenerateAiDraft={handleGenerateAiDraft}
          onSubmitForm={(e) => {
            e.preventDefault();
            if (!formId.trim() || !formTitle.trim() || !formContentText.trim()) {
              showModal(
                'warning',
                'Champs requis manquants',
                'Veuillez renseigner les trois champs obligatoires :\n• ID Unique\n• Titre\n• Contenu principal'
              );
              return;
            }
            setPreviewDraft({
              id:          formId.trim(),
              title:       formTitle.trim(),
              category:    formCategory,
              format:      formFormat as 'recit' | 'fiche',
              summary:     formSummary.trim(),
              contentText: formContentText,
            });
          }}
        />
      </div>
    </>
  );
}
