import { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen, Play, CheckCircle2, ChevronRight, X, Share2, Check } from 'lucide-react';
import { LEARNING_CATEGORIES, LEARNING_MODULES, LearningTopic } from '../../data/learningData';
import { Difficulty } from '../../data/questions';

interface LearningHubProps {
  onStartQuizWithCategory?: (category: string, difficulty?: Difficulty) => void;
}

export function LearningHub({ onStartQuizWithCategory }: LearningHubProps) {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalTopic, setActiveModalTopic] = useState<LearningTopic | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    return LEARNING_MODULES.filter(topic => {
      const matchCategory = selectedCat === 'all' || topic.category === selectedCat;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchCategory;

      const matchTitle = topic.title.toLowerCase().includes(query);
      const matchSub = topic.subtitle.toLowerCase().includes(query);
      const matchSummary = topic.summary.toLowerCase().includes(query);
      const matchDetails = topic.details.some(d =>
        d.heading.toLowerCase().includes(query) ||
        d.text.toLowerCase().includes(query) ||
        (d.phonetic && d.phonetic.toLowerCase().includes(query))
      );

      return matchCategory && (matchTitle || matchSub || matchSummary || matchDetails);
    });
  }, [selectedCat, searchQuery]);

  const handleStartQuiz = (topic: LearningTopic) => {
    if (onStartQuizWithCategory && topic.quizCategoryTarget) {
      onStartQuizWithCategory(topic.quizCategoryTarget, 'Auto');
    }
  };

  const handleShare = (topic: LearningTopic, e: React.MouseEvent) => {
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

  return (
    <div className="learning-hub-container slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Section */}
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
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(5, 150, 105, 0.15)',
              color: 'var(--primary-color)',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            <Sparkles size={16} />
            <span>ESPACE APPRENTISSAGE</span>
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 800 }}>
            Découvrez, mémorisez & testez votre savoir
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Explorez les enseignements authentiques, les invocations du quotidien et les récits des Prophètes avec textes arabes et phonétiques.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: '480px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              placeholder="Rechercher une invocation, un pilier, un prophète..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Decorative background element */}
        <div
          style={{
            position: 'absolute',
            right: '-2rem',
            top: '-2rem',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Category Pills */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'none',
        }}
      >
        {LEARNING_CATEGORIES.map((cat) => {
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
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'var(--shadow-sm)',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Learning Topics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {filteredTopics.map((topic) => (
          <div
            key={topic.id}
            onClick={() => setActiveModalTopic(topic)}
            className="glass-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
              cursor: 'pointer',
              transition: 'all var(--transition-normal)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-xl), 0 0 20px rgba(16, 185, 129, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
          >
            <div>
              {/* Header card with Icon & Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: topic.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
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
                      backgroundColor: 'rgba(5, 150, 105, 0.12)',
                      color: 'var(--primary-color)',
                    }}
                  >
                    {topic.badge}
                  </span>
                  <button
                    onClick={(e) => handleShare(topic, e)}
                    title={copiedId === topic.id ? "Copié !" : "Partager"}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedId === topic.id ? 'var(--success-color)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {copiedId === topic.id ? <Check size={16} /> : <Share2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                {topic.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                {topic.summary}
              </p>

              {/* Highlights count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--primary-color)', fontWeight: 600, marginBottom: '1.5rem' }}>
                <CheckCircle2 size={15} />
                <span>{topic.details.length} points clés & enseignements</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Lire la fiche <ChevronRight size={16} />
              </span>

              {topic.quizCategoryTarget && onStartQuizWithCategory && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartQuiz(topic);
                  }}
                  className="btn btn-outline"
                  style={{
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.85rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  <Play size={13} style={{ fill: 'currentColor' }} />
                  Quiz
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <BookOpen size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Aucune fiche trouvée</h3>
          <p>Essayez de modifier votre recherche ou sélectionnez une autre catégorie.</p>
        </div>
      )}

      {/* Modal / Deep-dive Reading Panel */}
      {activeModalTopic && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setActiveModalTopic(null)}
        >
          <div
            className="glass-panel slide-up custom-scrollbar"
            style={{
              backgroundColor: 'var(--surface-color)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-2xl)',
              padding: '2.5rem',
              position: 'relative',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveModalTopic(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'var(--surface-hover)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-xl)',
                  background: activeModalTopic.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
              >
                {activeModalTopic.icon}
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(5, 150, 105, 0.12)',
                    color: 'var(--primary-color)',
                  }}
                >
                  {activeModalTopic.badge}
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem' }}>
                  {activeModalTopic.title}
                </h2>
              </div>
            </div>

            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              {activeModalTopic.subtitle}
            </p>

            {/* List of Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {activeModalTopic.details.map((detail, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--surface-color-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary-light)' }}>
                    {detail.heading}
                  </h4>

                  {detail.arabic && (
                    <div
                      className="arabic-text"
                      style={{
                        margin: '0.75rem 0',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(5, 150, 105, 0.08)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'right',
                      }}
                    >
                      {detail.arabic}
                    </div>
                  )}

                  {detail.phonetic && (
                    <p style={{ fontStyle: 'italic', color: 'var(--secondary-color)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      Phonétique : {detail.phonetic}
                    </p>
                  )}

                  <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    {detail.text}
                  </p>

                  {detail.source && (
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      📚 Source : {detail.source}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer / Quiz Start CTA */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveModalTopic(null)}
                className="btn btn-outline"
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                Fermer
              </button>

              {activeModalTopic.quizCategoryTarget && onStartQuizWithCategory && (
                <button
                  onClick={() => {
                    const topic = activeModalTopic;
                    setActiveModalTopic(null);
                    handleStartQuiz(topic);
                  }}
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  <Play size={16} style={{ fill: 'currentColor' }} />
                  Lancer le quiz sur ce thème
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
