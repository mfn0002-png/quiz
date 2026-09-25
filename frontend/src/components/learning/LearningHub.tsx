import React, { useState, useMemo, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Sparkles, BookOpen, Play, ChevronRight, ChevronLeft,
  X, Share2, Check, CheckCircle2, Clock, Layers, Users,
} from 'lucide-react';
import {
  LearningTopic, TopicSummary, Chapter, Section, ContentBlock, GlossaryTerm,
  Checkpoint, TopicProgress, isRecit,
} from '../../types/learning';
import { LEARNING_CATEGORIES } from '../../constants';
import { useLearningContent, useTopicDetail } from '../../hooks/useLearningContent';
import { useTopicProgress } from '../../hooks/useTopicProgress';
import { SourceBlock } from './SourceBlock';
import { HadithExplorerModal } from './HadithExplorerModal';
import { Difficulty } from '../../data/questions';

interface LearningHubProps {
  onStartQuizWithCategory?: (category: string, difficulty?: Difficulty) => void;
}

/* ================================================================== */
/* Error Boundary pour sécuriser l'affichage des fiches               */
/* ================================================================== */

class TopicErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('⚠️ [TopicErrorBoundary] Erreur DOM ou rendu :', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(5, 10, 20, 0.82)',
            backdropFilter: 'blur(10px)',
            padding: '1.25rem',
          }}
          onClick={this.props.onClose}
        >
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-2xl)',
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              maxWidth: '440px',
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔄</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Affichage interrompu
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Une extension de traduction ou un rechargement DOM a perturbé la navigation.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                <span>Recharger la fiche</span>
              </button>
              <button
                className="btn btn-outline"
                onClick={this.props.onClose}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                <span>Fermer</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      );
    }
    return this.props.children;
  }
}

/* ================================================================== */
/* Rendu des blocs — partagé entre fiche et récit                      */
/* ================================================================== */

function BlockRenderer({ block }: { block: ContentBlock }) {
  const [flipped, setFlipped] = useState(false);

  switch (block.type) {
    case 'text':
      return (
        <p style={{ fontSize: '1rem', lineHeight: 1.7, marginBottom: '1rem', maxWidth: '62ch' }}>
          {block.value}
        </p>
      );

    case 'list':
      return (
        <ul style={{ margin: '0 0 1rem', paddingLeft: '1.1rem', maxWidth: '62ch' }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '0.4rem' }}>
              {item}
            </li>
          ))}
        </ul>
      );

    case 'source':
      // Résolution paresseuse : le texte arabe vient du backend, jamais du bundle.
      return <SourceBlock refSource={block.ref} note={block.note} />;

    case 'static-quote':
      // Contenu figé et vérifié à la rédaction — pas d'appel réseau, contrairement à 'source'.
      return (
        <figure
          style={{
            margin: '1.25rem 0',
            padding: '1.1rem 1.25rem',
            maxWidth: '62ch',
            borderRadius: 'var(--radius-lg)',
            borderLeft: '3px solid var(--secondary-color)',
            backgroundColor: 'var(--surface-color-subtle)',
          }}
        >
          <p className="arabic-text" dir="rtl" lang="ar" style={{ fontSize: '1.4rem', lineHeight: 2, marginBottom: '0.75rem', textAlign: 'right' }}>
            {block.arabic}
          </p>
          {block.phonetic && (
            <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              {block.phonetic}
            </p>
          )}
          <p style={{ fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '0.6rem' }}>{block.translation}</p>
          <figcaption style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary-color)' }}>
            <span>{block.citation}</span>
          </figcaption>
        </figure>
      );

    case 'stats':
      return (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1.25rem 0' }}>
          {block.items.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: '130px',
                padding: '0.9rem 1.1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--surface-color-subtle)',
              }}
            >
              <b style={{ display: 'block', fontSize: '1.3rem', color: 'var(--primary-light)' }}>
                {s.value}
              </b>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      );

    case 'flip':
      return (
        <button
          onClick={() => setFlipped(f => !f)}
          aria-label={flipped ? 'Revenir au recto' : 'Retourner la carte'}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '440px',
            textAlign: 'left',
            margin: '1.25rem 0',
            padding: '1.1rem 1.25rem',
            minHeight: '120px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--surface-color-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            transition: 'all var(--transition-fast)',
          }}
        >
          {flipped ? (
            <>
              {block.sourceRef
                ? <SourceBlock refSource={block.sourceRef} compact />
                : <div className="arabic-text">{block.back}</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: '1rem', marginBottom: '0.6rem' }}>{block.front}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Touchez pour révéler</span>
              </div>
            </>
          )}
        </button>
      );
  }
}

