import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronRight,
  ArrowLeft,
  Search,
  Copy,
  Check,
} from 'lucide-react';
import {
  HadithCollection,
  HadithBook,
  HadithItem,
  HadithGroup,
} from '../../types/hadith';
import {
  fetchHadithCollections,
  fetchCollectionBooks,
  fetchBookHadiths,
} from '../../services/hadithApi';

interface HadithExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCollectionId?: string;
}

type ViewState = 'collections' | 'books' | 'reader';

export const HadithExplorerModal: React.FC<HadithExplorerModalProps> = ({
  isOpen,
  onClose,
  initialCollectionId,
}) => {
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('collections');
  const [selectedGroup, setSelectedGroup] = useState<'all' | HadithGroup>('all');
  const [collections, setCollections] = useState<HadithCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<HadithCollection | null>(null);
  const [books, setBooks] = useState<HadithBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<HadithBook | null>(null);
  const [hadiths, setHadiths] = useState<HadithItem[]>([]);

  // UI / Search / Loading / Language & Phonetic States
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('large');
  const [langMode, setLangMode] = useState<'fr' | 'en'>('fr');

  // 1. Charger les collections au montage
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const loadInit = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchHadithCollections();
        if (!active) return;
        setCollections(data);

        if (initialCollectionId) {
          const target = data.find((c) => c.id === initialCollectionId);
          if (target) {
            setSelectedCollection(target);
            const bData = await fetchCollectionBooks(target.id);
            if (!active) return;
            const bList = bData.books || [];
            setBooks(bList);
            if (bList.length === 1) {
              const singleBook = bList[0];
              setSelectedBook(singleBook);
              const hData = await fetchBookHadiths(target.id, singleBook.bookNumber);
              if (!active) return;
              setHadiths(hData.hadiths || []);
              setCurrentView('reader');
            } else {
              setCurrentView('books');
            }
          }
        }
      } catch (err) {
        if (!active) return;
        setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInit();

    return () => {
      active = false;
    };
  }, [isOpen, initialCollectionId]);

  // Bloquer le scroll d'arrière-plan
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setCurrentView('collections');
      setSelectedCollection(null);
      setSelectedBook(null);
      setSearchQuery('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 2. Sélectionner une collection -> Charger ses livres
  const handleSelectCollection = async (collection: HadithCollection) => {
    try {
      setSelectedCollection(collection);
      setLoading(true);
      setError(null);
      setSearchQuery('');
      const data = await fetchCollectionBooks(collection.id);
      const bList = data.books || [];
      setBooks(bList);
      if (bList.length === 1) {
        const singleBook = bList[0];
        setSelectedBook(singleBook);
        const hData = await fetchBookHadiths(collection.id, singleBook.bookNumber);
        setHadiths(hData.hadiths || []);
        setCurrentView('reader');
      } else {
        setCurrentView('books');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Sélectionner un livre -> Charger ses hadiths
  const handleSelectBook = async (book: HadithBook) => {
    if (!selectedCollection) return;
    try {
      setSelectedBook(book);
      setLoading(true);
      setError(null);
      setSearchQuery('');
      const data = await fetchBookHadiths(selectedCollection.id, book.bookNumber);
      setHadiths(data.hadiths || []);
      setCurrentView('reader');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Navigation Retour / Fermeture Hiérarchique
  const handleCloseOrBack = () => {
    if (currentView === 'reader') {
      if (books.length === 1) {
        setCurrentView('collections');
        setSelectedCollection(null);
        setSelectedBook(null);
      } else {
        setCurrentView('books');
        setSelectedBook(null);
      }
      setSearchQuery('');
    } else if (currentView === 'books') {
      setCurrentView('collections');
      setSelectedCollection(null);
      setSelectedBook(null);
      setSearchQuery('');
    } else {
      onClose();
    }
  };

  const handleBack = handleCloseOrBack;

  // Gestion de la touche Échap pour remonter d'un niveau
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseOrBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentView, books.length]);

  // Filtrage des collections
  const filteredCollections = useMemo(() => {
    return collections.filter((col) => {
      const matchesGroup =
        selectedGroup === 'all' || col.group === selectedGroup;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        col.name.toLowerCase().includes(q) ||
        col.arabicName.includes(q) ||
        col.author.toLowerCase().includes(q) ||
        col.summary.toLowerCase().includes(q);
      return matchesGroup && matchesSearch;
    });
  }, [collections, selectedGroup, searchQuery]);

  // Filtrage des livres
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.englishTitle.toLowerCase().includes(q) ||
        b.bookNumber.toString() === q
    );
  }, [books, searchQuery]);

  // Filtrage des hadiths dans le lecteur
  const filteredHadiths = useMemo(() => {
    if (!hadiths) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return hadiths;
    return hadiths.filter(
      (h) =>
        h.hadithNumber.toString() === q ||
        h.translation.toLowerCase().includes(q) ||
        h.arabicText.includes(q)
    );
  }, [hadiths, searchQuery]);

  // Copier le hadith
  const handleCopyHadith = (hadith: HadithItem) => {
    const textToCopy = `« ${hadith.arabicText} »\n\n${hadith.translation}\n\n[${selectedCollection?.name || 'Hadith'} - Chapitre ${selectedBook?.bookNumber || ''}, Hadith n°${hadith.hadithNumber}]`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(hadith.hadithNumber);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bibliothèque des Hadiths & Sounnah"
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
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseOrBack();
      }}
    >
      <div
        className="glass-panel slide-up"
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '90vh',
          maxHeight: '900px',
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
        {/* TOP HEADER */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
              {currentView !== 'collections' && (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Retour"
                  style={{
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface-color-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}

              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                }}
              >
                📚
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {currentView === 'collections' && 'Bibliothèque des Hadiths & Sounnah'}
                    {currentView === 'books' && selectedCollection?.name}
                    {currentView === 'reader' && (
                      <span>
                        {selectedCollection?.name} &rsaquo; {selectedBook?.title}
                      </span>
                    )}
                  </h2>
                  {currentView === 'collections' && (
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
                      Authentique & Vérifié
                    </span>
                  )}
                </div>

                {/* Fil d'Ariane */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <span
                    onClick={() => {
                      setCurrentView('collections');
                      setSelectedCollection(null);
                      setSelectedBook(null);
                    }}
                    style={{ cursor: 'pointer', fontWeight: currentView === 'collections' ? 700 : 500, color: currentView === 'collections' ? 'var(--primary-color)' : 'inherit' }}
                  >
                    Recueils
                  </span>
                  {selectedCollection && (
                    <>
                      <ChevronRight size={13} style={{ opacity: 0.6 }} />
                      <span
                        onClick={() => {
                          setCurrentView('books');
                          setSelectedBook(null);
                        }}
                        style={{ cursor: 'pointer', fontWeight: currentView === 'books' ? 700 : 500, color: currentView === 'books' ? 'var(--primary-color)' : 'inherit' }}
                      >
                        {selectedCollection.name}
                      </span>
                    </>
                  )}
                  {selectedBook && (
                    <>
                      <ChevronRight size={13} style={{ opacity: 0.6 }} />
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                        Livre {selectedBook.bookNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions à droite (Traduction FR/EN, Phonétique, Taille texte & Fermer) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {currentView === 'reader' && (
                <>
                  {/* Selecteur de Langue (FR / EN) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.2rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-color-subtle)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setLangMode('fr')}
                      title="Afficher la traduction en Français"
                      style={{
                        padding: '0.3rem 0.65rem',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: '0.78rem',
                        fontWeight: langMode === 'fr' ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: langMode === 'fr' ? 'var(--primary-color)' : 'transparent',
                        color: langMode === 'fr' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      🇫🇷 FR
                    </button>
                    <button
                      type="button"
                      onClick={() => setLangMode('en')}
                      title="Show original English text"
                      style={{
                        padding: '0.3rem 0.65rem',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: '0.78rem',
                        fontWeight: langMode === 'en' ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: langMode === 'en' ? 'var(--primary-color)' : 'transparent',
                        color: langMode === 'en' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      🇬🇧 EN
                    </button>
                  </div>

                  {/* Taille du texte */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.2rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-color-subtle)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setFontSize('normal')}
                      style={{
                        padding: '0.3rem 0.6rem',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem',
                        fontWeight: fontSize === 'normal' ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: fontSize === 'normal' ? 'var(--primary-color)' : 'transparent',
                        color: fontSize === 'normal' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize('large')}
                      style={{
                        padding: '0.3rem 0.6rem',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem',
                        fontWeight: fontSize === 'large' ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: fontSize === 'large' ? 'var(--primary-color)' : 'transparent',
                        color: fontSize === 'large' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize('xl')}
                      style={{
                        padding: '0.3rem 0.6rem',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'inherit',
                        fontSize: '0.8rem',
                        fontWeight: fontSize === 'xl' ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: fontSize === 'xl' ? 'var(--primary-color)' : 'transparent',
                        color: fontSize === 'xl' ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      A++
                    </button>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleCloseOrBack}
                aria-label={currentView === 'collections' ? 'Fermer' : 'Retour'}
                style={{
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Barre de recherche */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search
                size={16}
                aria-hidden
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  currentView === 'collections'
                    ? 'Rechercher un recueil, auteur ou mot-clé...'
                    : currentView === 'books'
                    ? 'Rechercher un livre / chapitre (ex: Foi, Prière, Wudu)...'
                    : 'Rechercher dans ce chapitre (numéro, mot-clé)...'
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 2rem 0.65rem 2.5rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
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
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Onglets de groupes pour les collections */}
            {currentView === 'collections' && (
              <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('all')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: `1px solid ${selectedGroup === 'all' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    backgroundColor: selectedGroup === 'all' ? 'var(--primary-color)' : 'var(--surface-color)',
                    color: selectedGroup === 'all' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: selectedGroup === 'all' ? 700 : 500,
                  }}
                >
                  Tous ({collections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('nine_books')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: `1px solid ${selectedGroup === 'nine_books' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    backgroundColor: selectedGroup === 'nine_books' ? 'var(--primary-color)' : 'var(--surface-color)',
                    color: selectedGroup === 'nine_books' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: selectedGroup === 'nine_books' ? 700 : 500,
                  }}
                >
                  Les 9 Livres (الكتب التسعة)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('selections')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: `1px solid ${selectedGroup === 'selections' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    backgroundColor: selectedGroup === 'selections' ? 'var(--primary-color)' : 'var(--surface-color)',
                    color: selectedGroup === 'selections' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: selectedGroup === 'selections' ? 700 : 500,
                  }}
                >
                  Sélections & 40 Hadiths
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODAL BODY CONTAINER */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--surface-color-subtle)' }}>
          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(5, 150, 105, 0.2)',
                  borderTopColor: 'var(--primary-color)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                Chargement des hadiths authentiques depuis le serveur...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && !loading && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                marginBottom: '1.5rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>⚠️ Une erreur est survenue</h4>
              <p style={{ fontSize: '0.88rem', margin: '0 0 0.85rem', lineHeight: 1.5 }}>{error}</p>
              <button
                type="button"
                onClick={() => {
                  if (currentView === 'collections') fetchHadithCollections();
                  else if (currentView === 'books' && selectedCollection)
                    handleSelectCollection(selectedCollection);
                  else if (
                    currentView === 'reader' &&
                    selectedBook &&
                    selectedCollection
                  )
                    handleSelectBook(selectedBook);
                }}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)' }}
              >
                Réessayer
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 1 : CATALOGUE DES RECUEILS                           */}
          {/* ========================================================= */}
          {currentView === 'collections' && !loading && (
            <div>
              {/* Entête introductive */}
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-xl)',
                  background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(13, 148, 136, 0.08) 100%)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                  }}
                >
                  📜
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                    La Tradition Prophétique & Les Grands Imams (السنة النبوية الشريفة)
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: '750px' }}>
                    Explorez les grands corpus canoniques de la Sounnah (*Al-Kutub At-Tis'ah*), ainsi que les 40 Hadiths d'An-Nawawi et les sélections universelles. Chaque hadith est indexé avec son texte arabe d'origine, sa traduction et ses références.
                  </p>
                </div>
              </div>

              {/* Grille des recueils */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {filteredCollections.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollection(col)}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '1.5rem',
                      borderRadius: 'var(--radius-xl)',
                      backgroundColor: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-normal)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div>
                      {/* Badge & Nombre de hadiths */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
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
                          {col.badge}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ~{col.totalHadiths.toLocaleString()} hadiths
                        </span>
                      </div>

                      {/* Titre & Calligraphie Arabe */}
                      <div style={{ marginBottom: '0.6rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
                          {col.name}
                        </h4>
                        <p className="arabic-text" dir="rtl" style={{ fontSize: '1.2rem', color: 'var(--primary-color)', margin: 0 }}>
                          {col.arabicName}
                        </p>
                      </div>

                      {/* Auteur */}
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
                        {col.author}
                      </p>

                      {/* Résumé */}
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {col.summary}
                      </p>
                    </div>

                    {/* Footer de la carte */}
                    <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                      <span>{col.totalBooks > 1 ? `${col.totalBooks} Livres / Chapitres` : 'Recueil complet'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        Consulter <ChevronRight size={15} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 2 : LISTE DES LIVRES / CHAPITRES                       */}
          {/* ========================================================= */}
          {currentView === 'books' && !loading && selectedCollection && (
            <div>
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '1.25rem 1.5rem',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                    {selectedCollection.name}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {books.length} livre(s) et thèmes disponibles
                  </p>
                </div>
                <span className="arabic-text" dir="rtl" style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}>
                  {selectedCollection.arabicName}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filteredBooks.map((b) => (
                  <div
                    key={b.bookNumber}
                    onClick={() => handleSelectBook(b)}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(5, 150, 105, 0.12)',
                          color: 'var(--primary-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          flexShrink: 0,
                        }}
                      >
                        {b.bookNumber}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.title}
                        </h4>
                        {b.englishTitle && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.englishTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 3 : LECTEUR DE HADITHS                                */}
          {/* ========================================================= */}
          {currentView === 'reader' && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredHadiths.map((h) => (
                <div
                  key={h.hadithNumber}
                  className="glass-panel"
                  style={{
                    padding: '1.75rem',
                    borderRadius: 'var(--radius-xl)',
                    backgroundColor: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  {/* Top bar of hadith item */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          padding: '0.25rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(5, 150, 105, 0.15)',
                          color: 'var(--primary-color)',
                        }}
                      >
                        Hadith n°{h.hadithNumber}
                      </span>
                      {h.grades && h.grades.map((g, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          • {g.name}: {g.grade}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyHadith(h)}
                      aria-label="Copier le hadith"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: copiedId === h.hadithNumber ? 'var(--success-color)' : 'var(--text-secondary)',
                      }}
                    >
                      {copiedId === h.hadithNumber ? <Check size={16} /> : <Copy size={16} />}
                      {copiedId === h.hadithNumber ? 'Copié !' : 'Copier'}
                    </button>
                  </div>

                  {/* Texte Arabe */}
                  {h.arabicText && (
                    <div
                      className="arabic-text"
                      dir="rtl"
                      lang="ar"
                      style={{
                        fontSize: fontSize === 'normal' ? '1.3rem' : fontSize === 'large' ? '1.6rem' : '1.9rem',
                        lineHeight: 2.2,
                        textAlign: 'right',
                        color: 'var(--text-primary)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--surface-color-subtle)',
                      }}
                    >
                      {h.arabicText}
                    </div>
                  )}

                  {/* Traduction (Français ou Anglais) */}
                  <div style={{ fontSize: fontSize === 'normal' ? '0.98rem' : fontSize === 'large' ? '1.08rem' : '1.2rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                    {langMode === 'fr'
                      ? (h.frenchTranslation || h.translation)
                      : (h.englishTranslation || h.translation)}
                  </div>
                </div>
              ))}

              {filteredHadiths.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-xl)' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Aucun hadith ne correspond à votre recherche.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
