/**
 * Modèle de contenu pédagogique.
 *
 * Deux formats cohabitent :
 *  - 'fiche' : lecture libre, liste de sections (duas, noms d'Allah, listes de référence)
 *  - 'recit' : progression chapitre par chapitre (prophètes, événements historiques)
 *
 * Les textes scripturaires ne sont jamais écrits en dur : ils sont référencés
 * (SourceRef) et résolus à l'affichage via learningContentService.
 */

export type LearningFormat = 'fiche' | 'recit';

/* ------------------------------------------------------------------ */
/* Références de sources                                               */
/* ------------------------------------------------------------------ */

export type SourceRef =
  | { kind: 'quran'; surah: number; ayah: number; ayahEnd?: number }
  | { kind: 'hadith'; collection: 'bukhari' | 'muslim'; bookNumber: string; hadithNumber: string }
  | { kind: 'dua'; hisnId: string };

/** Texte résolu depuis une SourceRef (renvoyé par le backend, mis en cache). */
export interface ResolvedSource {
  ref: SourceRef;
  arabic: string;
  translation: string;
  phonetic?: string;
  /** Libellé lisible : "Hūd 11:50" ou "Bukhari 2:13". */
  citation: string;
}

/* ------------------------------------------------------------------ */
/* Blocs de contenu                                                    */
/* ------------------------------------------------------------------ */

export type ContentBlock =
  /** Paragraphe rédigé. Les termes entre {{accolades}} sont liés au glossaire. */
  | { type: 'text'; value: string }
  /** Citation scripturaire, résolue au rendu. */
  | { type: 'source'; ref: SourceRef; note?: string }
  /**
   * Citation vérifiée à la rédaction mais non résolvable via une SourceRef —
   * typiquement un hadith cité par recueil sans numéro exact. À ne pas confondre
   * avec 'source' : ce texte est figé dans le contenu, pas résolu au rendu.
   * Migrer vers 'source' dès qu'une référence exacte est disponible.
   */
  | { type: 'static-quote'; arabic: string; phonetic?: string; translation: string; citation: string }
  /** Liste à puces. */
  | { type: 'list'; items: string[] }
  /** Carte retournable : recto/verso, pour la mémorisation. */
  | { type: 'flip'; front: string; back: string; sourceRef?: SourceRef }
  /** Encarts chiffrés courts (3 max pour rester lisible). */
  | { type: 'stats'; items: { value: string; label: string }[] };

/** Terme cliquable affiché en bas du bloc. */
export interface GlossaryTerm {
  term: string;
  definition: string;
  arabic?: string;
}

/* ------------------------------------------------------------------ */
/* Point de contrôle                                                   */
/* ------------------------------------------------------------------ */

export interface Checkpoint {
  question: string;
  options: string[];
  correctIndex: number;
  /** Affichée après réponse, correcte ou non. */
  explanation: string;
}

/* ------------------------------------------------------------------ */
/* Chapitre (format 'recit')                                           */
/* ------------------------------------------------------------------ */

export interface Chapter {
  id: string;
  /** Libellé court pour le rail de navigation. */
  label: string;
  title: string;
  /** Teinte d'ambiance. Optionnelle : par défaut la surface du thème. */
  ambient?: string;
  blocks: ContentBlock[];
  glossary?: GlossaryTerm[];
  checkpoint?: Checkpoint;
}

/* ------------------------------------------------------------------ */
/* Section (format 'fiche')                                            */
/* ------------------------------------------------------------------ */

export interface Section {
  id: string;
  heading: string;
  blocks: ContentBlock[];
  glossary?: GlossaryTerm[];
}

/* ------------------------------------------------------------------ */
/* Topic                                                               */
/* ------------------------------------------------------------------ */

interface BaseTopic {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  gradient: string;
  badge: string;
  summary: string;
  /** Catégorie de quiz à lancer depuis la fin du contenu. */
  quizCategoryTarget?: string;
  /** Sources générales listées en pied de contenu. */
  sources?: SourceRef[];
  /** Incrémenté à chaque révision éditoriale — sert à invalider la progression. */
  revision: number;
}

export interface FicheTopic extends BaseTopic {
  format: 'fiche';
  sections: Section[];
}

export interface RecitTopic extends BaseTopic {
  format: 'recit';
  chapters: Chapter[];
  /** Durée de lecture estimée, en minutes. */
  estimatedMinutes?: number;
}

export type LearningTopic = FicheTopic | RecitTopic;

export const isRecit = (t: LearningTopic): t is RecitTopic => t.format === 'recit';

/* ------------------------------------------------------------------ */
/* Progression utilisateur (persistée dans Firestore)                  */
/* ------------------------------------------------------------------ */

export interface TopicProgress {
  topicId: string;
  /** Revision du topic au moment de la lecture. Si elle diffère, la progression est réinitialisée. */
  revision: number;
  /** Ids des chapitres/sections consultés. */
  completedUnits: string[];
  /** Résultat des points de contrôle, par id de chapitre. */
  checkpointResults: Record<string, boolean>;
  completedAt?: string;
  lastOpenedAt: string;
}