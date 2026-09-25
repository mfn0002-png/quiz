import { ModalType, ModalState } from './AppModal';
import { ContentDraft } from './ContentPreviewModal';

export type { ModalType, ModalState, ContentDraft };

export interface TopicSummaryAdmin {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon?: string;
  gradient?: string;
  badge?: string;
  summary?: string;
  format: 'recit' | 'fiche';
  order?: number;
  totalUnits?: number;
  unitHeadings?: string[];
  source?: 'firestore' | 'local';
  published?: boolean;
  createdAt?: string;
}

export interface SyncResult {
  totalIngested: number;
  skippedCount: number;
  errorsCount: number;
  elapsed: string;
}

export interface RagSettingsConfig {
  model: string;
  embeddingModel: string;
  topK: number;
  minSimilarityScore: number;
  collectionsToSync: string[];
}

export interface QuizSettingsConfig {
  defaultQuestionCount: number;
  timerSeconds: number;
  lifeRechargeSeconds: number;
  maxLives: number;
}
