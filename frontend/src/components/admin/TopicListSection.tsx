import { useState, useMemo } from 'react';
import { BookOpen, RefreshCw, Search, Trash2 } from 'lucide-react';
import { TopicSummaryAdmin } from './types';

interface TopicListSectionProps {
  topics: TopicSummaryAdmin[];
  loadingTopics: boolean;
  deletingTopicId: string | null;
  onRefreshTopics: () => void;
  onDeleteTopic: (topic: TopicSummaryAdmin) => void;
}

export const TopicListSection = ({
  topics,
  loadingTopics,
  deletingTopicId,
  onRefreshTopics,
  onDeleteTopic,
}: TopicListSectionProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return topics.filter((t) => {
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.summary && t.summary.toLowerCase().includes(q));
      const matchesCat = filterCategory === 'all' || t.category === filterCategory;
      return matchesSearch && matchesCat;
    });
  }, [topics, searchQuery, filterCategory]);

  return (
    <section className="admin-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BookOpen size={19} style={{ color: 'var(--primary-color)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            Gestion &amp; Suppression des Fiches et Récits
          </h2>
          <span style={{
            fontSize: '0.78rem',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            color: 'var(--primary-color)',
            padding: '0.15rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            fontWeight: 700,
          }}>
            {filteredTopics.length !== topics.length
              ? `${filteredTopics.length} / ${topics.length} sujets`
              : `${topics.length} ${topics.length <= 1 ? 'sujet' : 'sujets'}`}
          </span>
        </div>

        <button
          type="button"
          onClick={onRefreshTopics}
          disabled={loadingTopics}
          className="btn btn-outline"
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          title="Rafraîchir la liste"
        >
          <RefreshCw size={14} className={loadingTopics ? 'spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
        Consultez toutes les fiches d'apprentissage et récits disponibles. Vous pouvez supprimer définitivement les fiches ajoutées dans Firestore (la suppression vide automatiquement le cache et nettoie les vecteurs Supabase).
      </p>

      {/* Filtres de recherche */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher par titre, ID ou mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ minWidth: '180px' }}
        >
          <option value="all">Toutes les catégories</option>
          <option value="prophetes">Prophètes</option>
          <option value="duas">Duas &amp; Invocations</option>
          <option value="piliers">Piliers de l'Islam</option>
          <option value="foi">Foi &amp; Tawheed</option>
          <option value="jurisprudence">Jurisprudence (Fiqh)</option>
        </select>
      </div>

      {/* Liste des fiches */}
      {loadingTopics ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--primary-color)', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.88rem', margin: 0 }}>Chargement des fiches d'apprentissage...</p>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2.5rem 1rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface-color-subtle)',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
        }}>
          Aucune fiche ne correspond à votre recherche.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.9rem' }}>
          {filteredTopics.map((topic) => {
            const isDeleting = deletingTopicId === topic.id;
            const isRecit = topic.format === 'recit';
            return (
              <div
                key={topic.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.1rem',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Ligne haute : Icône, Titre, Badge source */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span style={{ fontSize: '1.45rem' }}>{topic.icon || '📖'}</span>
                      <div>
                        <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                          {topic.title}
                        </h3>
                        <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          #{topic.id}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.68rem',
                      padding: '0.12rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      backgroundColor: topic.source === 'firestore' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                      color: topic.source === 'firestore' ? 'var(--primary-color)' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {topic.source === 'firestore' ? 'Firestore' : 'Local'}
                    </span>
                  </div>

                  {/* Résumé */}
                  {topic.summary && (
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      margin: '0 0 0.75rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {topic.summary}
                    </p>
                  )}
                </div>

                {/* Ligne basse : Format, Unités, Bouton Supprimer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  marginTop: '0.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span style={{
                      padding: '0.12rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isRecit ? 'rgba(124, 58, 237, 0.1)' : 'rgba(2, 132, 199, 0.1)',
                      color: isRecit ? '#7c3aed' : '#0284c7',
                      fontWeight: 600,
                    }}>
                      {isRecit ? '📖 Récit' : '📑 Fiche'}
                    </span>
                    {typeof topic.totalUnits === 'number' && topic.totalUnits > 0 && (
                      <span>• {topic.totalUnits} {isRecit ? 'chapitres' : 'sections'}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteTopic(topic)}
                    disabled={isDeleting}
                    className="btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: 'var(--error-color)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
                      e.currentTarget.style.borderColor = 'var(--error-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    }}
                    title={topic.source === 'local' ? 'Fiche intégrée par défaut (Code)' : 'Supprimer définitivement cette fiche'}
                  >
                    {isDeleting ? (
                      <RefreshCw size={13} className="spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