/* ================================================================== */
/* Glossaire cliquable                                                 */
/* ================================================================== */

function Glossary({ terms }: { terms: GlossaryTerm[] }) {
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  useEffect(() => {
    setOpenTerm(null);
  }, [terms]);

  const active = terms.find(t => t.term === openTerm);

  return (
    <div style={{ margin: '1.25rem 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {terms.map(t => {
          const isOpen = openTerm === t.term;
          return (
            <button
              key={t.term}
              onClick={() => setOpenTerm(isOpen ? null : t.term)}
              aria-expanded={isOpen}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                backgroundColor: isOpen ? 'var(--primary-color)' : 'rgba(5, 150, 105, 0.12)',
                color: isOpen ? '#ffffff' : 'var(--primary-light)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>{t.term}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingLeft: '1rem',
            borderLeft: '2px solid var(--primary-color)',
            fontSize: '0.92rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '58ch',
          }}
        >
          {active.arabic && (
            <span className="arabic-text" style={{ display: 'block', marginBottom: '0.35rem' }}>
              {active.arabic}
            </span>
          )}
          <span>{active.definition}</span>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Point de contrôle                                                   */
/* ================================================================== */

function CheckpointBox({
  checkpoint,
  onAnswer,
}: {
  checkpoint: Checkpoint;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [checkpoint]);

  const answered = picked !== null;

  const handlePick = (i: number) => {
    if (answered) return;
    setPicked(i);
    onAnswer(i === checkpoint.correctIndex);
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '1.5rem 0',
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--surface-color-subtle)',
        border: '1px solid var(--border-color)',
      }}
    >
      <h4 style={{ margin: '0 0 0.9rem', fontSize: '1rem' }}>Point de contrôle</h4>
      <p style={{ fontSize: '0.95rem', marginBottom: '0.85rem' }}>{checkpoint.question}</p>

      {checkpoint.options.map((opt, i) => {
        const isCorrect = i === checkpoint.correctIndex;
        const showCorrect = answered && isCorrect;
        const showWrong = answered && picked === i && !isCorrect;

        return (
          <button
            key={i}
            onClick={() => handlePick(i)}
            disabled={answered}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              marginBottom: '0.5rem',
              padding: '0.7rem 0.9rem',
              fontSize: '0.92rem',
              fontFamily: 'inherit',
              cursor: answered ? 'default' : 'pointer',
              color: 'var(--text-primary)',
              borderRadius: '0.6rem',
              border: `1px solid ${
                showCorrect ? 'var(--primary-color)' : showWrong ? '#ef4444' : 'var(--border-color)'
              }`,
              backgroundColor: showCorrect
                ? 'rgba(5, 150, 105, 0.2)'
                : showWrong
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(148, 163, 184, 0.06)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span>{opt}</span>
          </button>
        );
      })}

      {answered && (
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.6rem', lineHeight: 1.6 }}>
          <span>{checkpoint.explanation}</span>
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/* Viewer unifié — fiche ET récit                                      */
/* ================================================================== */

interface TopicViewerProps {
  topic: LearningTopic;
  progress: TopicProgress | undefined;
  onClose: () => void;
  onUnitSeen: (unitId: string) => void;
  onCheckpoint: (chapterId: string, correct: boolean) => void;
  onStartQuiz: (topic: LearningTopic) => void;
}

function TopicViewer({
  topic, progress, onClose, onUnitSeen, onCheckpoint, onStartQuiz,
}: TopicViewerProps) {
  const recit = isRecit(topic);

  // Normalisation résiliente des unités (chapitres ou sections)
  // Assure que chaque unité a un id unique, un libellé, et des blocks valides
  const units: (Chapter | Section)[] = useMemo(() => {
    const raw: any[] = recit ? (topic.chapters || []) : (topic.sections || []);
    if (raw.length === 0) {
      return [{
        id: `${topic.id}-main`,
        label: topic.title,
        title: topic.title,
        heading: topic.title,
        blocks: [
          { type: 'text', value: topic.summary || 'Contenu en cours de rédaction.' },
        ],
      } as any];
    }

    return raw.map((u: any, idx: number) => {
      const id = u.id || (recit ? `${topic.id}-ch${idx + 1}` : `${topic.id}-sec${idx + 1}`);
      const label = u.label || u.title || (recit ? `Chapitre ${idx + 1}` : `Section ${idx + 1}`);
      const title = u.title || u.heading || label;
      const heading = u.heading || u.title || label;

      let blocks: ContentBlock[] = Array.isArray(u.blocks) ? u.blocks : [];
      if (blocks.length === 0) {
        if (Array.isArray(u.paragraphs) && u.paragraphs.length > 0) {
          blocks = u.paragraphs.map((p: string) => ({ type: 'text', value: p }));
        } else if (typeof u.body === 'string' && u.body) {
          blocks = [{ type: 'text', value: u.body }];
        } else if (typeof u.contentText === 'string' && u.contentText) {
          blocks = [{ type: 'text', value: u.contentText }];
        } else if (typeof u.content === 'string' && u.content) {
          blocks = [{ type: 'text', value: u.content }];
        } else if (typeof u.text === 'string' && u.text) {
          blocks = [{ type: 'text', value: u.text }];
        }
      }

      let glossary: GlossaryTerm[] = [];
      const rawGlossary = u.glossary || u.glossaire;
      if (Array.isArray(rawGlossary)) {
        glossary = rawGlossary.map((g: any) => ({
          term: g.term || g.terme || '',
          definition: g.definition || '',
          arabic: g.arabic || g.arabe,
        })).filter((g: any) => g.term && g.definition);
      }

      let checkpoint = u.checkpoint;
      if (checkpoint && typeof checkpoint === 'object') {
        checkpoint = {
          question: checkpoint.question || '',
          options: Array.isArray(checkpoint.options) ? checkpoint.options : [],
          correctIndex: typeof checkpoint.correctIndex === 'number'
            ? checkpoint.correctIndex
            : (typeof checkpoint.answer === 'number' ? checkpoint.answer : 0),
          explanation: checkpoint.explanation || checkpoint.explication || '',
        };
      } else {
        checkpoint = undefined;
      }

      return {
        ...u,
        id,
        label,
        title,
        heading,
        blocks,
        glossary,
        checkpoint,
      };
    });
  }, [topic, recit]);

  // En mode fiche, tout est affiché d'un bloc ; en mode récit, un chapitre à la fois.
  const [index, setIndex] = useState(0);
  const currentUnit = units[index] || units[0];

  useEffect(() => {
    if (recit && currentUnit) onUnitSeen(currentUnit.id);
  }, [recit, currentUnit, onUnitSeen]);

  // Navigation clavier — seulement pertinente en mode récit.
  useEffect(() => {
    if (!recit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, Math.max(0, units.length - 1)));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recit, units.length, onClose]);

  const isLast = index >= units.length - 1;

  const renderUnit = (unit: any, showTitle: boolean) => {
    if (!unit) return null;
    const heading = 'label' in unit ? (unit.title || unit.label) : (unit.heading || unit.title);
    const blocks: ContentBlock[] = Array.isArray(unit.blocks) ? unit.blocks : [];
    return (
      <div key={unit.id} className="slide-up" style={{ marginBottom: recit ? 0 : '2rem' }}>
        {showTitle && (
          <h3 style={{ fontSize: recit ? '1.65rem' : '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            <span>{heading}</span>
          </h3>
        )}
        {blocks.map((b, i) => (
          <BlockRenderer key={`${unit.id}-block-${i}`} block={b} />
        ))}
        {unit.glossary && unit.glossary.length > 0 && (
          <Glossary key={`${unit.id}-glossary`} terms={unit.glossary} />
        )}
        {unit.checkpoint && (
          <CheckpointBox
            key={`${unit.id}-checkpoint`}
            checkpoint={unit.checkpoint}
            onAnswer={correct => onCheckpoint(unit.id, correct)}
          />
        )}
      </div>
    );
  };

  // Lock body scroll strictly when modal is open and restore on unmount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={topic.title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 10, 20, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '1.25rem',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-color)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Fixed top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 2rem',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
            backgroundColor: 'var(--surface-color)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              aria-hidden
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                borderRadius: 'var(--radius-xl)',
                background: topic.gradient || 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              }}
            >
              {topic.icon || '📖'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(5, 150, 105, 0.15)',
                    color: 'var(--primary-color)',
                  }}
                >
                  {topic.badge || (recit ? 'Récit' : 'Fiche')}
                </span>
                {recit && topic.estimatedMinutes && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {topic.estimatedMinutes} min
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>{topic.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'var(--surface-color-subtle)',
              color: 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content area */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '2rem 2.5rem',
          }}
        >
          <div style={{ maxWidth: recit ? '920px' : '720px', margin: '0 auto' }}>
            {recit ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 200px) minmax(0, 1fr)', gap: '2.5rem', alignItems: 'start' }}>
                {/* Rail de chapitres */}
                <nav
                  aria-label="Chapitres"
                  style={{
                    position: 'sticky',
                    top: 0,
                    alignSelf: 'start',
                    backgroundColor: 'var(--surface-color)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.6rem', paddingLeft: '0.4rem' }}>
                    Chapitres ({units.length})
                  </div>
                  {units.map((ch: any, i: number) => {
                    const isActive = i === index;
                    const isDone = Boolean(progress?.completedUnits?.includes(ch.id));
                    return (
                      <button
                        key={ch.id || `chapter-${i}`}
                        onClick={() => setIndex(i)}
                        aria-current={isActive ? 'step' : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.7rem',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.65rem 0.75rem',
                          marginBottom: '0.25rem',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '0.86rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                          backgroundColor: isActive ? 'rgba(5, 150, 105, 0.12)' : 'transparent',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: '14px',
                            height: '14px',
                            flexShrink: 0,
                            borderRadius: '50%',
                            border: `2px solid ${isDone ? 'var(--primary-color)' : isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            backgroundColor: isDone ? 'var(--primary-color)' : 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isDone && <Check size={10} color="#fff" />}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {i + 1}. {ch.label || ch.title}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <div
                    style={{
                      height: '4px',
                      marginBottom: '1.75rem',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--border-color)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${((index + 1) / units.length) * 100}%`,
                        backgroundColor: 'var(--primary-color)',
                        transition: 'width var(--transition-normal)',
                      }}
                    />
                  </div>

                  {renderUnit(currentUnit, true)}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      className="btn btn-outline"
                      disabled={index === 0}
                      onClick={() => setIndex(i => Math.max(0, i - 1))}
                      style={{ borderRadius: 'var(--radius-full)', opacity: index === 0 ? 0.35 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <ChevronLeft size={16} />
                      <span>Précédent</span>
                    </button>

                    {isLast ? (
                      topic.quizCategoryTarget ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => onStartQuiz(topic)}
                          style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <Play size={16} style={{ fill: 'currentColor' }} />
                          <span>Tester mes connaissances en quiz</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={onClose}
                          style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <span>Terminer la lecture</span>
                        </button>
                      )
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => setIndex(i => Math.min(units.length - 1, i + 1))}
                        style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <span>Chapitre suivant</span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
                  {topic.subtitle}
                </p>
                {units.map((s: any, idx: number) => (
                  <div key={s.id || `section-${idx}`}>
                    {renderUnit(s, true)}
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '2rem' }}>
                  <button className="btn btn-outline" onClick={onClose} style={{ borderRadius: 'var(--radius-full)' }}>
                    Fermer
                  </button>
                  {topic.quizCategoryTarget && (
                    <button
                      className="btn btn-primary"
                      onClick={() => onStartQuiz(topic)}
                      style={{ borderRadius: 'var(--radius-full)' }}
                    >
                      <Play size={16} style={{ fill: 'currentColor' }} />
                      Lancer le quiz sur ce thème
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ================================================================== */
/* Modal Sélecteur de Prophètes (portallé)                            */
/* ================================================================== */

function ProphetPickerModal({
  prophetTopics,
  progressRatio,
  onSelect,
  onClose,
}: {
  prophetTopics: TopicSummary[];
  progressRatio: (t: TopicSummary) => number;
  onSelect: (topic: TopicSummary) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');

  // Verrouillage strict du scroll du body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fermeture touche Echap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return prophetTopics;
    return prophetTopics.filter(t =>
      [t.title, t.subtitle, t.summary].join(' ').toLowerCase().includes(q),
    );
  }, [prophetTopics, filter]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sélectionner un prophète"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 10, 20, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '1.25rem',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '960px',
          height: '85vh',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-color)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* En-tête */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 2rem',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
            backgroundColor: 'var(--surface-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              aria-hidden
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                borderRadius: 'var(--radius-xl)',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              }}
            >
              📜
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Les Récits des Prophètes</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {prophetTopics.length} prophètes disponibles · Choisissez un récit à découvrir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'var(--surface-color-subtle)',
              color: 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Barre de recherche dans le sélecteur */}
        <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color-subtle)' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search
              size={16}
              aria-hidden
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Rechercher un prophète (ex. Adam, Nūḥ, Idrîss)..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.5rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Grille défilante de prophètes */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '1.75rem 2rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(topic => {
              const ratio = progressRatio(topic);
              return (
                <button
                  key={topic.id}
                  onClick={() => onSelect(topic)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.15rem 1.25rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xl)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--surface-color)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all var(--transition-fast)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {ratio > 0 && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '3px',
                        width: `${ratio * 100}%`,
                        backgroundColor: 'var(--primary-color)',
                      }}
                    />
                  )}
                  <div
                    aria-hidden
                    style={{
                      width: '46px',
                      height: '46px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      borderRadius: 'var(--radius-lg)',
                      background: topic.gradient,
                    }}
                  >
                    {topic.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '1.02rem', fontWeight: 700 }}>{topic.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {topic.subtitle}
                    </div>
                    {topic.format === 'recit' && topic.estimatedMinutes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Clock size={12} /> {topic.estimatedMinutes} min · {topic.totalUnits} chapitres
                      </div>
                    )}
                  </div>
                  {ratio >= 1 && <CheckCircle2 size={18} style={{ flexShrink: 0, color: 'var(--primary-color)', marginLeft: '0.5rem' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ================================================================== */
/* Chargement à la demande du sujet complet (Lazy Topic Modal)        */
/* ================================================================== */

function TopicModalLoader({
  topicSummary,
  progress,
  onClose,
  onUnitSeen,
  onCheckpoint,
  onStartQuiz,
}: {
  topicSummary: TopicSummary;
  progress: TopicProgress | undefined;
  onClose: () => void;
  onUnitSeen: (topic: LearningTopic, unitId: string) => void;
  onCheckpoint: (topic: LearningTopic, chapterId: string, correct: boolean) => void;
  onStartQuiz: (topic: LearningTopic | TopicSummary) => void;
}) {
  const { topic, loading, error } = useTopicDetail(topicSummary.id);

  if (error && !topic) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Erreur - ${topicSummary.title}`}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(5, 10, 20, 0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '1.25rem',
        }}
        onClick={onClose}
      >
        <div
          className="glass-panel"
          style={{
            padding: '2rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-2xl)',
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            maxWidth: '440px',
            width: '100%',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Fiche temporairement indisponible
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {error.message || 'Impossible de charger cette fiche pour le moment. Veuillez vérifier votre connexion internet.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={onClose} style={{ borderRadius: 'var(--radius-full)' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  if (loading || !topic) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chargement de ${topicSummary.title}`}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(5, 10, 20, 0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '1.25rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-2xl)',
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            maxWidth: '420px',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              margin: '0 auto 1.25rem',
              border: '3px solid rgba(5, 150, 105, 0.2)',
              borderTopColor: 'var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            {topicSummary.title}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Chargement des chapitres et références...
          </p>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <TopicErrorBoundary onClose={onClose}>
      <TopicViewer
        topic={topic}
        progress={progress}
        onClose={onClose}
        onUnitSeen={unitId => onUnitSeen(topic, unitId)}
        onCheckpoint={(chapterId, correct) => onCheckpoint(topic, chapterId, correct)}
        onStartQuiz={onStartQuiz}
      />
    </TopicErrorBoundary>
  );
}

/* ================================================================== */
/* Thèmes visuels par catégorie (dégradés, bordures, badges)          */
/* ================================================================== */

function getTopicTheme(category: string) {
  switch (category) {
    case 'piliers':
      return {
        bg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%)',
        iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        border: '1px solid rgba(16, 185, 129, 0.22)',
        badgeBg: 'rgba(5, 150, 105, 0.14)',
        badgeColor: '#059669',
        accentColor: '#059669',
      };
    case 'foi':
      return {
        bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(56, 189, 248, 0.03) 100%)',
        iconBg: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
        border: '1px solid rgba(56, 189, 248, 0.22)',
        badgeBg: 'rgba(37, 99, 235, 0.14)',
        badgeColor: '#2563eb',
        accentColor: '#2563eb',
      };
    case 'duas':
      return {
        bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)',
        iconBg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
        border: '1px solid rgba(245, 158, 11, 0.22)',
        badgeBg: 'rgba(217, 119, 6, 0.14)',
        badgeColor: '#d97706',
        accentColor: '#d97706',
      };
    case 'noms':
      return {
        bg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%)',
        iconBg: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
        border: '1px solid rgba(6, 182, 212, 0.22)',
        badgeBg: 'rgba(2, 132, 199, 0.14)',
        badgeColor: '#0284c7',
        accentColor: '#0284c7',
      };
    case 'hadiths':
    case 'hadith':
      return {
        bg: 'linear-gradient(135deg, rgba(225, 29, 72, 0.08) 0%, rgba(244, 63, 94, 0.03) 100%)',
        iconBg: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)',
        border: '1px solid rgba(244, 63, 94, 0.22)',
        badgeBg: 'rgba(225, 29, 72, 0.14)',
        badgeColor: '#e11d48',
        accentColor: '#e11d48',
      };
    case 'prophetes':
    default:
      return {
        bg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(168, 85, 247, 0.03) 100%)',
        iconBg: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        border: '1px solid rgba(168, 85, 247, 0.22)',
        badgeBg: 'rgba(124, 58, 237, 0.14)',
        badgeColor: '#7c3aed',
        accentColor: '#7c3aed',
      };
  }
}

