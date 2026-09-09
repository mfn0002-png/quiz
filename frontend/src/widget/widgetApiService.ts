/**
 * widgetApiService.ts — Service API du widget NoorQuiz
 *
 * Copie légère de apiService.ts, sans les dépendances quiz/firebase.
 * L'URL de l'API est configurable via prop (passée par le site hôte).
 */

export interface AssistantConversation {
  id: string;
  title: string;
  createdAt: string;
  lastUpdated: string;
  messageCount: number;
}

export interface Keyword {
  term: string;
  definition: string;
}

export interface ChatQuizData {
  topic?: string;
  difficulty?: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  keywords: Keyword[];
}

export interface AssistantResponse {
  answer: string;
  keywords: Keyword[];
  quizData?: ChatQuizData;
  conversationId?: string;
}

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  keywords?: Keyword[];
  quote?: string | null;
  quoteMsgId?: number | null;
  quizData?: ChatQuizData;
}

const WIDGET_SESSION_KEY = 'noor_widget_session_id';
const WIDGET_CONV_KEY    = 'noor_widget_active_conv';

/**
 * Récupère ou génère un identifiant de session anonyme pour le widget.
 */
export function getWidgetSessionId(): string {
  let id = localStorage.getItem(WIDGET_SESSION_KEY);
  if (!id) {
    id = `widget_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    localStorage.setItem(WIDGET_SESSION_KEY, id);
  }
  return id;
}

export function getWidgetActiveConvId(): string | null {
  return localStorage.getItem(WIDGET_CONV_KEY);
}

export function setWidgetActiveConvId(id: string | null): void {
  if (id) {
    localStorage.setItem(WIDGET_CONV_KEY, id);
  } else {
    localStorage.removeItem(WIDGET_CONV_KEY);
  }
}

/**
 * Envoie un message à l'assistant.
 */
export async function widgetAskQuestion(
  apiUrl: string,
  question: string,
  conversationId?: string | null,
  clientId?: string
): Promise<AssistantResponse> {
  const finalClientId = clientId || getWidgetSessionId();
  const body: Record<string, unknown> = { question, clientId: finalClientId };
  if (conversationId) body.conversationId = conversationId;

  const response = await fetch(`${apiUrl}/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || `Erreur serveur HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Récupère l'historique d'une conversation.
 */
export async function widgetGetHistory(apiUrl: string, sessionId?: string): Promise<AssistantHistoryMessage[]> {
  const id = sessionId || getWidgetSessionId();
  try {
    const r = await fetch(`${apiUrl}/assistant/history/${id}`);
    if (!r.ok) return [];
    const data = await r.json().catch(() => ({ history: [] }));
    return data.history || [];
  } catch {
    return [];
  }
}

/**
 * Récupère la liste des conversations du client.
 */
export async function widgetGetConversations(apiUrl: string, clientId?: string): Promise<AssistantConversation[]> {
  const id = clientId || getWidgetSessionId();
  try {
    const r = await fetch(`${apiUrl}/assistant/conversations/${id}`);
    if (!r.ok) return [];
    const data = await r.json().catch(() => ({ conversations: [] }));
    return data.conversations || [];
  } catch {
    return [];
  }
}

/**
 * Supprime une conversation.
 */
export async function widgetDeleteConversation(apiUrl: string, convId: string, clientId?: string): Promise<void> {
  const id = clientId || getWidgetSessionId();
  await fetch(`${apiUrl}/assistant/conversation/${id}/${convId}`, {
    method: 'DELETE',
  }).catch(() => {});
}
