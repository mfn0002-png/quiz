import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Search,
  Copy,
  Check,
  ChevronLeft,
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

  // UI / Search / Loading States
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('large');

  // 1. Charger les collections au montage
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const loadInit = async () => {
      try {
        setError(null);
        const data = await fetchHadithCollections();
        if (!active) return;
        setCollections(data);

        if (initialCollectionId) {
          const target = data.find((c) => c.id === initialCollectionId);
          if (target) {
            setSelectedCollection(target);
            setLoading(true);
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
      // Reset navigation when closing
      setCurrentView('collections');
      setSelectedCollection(null);
      setSelectedBook(null);
      setSearchQuery('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 2. Sélectionner une collection -> Charger ses livres (ou ouvrir le livre s'il est unique)
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

  // Navigation Retour
  const handleBack = () => {
    if (currentView === 'reader') {
      setCurrentView('books');
      setSelectedBook(null);
      setSearchQuery('');
    } else if (currentView === 'books') {
      setCurrentView('collections');
      setSelectedCollection(null);
      setSelectedBook(null);
      setSearchQuery('');
    }
  };

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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* TOP HEADER */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {currentView !== 'collections' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-2 -ml-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                  title="Retour"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {currentView === 'collections' && 'Bibliothèque des Hadiths & Sounnah'}
                    {currentView === 'books' && selectedCollection?.name}
                    {currentView === 'reader' && (
                      <span className="truncate">
                        {selectedCollection?.name} &rsaquo; {selectedBook?.title}
                      </span>
                    )}
                  </h2>
                  {currentView === 'collections' && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/50">
                      Authentique & Vérifié
                    </span>
                  )}
                </div>

                {/* Fil d'Ariane */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  <span
                    onClick={() => {
                      setCurrentView('collections');
                      setSelectedCollection(null);
                      setSelectedBook(null);
                    }}
                    className={`hover:underline cursor-pointer ${
                      currentView === 'collections'
                        ? 'font-medium text-emerald-600 dark:text-emerald-400'
                        : ''
                    }`}
                  >
                    Recueils
                  </span>
                  {selectedCollection && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      <span
                        onClick={() => {
                          setCurrentView('books');
                          setSelectedBook(null);
                        }}
                        className={`hover:underline cursor-pointer truncate ${
                          currentView === 'books'
                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                            : ''
                        }`}
                      >
                        {selectedCollection.name}
                      </span>
                    </>
                  )}
                  {selectedBook && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 truncate">
                        Livre {selectedBook.bookNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions à droite */}
            <div className="flex items-center gap-2">
              {currentView === 'reader' && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => setFontSize('normal')}
                    className={`px-2 py-1 rounded ${fontSize === 'normal' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'hover:text-slate-900'}`}
                    title="Taille de texte normale"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-1 rounded ${fontSize === 'large' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'hover:text-slate-900'}`}
                    title="Taille de texte grande"
                  >
                    A+
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('xl')}
                    className={`px-2 py-1 rounded ${fontSize === 'xl' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'hover:text-slate-900'}`}
                    title="Taille de texte très grande"
                  >
                    A++
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Barre de recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Onglets de groupes pour les collections */}
            {currentView === 'collections' && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setSelectedGroup('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedGroup === 'all'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tous ({collections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('nine_books')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedGroup === 'nine_books'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Les 9 Livres (الكتب التسعة)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup('selections')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedGroup === 'selections'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sélections & 40 Hadiths
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODAL BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 custom-scrollbar">
          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Chargement des hadiths authentiques...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && !loading && (
            <div className="p-4 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm">
              <p className="font-semibold mb-1">Une erreur est survenue :</p>
              <p>{error}</p>
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
                className="mt-2 px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
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
              <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/10 via-emerald-900/5 to-teal-900/10 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/40 border border-emerald-500/20 dark:border-emerald-500/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                    📜
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>La Tradition Prophétique & Les Grands Imams</span>
                      <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 font-serif">
                        (السنة النبوية الشريفة)
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Explorez les grands corpus canoniques de la Sounnah (*Al-Kutub At-Tis'ah*), ainsi que les sélections pédagogiques universelles. Chaque hadith est indexé avec son texte arabe d'origine, son degré d'authenticité et ses références.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grille des recueils */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCollections.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollection(col)}
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1"
                  >
                    {/* Ruban décoratif en arrière-plan */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 opacity-10 dark:opacity-20 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"
                      style={{ background: col.gradient }}
                    />

                    <div>
                      {/* Badge & Nombre de hadiths */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          {col.badge}
                        </span>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          ~{col.totalHadiths.toLocaleString()} hadiths
                        </span>
                      </div>

                      {/* Titre & Calligraphie Arabe */}
                      <div className="mb-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {col.name}
                        </h4>
                        <p className="text-base font-serif text-emerald-800 dark:text-emerald-400/90 font-medium mt-0.5" dir="rtl">
                          {col.arabicName}
                        </p>
                      </div>

                      {/* Auteur */}
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                        {col.author}
                      </p>

                      {/* Résumé */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {col.summary}
                      </p>
                    </div>

                    {/* Footer de la carte */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>{col.totalBooks > 1 ? `${col.totalBooks} Livres / Chapitres` : 'Recueil complet'}</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Consulter <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCollections.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    Aucun recueil ne correspond à votre recherche « {searchQuery} ».
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 2 : LISTE DES CHAPITRES (KITAB)                       */}
          {/* ========================================================= */}
          {currentView === 'books' && !loading && selectedCollection && (
            <div>
              {/* Bannière de la collection */}
              <div
                className="mb-6 p-5 sm:p-6 rounded-2xl text-white shadow-lg relative overflow-hidden"
                style={{ background: selectedCollection.gradient }}
              >
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                        {selectedCollection.badge}
                      </span>
                      <span className="text-xs text-white/80">
                        {books.length} chapitres disponibles
                      </span>
                    </div>
                    <h3 className="text-2xl font-black">{selectedCollection.name}</h3>
                    <p className="text-lg font-serif text-white/90 mt-0.5" dir="rtl">
                      {selectedCollection.arabicName} — {selectedCollection.arabicAuthor}
                    </p>
                    <p className="text-xs sm:text-sm text-white/90 mt-2 max-w-2xl leading-relaxed">
                      {selectedCollection.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Titre section des chapitres */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Index des Chapitres Thématiques ({filteredBooks.length})
                </h4>
                <span className="text-xs text-slate-500">
                  Cliquez sur un chapitre pour lire les hadiths
                </span>
              </div>

              {/* Grille / Liste des chapitres */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredBooks.map((book) => (
                  <div
                    key={book.bookNumber}
                    onClick={() => handleSelectBook(book)}
                    className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Numéro du livre */}
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        {book.bookNumber}
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                          {book.title}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {book.englishTitle}
                        </p>
                      </div>
                    </div>

                    {/* Métadonnées & Flèche */}
                    <div className="flex items-center gap-2.5 flex-shrink-0 text-xs">
                      {book.hadithStart && book.hadithEnd ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {book.hadithStart} à {book.hadithEnd}
                        </span>
                      ) : book.totalHadiths ? (
                        <span className="text-slate-400">
                          {book.totalHadiths} hadiths
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>

              {filteredBooks.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-slate-400 text-sm">
                    Aucun chapitre ne correspond à « {searchQuery} ».
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VUE 3 : LECTEUR DE HADITHS DU CHAPITRE                    */}
          {/* ========================================================= */}
          {currentView === 'reader' && !loading && selectedCollection && selectedBook && (
            <div className="space-y-6">
              {/* En-tête du chapitre */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    <span>{selectedCollection.name}</span>
                    <span>&bull;</span>
                    <span>Chapitre {selectedBook.bookNumber}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {selectedBook.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {hadiths.length} hadith{hadiths.length > 1 ? 's' : ''} répertorié{hadiths.length > 1 ? 's' : ''} dans cette section
                  </p>
                </div>

                {/* Boutons de navigation rapide de chapitre */}
                <div className="flex items-center gap-2">
                  {selectedBook.bookNumber > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const prev = books.find(
                          (b) => b.bookNumber === selectedBook.bookNumber - 1
                        );
                        if (prev) handleSelectBook(prev);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center gap-1 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Chapitre préc.
                    </button>
                  )}
                  {selectedBook.bookNumber < books.length && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = books.find(
                          (b) => b.bookNumber === selectedBook.bookNumber + 1
                        );
                        if (next) handleSelectBook(next);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 flex items-center gap-1 transition"
                    >
                      Chapitre suivant <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Liste des Hadiths */}
              <div className="space-y-4">
                {filteredHadiths.map((hadith, index) => (
                  <div
                    key={hadith.hadithNumber || index}
                    className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-shadow relative"
                  >
                    {/* En-tête de la carte Hadith */}
                    <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40">
                          Hadith n° {hadith.hadithNumber}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {selectedCollection.name} : Livre {selectedBook.bookNumber}, Hadith {hadith.hadithNumber}
                        </span>
                      </div>

                      {/* Bouton Copier */}
                      <button
                        type="button"
                        onClick={() => handleCopyHadith(hadith)}
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          copiedId === hadith.hadithNumber
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600'
                        }`}
                        title="Copier le texte et la référence"
                      >
                        {copiedId === hadith.hadithNumber ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* TEXTE ARABE */}
                    <div
                      dir="rtl"
                      className={`font-serif leading-loose text-slate-900 dark:text-slate-100 text-right p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30 select-text ${
                        fontSize === 'normal'
                          ? 'text-lg sm:text-xl'
                          : fontSize === 'large'
                          ? 'text-xl sm:text-2xl'
                          : 'text-2xl sm:text-3xl'
                      }`}
                    >
                      {hadith.arabicText}
                    </div>

                    {/* TRADUCTION */}
                    {hadith.translation && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                          Traduction & Enseignement
                        </p>
                        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed italic select-text">
                          « {hadith.translation} »
                        </p>
                      </div>
                    )}

                    {/* DEGRÉ D'AUTHENTICITÉ (GRADES) */}
                    {hadith.grades && hadith.grades.length > 0 && (
                      <div className="mt-3.5 flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-slate-400">Degré d'authenticité :</span>
                        {hadith.grades.map((g, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {g.name ? `${g.name}: ` : ''}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {g.grade}
                            </strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredHadiths.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 text-sm">
                    Aucun hadith ne correspond à votre filtre « {searchQuery} ».
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
export default HadithExplorerModal;