/* ================================================================== */
/* Hub                                                                 */
/* ================================================================== */

export function LearningHub({ onStartQuizWithCategory }: LearningHubProps) {
  const { topics, loading, error } = useLearningContent();
  const { progressByTopic, markUnitSeen, recordCheckpoint } = useTopicProgress();

  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<TopicSummary | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showProphetPicker, setShowProphetPicker] = useState(false);
  const [openedFromPicker, setOpenedFromPicker] = useState(false);
  const [showHadithExplorer, setShowHadithExplorer] = useState(false);
  const [initialHadithCollection, setInitialHadithCollection] = useState<string | undefined>(undefined);

  // Separate prophet topics from other topics and exclude duplicate hadiths-essentiels card
  const prophetTopics = useMemo(() => topics.filter(t => t.category === 'prophetes'), [topics]);
  const nonProphetTopics = useMemo(() => topics.filter(t => t.category !== 'prophetes' && t.id !== 'hadiths-essentiels'), [topics]);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // When filtering by 'prophetes' category, show individual prophets
    if (selectedCat === 'prophetes') {
      return prophetTopics.filter(topic => {
        if (!query) return true;
        const haystack = [topic.title, topic.subtitle, topic.summary, ...(topic.unitHeadings || [])].join(' ').toLowerCase();
        return haystack.includes(query);
      });
    }

    // Otherwise, show non-prophet topics (prophets are shown via the gateway card)
    const base = selectedCat === 'all' ? nonProphetTopics : nonProphetTopics.filter(t => t.category === selectedCat);
    return base.filter(topic => {
      if (!query) return true;
      const haystack = [
        topic.title,
        topic.subtitle,
        topic.summary,
        ...(topic.unitHeadings || []),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [nonProphetTopics, prophetTopics, selectedCat, searchQuery]);

  // Also check if search matches any prophet (to show gateway card in 'all' mode)
  const searchMatchesProphets = useMemo(() => {
    if (selectedCat !== 'all') return false; // Ne s'affiche que dans l'onglet 'Tout voir'
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return prophetTopics.some(t =>
      [t.title, t.subtitle, t.summary, ...(t.unitHeadings || [])].join(' ').toLowerCase().includes(query),
    );
  }, [prophetTopics, selectedCat, searchQuery]);

  // Check if search matches Hadith explorer
  const searchMatchesHadiths = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const keywords = ['hadith', 'hadiths', 'sounnah', 'sunnah', 'bukhari', 'muslim', 'nawawi', 'recueil', 'livre', 'tirmidhi', 'abudawud', 'malik', 'nasai'];
    return keywords.some(k => k.includes(query) || query.includes(k));
  }, [searchQuery]);

  const handleStartQuiz = useCallback((topic: LearningTopic | TopicSummary) => {
    setActiveTopic(null);
    if (onStartQuizWithCategory && topic.quizCategoryTarget) {
      onStartQuizWithCategory(topic.quizCategoryTarget, 'Auto');
    }
  }, [onStartQuizWithCategory]);

  const handleShare = (topic: TopicSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `${topic.title} - ${topic.subtitle}\nApprenez sur Quiz Islamique !`;
    if (navigator.share) {
      navigator.share({ title: topic.title, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedId(topic.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const unitCount = (t: TopicSummary) => t.totalUnits || 0;

  const progressRatio = (t: TopicSummary) => {
    const p = progressByTopic[t.id];
    if (!p || p.revision !== t.revision) return 0;
    return p.completedUnits.length / Math.max(unitCount(t), 1);
  };

  return (
    <div className="learning-hub-container slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-2xl)',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ maxWidth: '650px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              marginBottom: '1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(5, 150, 105, 0.15)',
              color: 'var(--primary-color)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            <Sparkles size={16} />
            <span>Espace apprentissage</span>
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 800 }}>
            Découvrez, mémorisez et testez votre savoir
          </h2>

          <div style={{ position: 'relative', maxWidth: '480px', marginTop: '1.5rem' }}>
            <Search
              size={18}
              aria-hidden
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Rechercher une invocation, un pilier, un prophète..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 2.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Catégories */}
      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
        {LEARNING_CATEGORIES.map(cat => {
          const isActive = selectedCat === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              style={{
                whiteSpace: 'nowrap',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                backgroundColor: isActive ? 'var(--primary-color)' : 'var(--surface-color)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all var(--transition-fast)',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {error && topics.length === 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p>Le contenu n'a pas pu être chargé. Réessayez dans un instant.</p>
        </div>
      )}

      {/* Grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {selectedCat === 'prophetes' && (
          <div
            className="glass-panel"
            style={{
              gridColumn: '1 / -1',
              padding: '1.75rem 2rem',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                <Users size={14} />
                <span>Récits des Prophètes (قصص الأنبياء)</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Les messagers et prophètes guidés par Allah
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '650px', lineHeight: 1.5 }}>
                Découvrez leurs histoires authentiques tirées du Saint Coran, leurs épreuves, leur dévotion et leurs enseignements spirituels éternels.
              </p>
            </div>
            <div style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7' }}>{prophetTopics.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Récits complets</div>
            </div>
          </div>
        )}

        {selectedCat === 'hadiths' && (
          <div
            className="glass-panel"
            style={{
              gridColumn: '1 / -1',
              padding: '1.75rem 2rem',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(13, 148, 136, 0.08) 100%)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(5, 150, 105, 0.15)', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                <BookOpen size={14} />
                <span>Bibliothèque des Hadiths & Sounnah (الحديث الشريف)</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Les paroles, actes et approbations du Prophète ﷺ
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '650px', lineHeight: 1.5 }}>
                Consultez les 9 grands recueils canoniques (*Kutub at-Tis'ah*), les 40 Hadiths d'An-Nawawi et les enseignements spirituels majeurs indexés par livres et chapitres.
              </p>
            </div>
            <button
              onClick={() => setShowHadithExplorer(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.4rem',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: '0.92rem',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              }}
            >
              <BookOpen size={17} />
              <span>Ouvrir l'Explorateur de Hadiths</span>
            </button>
          </div>
        )}

        {/* Prophet gateway card — only in 'all' mode */}
        {!loading && selectedCat === 'all' && prophetTopics.length > 0 && searchMatchesProphets && (
          <div
            onClick={() => setShowProphetPicker(true)}
            className="glass-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all var(--transition-normal)',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div
                  aria-hidden
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  }}
                >
                  📜
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(124, 58, 237, 0.15)',
                    color: '#a855f7',
                  }}
                >
                  {prophetTopics.length} récits
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>Les Prophètes</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Découvrez les récits des 25 prophètes mentionnés dans le Coran, de Adam à Muhammad ﷺ.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#a855f7' }}>
                <Users size={15} />
                {prophetTopics.length} prophètes disponibles
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Choisir un prophète <ChevronRight size={16} />
              </span>
            </div>
          </div>
        )}

        {/* Hadith Explorer Gateway Card */}
        {!loading && (selectedCat === 'all' || selectedCat === 'hadiths') && searchMatchesHadiths && (
          <div
            onClick={() => {
              setInitialHadithCollection(undefined);
              setShowHadithExplorer(true);
            }}
            className="glass-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all var(--transition-normal)',
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div
                  aria-hidden
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  }}
                >
                  📚
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(5, 150, 105, 0.15)',
                    color: '#10b981',
                  }}
                >
                  14 Recueils & 40 Hadiths d'An-Nawawi
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                Explorateur des Hadiths & Sounnah
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Consultez les 40 Hadiths Fondamentaux d'An-Nawawi, Sahih al-Bukhari, Sahih Muslim, Riyad as-Salihin et l'ensemble de la Sounnah.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.82rem', fontWeight: 600, color: '#10b981' }}>
                <BookOpen size={15} />
                Texte arabe, traduction & références
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setInitialHadithCollection(undefined);
                  setShowHadithExplorer(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                Explorer les recueils <ChevronRight size={16} />
              </button>

              {onStartQuizWithCategory && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onStartQuizWithCategory('Histoire', 'Auto');
                  }}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Play size={13} style={{ fill: 'currentColor' }} />
                  Quiz
                </button>
              )}
            </div>
          </div>
        )}

        {(loading ? Array.from({ length: 4 }) : filteredTopics).map((item, i) => {
          if (loading) {
            return (
              <div
                key={i}
                className="glass-panel"
                aria-hidden
                style={{ height: '260px', borderRadius: 'var(--radius-xl)', opacity: 0.4 }}
              />
            );
          }

          const topic = item as TopicSummary;
          const ratio = progressRatio(topic);
          const theme = getTopicTheme(topic.category);

          return (
            <div
              key={topic.id}
              onClick={() => {
                if (topic.id === 'hadiths-essentiels') {
                  setInitialHadithCollection('nawawi');
                  setShowHadithExplorer(true);
                } else {
                  setActiveTopic(topic);
                }
              }}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.75rem',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all var(--transition-normal)',
                background: theme.bg,
                border: theme.border,
              }}
            >
              {ratio > 0 && (
                <div
                  aria-hidden
                  style={{ position: 'absolute', top: 0, left: 0, height: '3px', width: `${ratio * 100}%`, backgroundColor: theme.accentColor }}
                />
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div
                    aria-hidden
                    style={{
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      borderRadius: 'var(--radius-lg)',
                      background: topic.gradient,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    {topic.icon}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: theme.badgeBg,
                        color: theme.badgeColor,
                      }}
                    >
                      {topic.badge}
                    </span>
                    <button
                      onClick={e => handleShare(topic, e)}
                      aria-label="Partager"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        color: copiedId === topic.id ? 'var(--success-color)' : 'var(--text-secondary)',
                      }}
                    >
                      {copiedId === topic.id ? <Check size={16} /> : <Share2 size={16} />}
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>{topic.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {topic.summary}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: theme.accentColor,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {topic.format === 'recit' ? <Layers size={15} /> : <CheckCircle2 size={15} />}
                    {unitCount(topic)} {topic.format === 'recit' ? 'chapitres' : 'sections'}
                  </span>
                  {topic.format === 'recit' && topic.estimatedMinutes && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <Clock size={15} /> {topic.estimatedMinutes} min
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: theme.accentColor, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {ratio > 0 && ratio < 1 ? 'Reprendre' : topic.format === 'recit' ? 'Lire le récit' : 'Lire la fiche'}
                  <ChevronRight size={16} />
                </span>

                {topic.quizCategoryTarget && onStartQuizWithCategory && (
                  <button
                    onClick={e => { e.stopPropagation(); handleStartQuiz(topic); }}
                    className="btn btn-outline"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Play size={13} style={{ fill: 'currentColor' }} />
                    Quiz
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredTopics.length === 0 && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <BookOpen size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Aucune fiche trouvée</h3>
          <p>Essayez une autre recherche ou sélectionnez une autre catégorie.</p>
        </div>
      )}

      {/* Prophet picker modal */}
      {showProphetPicker && (
        <ProphetPickerModal
          prophetTopics={prophetTopics}
          progressRatio={progressRatio}
          onSelect={topic => {
            setOpenedFromPicker(true);
            setShowProphetPicker(false);
            setActiveTopic(topic);
          }}
          onClose={() => {
            setShowProphetPicker(false);
            setOpenedFromPicker(false);
          }}
        />
      )}

      {/* Hadith Explorer modal */}
      <HadithExplorerModal
        isOpen={showHadithExplorer}
        initialCollectionId={initialHadithCollection}
        onClose={() => {
          setShowHadithExplorer(false);
          setInitialHadithCollection(undefined);
        }}
      />

      {activeTopic && (
        <TopicModalLoader
          topicSummary={activeTopic}
          progress={progressByTopic[activeTopic.id]}
          onClose={() => {
            setActiveTopic(null);
            if (openedFromPicker) {
              setOpenedFromPicker(false);
              setShowProphetPicker(true);
            }
          }}
          onUnitSeen={(topic, unitId) => markUnitSeen(topic, unitId)}
          onCheckpoint={(topic, chapterId, correct) => recordCheckpoint(topic, chapterId, correct)}
          onStartQuiz={handleStartQuiz}
        />
      )}
    </div>
  );
}