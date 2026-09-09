/**
 * WidgetAssistant.tsx — Composant chat pour le widget NoorQuiz standalone
 *
 * Adapté depuis Assistant.tsx :
 * - Aucune dépendance react-router-dom
 * - URL de l'API configurable via prop apiUrl
 * - Variables CSS remplacées par les variables --noor-* (avec fallback site hôte)
 * - Classes CSS préfixées noor- pour éviter les conflits
 */

import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Bot, User, Quote, X,
  MessageSquareQuote, History, Plus, Trash2,
} from 'lucide-react';
import {
  widgetAskQuestion,
  widgetGetHistory,
  widgetGetConversations,
  widgetDeleteConversation,
  getWidgetSessionId,
  getWidgetActiveConvId,
  setWidgetActiveConvId,
  AssistantConversation,
  AssistantResponse,
  ChatQuizData,
  Keyword,
} from './widgetApiService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  quote?: string | null;
  quoteMsgId?: number | null;
  assistantData?: AssistantResponse;
}

interface WidgetAssistantProps {
  apiUrl: string;
  isCompact?: boolean;
}

// ─── Message de bienvenue par défaut ──────────────────────────────────────────

const DEFAULT_WELCOME_MSG: Message = {
  id: 0,
  role: 'assistant',
  content: 'Assalamu Alaykoum ! Je suis votre assistant islamique. Posez-moi toutes vos questions sur la religion musulmane.',
  assistantData: { answer: '', keywords: [] },
};

// ─── Helper erreur ────────────────────────────────────────────────────────────

function parseWidgetError(err: unknown): { title: string; detail: string } {
  let message = '';
  if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object' && 'message' in err) {
    message = String((err as Record<string, unknown>).message);
  }
  const m = message.toLowerCase();
  if (message.includes('429') || m.includes('quota')) {
    return { title: 'Quota IA atteint', detail: 'Réessayez dans quelques instants.' };
  }
  if (message.includes('503') || m.includes('overloaded')) {
    return { title: 'Serveur IA surchargé', detail: 'Le serveur est momentanément indisponible.' };
  }
  if (m.includes('failed to fetch') || m.includes('econnrefused')) {
    return { title: 'Serveur inaccessible', detail: 'Impossible de contacter le serveur.' };
  }
  return { title: 'Erreur', detail: message || "Une erreur inattendue s'est produite." };
}

// ─── Variables CSS namespaced ─────────────────────────────────────────────────
// Usage : au lieu de var(--primary-color), on utilise var(--noor-primary)
// Défini dans widget.css sur #noor-widget-root avec fallback sur les vars du site hôte

const V = {
  primary:     'var(--noor-primary)',
  bg:          'var(--noor-bg)',
  surface:     'var(--noor-surface)',
  text:        'var(--noor-text)',
  textSub:     'var(--noor-text-sub)',
  border:      'var(--noor-border)',
  success:     'var(--noor-success)',
  error:       'var(--noor-error)',
  radiusSm:    'var(--noor-radius-sm)',
  radiusMd:    'var(--noor-radius-md)',
  radiusLg:    'var(--noor-radius-lg)',
  radiusFull:  'var(--noor-radius-full)',
} as const;

// ─── Composant principal ──────────────────────────────────────────────────────

export function WidgetAssistant({ apiUrl, isCompact = false }: WidgetAssistantProps) {
  const clientId = getWidgetSessionId();

  const [activeConvId, setActiveConvId] = useState<string | null>(getWidgetActiveConvId);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(() => !!getWidgetActiveConvId());
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [quotedMsgId, setQuotedMsgId] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedMsgId, setSelectedMsgId] = useState<number | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [highlightedPassage, setHighlightedPassage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<{ message: string; detail?: string } | null>(null);

  const bottomRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ── Chargement des conversations ──────────────────────────────────────────

  const refreshConversations = async () => {
    setIsLoadingConvs(true);
    try {
      const list = await widgetGetConversations(apiUrl, clientId);
      setConversations(list);
    } catch { /* silencieux */ }
    finally { setIsLoadingConvs(false); }
  };

  useEffect(() => { refreshConversations(); }, [clientId]);

  const loadConversationMessages = async (convId: string | null) => {
    if (!convId) {
      setMessages([DEFAULT_WELCOME_MSG]);
      setIsLoadingMessages(false);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const history = await widgetGetHistory(apiUrl, convId);
      if (history && history.length > 0) {
        const loaded = history.map((msg, index) => {
          let quote: string | null = msg.quote || null;
          let content = msg.content;
          if (!quote && msg.role === 'user') {
            const match = msg.content.match(/^>\s*"([\s\S]*?)"\n\n([\s\S]*)$/);
            if (match) { quote = match[1]; content = match[2]; }
          }
          return {
            id: index,
            role: msg.role as 'user' | 'assistant',
            content,
            quote,
            quoteMsgId: msg.quoteMsgId || null,
            assistantData: { answer: content, keywords: msg.keywords || [], quizData: msg.quizData },
          };
        });
        setMessages(loaded);
      } else {
        setMessages([DEFAULT_WELCOME_MSG]);
      }
    } catch {
      setMessages([DEFAULT_WELCOME_MSG]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => { loadConversationMessages(activeConvId); }, [activeConvId]);

  // ── Écouteur sélection de texte ───────────────────────────────────────────

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length >= 3 && chatContainerRef.current) {
        try {
          const anchorEl = selection?.anchorNode?.parentElement;
          const focusEl  = selection?.focusNode?.parentElement;
          const isNoQuote = anchorEl?.closest('.noor-no-quote') || focusEl?.closest('.noor-no-quote');
          const isButton  = anchorEl?.closest('button') || focusEl?.closest('button');
          const msgDiv    = anchorEl?.closest('[data-noor-msg-id]');
          const inside = (
            anchorEl && focusEl &&
            chatContainerRef.current.contains(anchorEl) &&
            chatContainerRef.current.contains(focusEl) &&
            !isNoQuote && !isButton && msgDiv
          );
          if (inside) {
            const range = selection?.getRangeAt(0);
            const rect  = range?.getBoundingClientRect();
            if (rect && rect.width > 0) {
              const msgIdAttr = (msgDiv as Element).getAttribute('data-noor-msg-id');
              setSelectedText(text);
              setSelectedMsgId(msgIdAttr ? Number(msgIdAttr) : null);
              setSelectionPos({ x: rect.left + rect.width / 2, y: Math.max(10, rect.top - 48) });
              return;
            }
          }
        } catch { /* ignore */ }
      }
      setSelectionPos(null);
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Gestion conversations ─────────────────────────────────────────────────

  const handleSelectConv = (convId: string) => {
    if (convId === activeConvId) { setShowHistoryDrawer(false); return; }
    setIsLoadingMessages(true);
    setActiveConvId(convId);
    setWidgetActiveConvId(convId);
    setShowHistoryDrawer(false);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setWidgetActiveConvId(null);
    setMessages([DEFAULT_WELCOME_MSG]);
    setIsLoadingMessages(false);
    setShowHistoryDrawer(false);
    setErrorBanner(null);
  };

  const handleDeleteConv = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await widgetDeleteConversation(apiUrl, convId, clientId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConvId === convId) handleNewChat();
  };

  // ── Citations ─────────────────────────────────────────────────────────────

  const handleApplyQuote = () => {
    if (selectedText) {
      setQuotedText(selectedText);
      setQuotedMsgId(selectedMsgId);
      window.getSelection()?.removeAllRanges();
      setSelectionPos(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleRemoveQuote = () => { setQuotedText(null); setQuotedMsgId(null); };

  const navigateToQuote = (passage: string, msgId?: number | null) => {
    const cleanQ = passage.toLowerCase().trim();
    if (msgId !== undefined && msgId !== null) {
      const targetEl = document.querySelector(`[data-noor-msg-id="${msgId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(msgId);
        setHighlightedPassage(passage);
        setTimeout(() => { setHighlightedMsgId(null); setHighlightedPassage(null); }, 3000);
        return;
      }
    }
    const found = messages.find(m => m.role === 'assistant' && m.content.toLowerCase().includes(cleanQ));
    if (found) {
      const targetEl = document.querySelector(`[data-noor-msg-id="${found.id}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(found.id);
        setHighlightedPassage(passage);
        setTimeout(() => { setHighlightedMsgId(null); setHighlightedPassage(null); }, 3000);
      }
    }
  };

  // ── Envoi message ─────────────────────────────────────────────────────────

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = input.trim();
    if (!textToSend || loading) return;

    setErrorBanner(null);
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      quote: quotedText,
      quoteMsgId: quotedMsgId,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setQuotedText(null);
    setQuotedMsgId(null);
    setLoading(true);

    try {
      const formattedQuestion = userMsg.quote
        ? `> "${userMsg.quote}"\n\n${userMsg.content}`
        : userMsg.content;

      const response = await widgetAskQuestion(apiUrl, formattedQuestion, activeConvId, clientId);

      if (response.conversationId && response.conversationId !== activeConvId) {
        setActiveConvId(response.conversationId);
        setWidgetActiveConvId(response.conversationId);
      }

      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        assistantData: response,
      };
      setMessages(prev => [...prev, assistantMsg]);
      refreshConversations();
    } catch (err: unknown) {
      const parsed = parseWidgetError(err);
      setErrorBanner({ message: parsed.title, detail: parsed.detail });
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ ${parsed.title} : ${parsed.detail}`,
        assistantData: { answer: '', keywords: [] },
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flex: 1,
      minHeight: 0,
      position: 'relative',
      overflow: 'hidden',
      padding: isCompact ? '0.5rem' : '0.65rem 0.85rem 0.5rem',
      boxSizing: 'border-box',
      backgroundColor: V.bg,
      color: V.text,
      fontFamily: 'var(--noor-font)',
    }}>

      {/* Bannière d'erreur */}
      {errorBanner && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: V.error,
          padding: isCompact ? '0.5rem 0.75rem' : '0.65rem 0.9rem',
          borderRadius: '10px',
          marginBottom: '0.4rem',
          fontSize: isCompact ? '0.82rem' : '0.88rem',
          flexShrink: 0,
        }}>
          <strong>⚠️ {errorBanner.message}</strong>
          {errorBanner.detail && <div style={{ fontSize: '0.78rem', marginTop: '2px', opacity: 0.8 }}>{errorBanner.detail}</div>}
        </div>
      )}

      {/* Barre de navigation supérieure */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isCompact ? '0.4rem 0.6rem' : '0.55rem 0.85rem',
        backgroundColor: V.surface,
        border: `1px solid ${V.border}`,
        borderRadius: isCompact ? '10px' : '14px',
        marginBottom: isCompact ? '0.4rem' : '0.55rem',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
          {/* Bouton historique */}
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: isCompact ? '0.3rem 0.55rem' : '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(128,128,128,0.25)',
              backgroundColor: showHistoryDrawer ? V.primary : 'transparent',
              color: showHistoryDrawer ? 'white' : V.textSub,
              fontSize: isCompact ? '0.78rem' : '0.85rem',
              fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              transition: 'all 150ms',
              fontFamily: 'inherit',
            }}
          >
            <History size={isCompact ? 13 : 15} className={isLoadingConvs ? 'noor-spin' : ''} />
            <span>{isLoadingConvs ? '...' : `Historique (${conversations.length})`}</span>
          </button>

          {/* Titre conversation active */}
          <div style={{
            fontSize: isCompact ? '0.78rem' : '0.82rem',
            fontWeight: 500,
            color: V.textSub,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0, paddingRight: '0.5rem',
          }}>
            {activeConv ? activeConv.title : 'Discussion en cours'}
          </div>
        </div>

        {/* Bouton nouvelle conversation */}
        <button
          onClick={handleNewChat}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: isCompact ? '0.3rem 0.55rem' : '0.4rem 0.75rem',
            borderRadius: '8px', border: 'none',
            backgroundColor: V.primary, color: 'white',
            fontSize: isCompact ? '0.78rem' : '0.85rem',
            fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            transition: 'all 150ms', fontFamily: 'inherit',
          }}
        >
          <Plus size={isCompact ? 13 : 15} />
          <span>{isCompact ? 'Nouveau' : 'Nouveau chat'}</span>
        </button>
      </div>

      {/* Popover de citation */}
      {selectionPos && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionPos.x}px`, top: `${selectionPos.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 2147483647,
            backgroundColor: '#1e293b', color: '#ffffff',
            padding: '0.35rem 0.7rem', borderRadius: '20px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.82rem', fontWeight: 500,
            cursor: 'pointer', userSelect: 'none',
          }}
          onMouseDown={(e) => { e.preventDefault(); handleApplyQuote(); }}
        >
          <Quote size={13} style={{ color: '#38bdf8' }} />
          <span>Citer ce passage</span>
        </div>
      )}

      {/* Conteneur chat + sidebar */}
      <div style={{
        display: 'flex', flex: 1, gap: '0.4rem',
        minHeight: 0, height: '100%',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Sidebar historique */}
        {showHistoryDrawer && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%', zIndex: 30,
            backgroundColor: V.surface,
            border: `1px solid ${V.border}`,
            borderRadius: '10px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.75rem 0.9rem',
              borderBottom: `1px solid ${V.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontWeight: 700, fontSize: '0.88rem', flexShrink: 0,
              color: V.text,
            }}>
              <span>📜 Discussions passées</span>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: V.textSub, display: 'flex' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.4rem' }}>
              {isLoadingConvs ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: V.textSub, fontSize: '0.85rem' }}>
                  ⏳ Chargement...
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: V.textSub, fontSize: '0.85rem' }}>
                  Aucune conversation enregistrée.
                </div>
              ) : (
                conversations.map(conv => {
                  const isActive = conv.id === activeConvId;
                  const dateStr = new Date(conv.lastUpdated || conv.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  });
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px', marginBottom: '0.3rem',
                        backgroundColor: isActive ? 'rgba(5,150,105,0.12)' : 'transparent',
                        border: isActive ? `1px solid ${V.primary}` : '1px solid transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', transition: 'all 150ms',
                      }}
                    >
                      <div style={{ overflow: 'hidden', flex: 1, paddingRight: '0.4rem' }}>
                        <div style={{
                          fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                          color: isActive ? V.primary : V.text,
                          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                        }}>
                          {conv.title || 'Discussion'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: V.textSub, marginTop: '1px' }}>{dateStr}</div>
                      </div>
                      <button
                        onClick={e => handleDeleteConv(e, conv.id)}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          color: V.textSub, padding: '3px', borderRadius: '4px',
                          display: 'flex', alignItems: 'center',
                        }}
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Zone de chat */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1, backgroundColor: V.surface,
            borderRadius: '10px', border: `1px solid ${V.border}`,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', minHeight: 0, height: '100%',
          }}
        >
          {isLoadingMessages ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '2rem', textAlign: 'center', gap: '1rem',
            }}>
              <Bot size={32} style={{ color: V.primary }} />
              <p style={{ color: V.textSub, fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={15} className="noor-spin" style={{ color: V.primary }} />
                Chargement de la discussion...
              </p>
            </div>
          ) : (
            <div style={{
              flex: 1, overflowY: 'auto', minHeight: 0,
              padding: isCompact ? '0.65rem' : '1rem',
              display: 'flex', flexDirection: 'column',
              gap: isCompact ? '0.7rem' : '1rem',
            }}>
              {messages.map(msg => {
                const isMsgHighlighted = msg.id === highlightedMsgId;
                return (
                  <div
                    key={msg.id}
                    data-noor-msg-id={msg.id}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: isMsgHighlighted ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                      borderRadius: '10px',
                      padding: isMsgHighlighted ? '0.3rem' : '0',
                      transition: 'background-color 300ms ease',
                    }}
                  >
                    {/* Citation au-dessus du message utilisateur */}
                    {msg.role === 'user' && msg.quote && (
                      <div
                        onClick={() => navigateToQuote(msg.quote!, msg.quoteMsgId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: isCompact ? '0.73rem' : '0.82rem',
                          color: V.textSub, marginBottom: '0.2rem',
                          maxWidth: '88%', marginLeft: 'auto',
                          justifyContent: 'flex-end', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', color: V.primary }}>↳</span>
                        <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                          "{msg.quote}"
                        </span>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      gap: isCompact ? '0.4rem' : '0.65rem',
                      alignItems: 'flex-start',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: isCompact ? '26px' : '32px',
                        height: isCompact ? '26px' : '32px',
                        borderRadius: '50%', flexShrink: 0,
                        backgroundColor: V.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {msg.role === 'user'
                          ? <User size={isCompact ? 13 : 16} color="white" />
                          : <Bot  size={isCompact ? 13 : 16} color="white" />
                        }
                      </div>

                      {/* Bulle */}
                      <div style={{
                        maxWidth: '88%',
                        backgroundColor: msg.role === 'user' ? V.primary : V.bg,
                        color: msg.role === 'user' ? 'white' : V.text,
                        padding: isCompact ? '0.5rem 0.75rem' : '0.75rem 1rem',
                        borderRadius: msg.role === 'user' ? '13px 3px 13px 13px' : '3px 13px 13px 13px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        fontSize: isCompact ? '0.85rem' : '0.95rem',
                        lineHeight: 1.65,
                        border: msg.role === 'assistant' ? `1px solid ${V.border}` : 'none',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.role === 'assistant' && msg.assistantData?.quizData ? (
                          <WidgetQuizCard quizData={msg.assistantData.quizData} isCompact={isCompact} />
                        ) : msg.role === 'assistant' && msg.assistantData && msg.id !== 0 ? (
                          <>
                            <WidgetKeywordText
                              text={msg.content}
                              keywords={msg.assistantData.keywords}
                              highlightPassage={isMsgHighlighted ? highlightedPassage : null}
                              noorVars={V}
                            />
                            {msg.assistantData.keywords.length > 0 && (
                              <div className="noor-no-quote" style={{
                                marginTop: isCompact ? '0.4rem' : '0.6rem',
                                paddingTop: isCompact ? '0.4rem' : '0.6rem',
                                borderTop: `1px solid ${V.border}`,
                              }}>
                                <p style={{ fontSize: '0.75rem', color: V.textSub, margin: 0 }}>
                                  ✨ Cliquez sur les mots surlignés pour leur définition
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{
                    width: isCompact ? '26px' : '32px', height: isCompact ? '26px' : '32px',
                    borderRadius: '50%', backgroundColor: V.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bot size={isCompact ? 13 : 16} color="white" />
                  </div>
                  <div style={{
                    backgroundColor: V.bg, padding: '0.55rem 0.85rem',
                    borderRadius: '3px 13px 13px 13px',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    border: `1px solid ${V.border}`,
                  }}>
                    <Loader2 size={isCompact ? 14 : 16} className="noor-spin" style={{ color: V.primary }} />
                    <span style={{ color: V.textSub, fontSize: isCompact ? '0.82rem' : '0.9rem' }}>
                      L'assistant réfléchit...
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {/* Formulaire de saisie */}
          <div style={{
            padding: isCompact ? '0.5rem 0.6rem' : '0.75rem 0.85rem',
            borderTop: `1px solid ${V.border}`,
            backgroundColor: V.surface, flexShrink: 0,
          }}>
            {quotedText && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                borderLeft: '3px solid #38bdf8',
                padding: isCompact ? '0.3rem 0.6rem' : '0.45rem 0.75rem',
                borderRadius: '0 8px 8px 0',
                marginBottom: isCompact ? '0.4rem' : '0.55rem',
                fontSize: isCompact ? '0.78rem' : '0.85rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', flex: 1 }}>
                  <MessageSquareQuote size={isCompact ? 13 : 15} style={{ color: '#0284c7', flexShrink: 0 }} />
                  <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: V.text }}>
                    "{quotedText}"
                  </span>
                </div>
                <button
                  type="button" onClick={handleRemoveQuote}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: V.textSub, padding: '2px', marginLeft: '0.4rem' }}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur l'Islam..."
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: isCompact ? '0.45rem 0.7rem' : '0.65rem 0.9rem',
                  borderRadius: '10px',
                  border: `1px solid ${V.border}`,
                  backgroundColor: V.bg,
                  color: V.text,
                  fontSize: isCompact ? '0.85rem' : '0.92rem',
                  resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                  minHeight: isCompact ? '36px' : '42px',
                  maxHeight: '110px',
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  width: isCompact ? '36px' : '42px',
                  height: isCompact ? '36px' : '42px',
                  borderRadius: '10px', border: 'none',
                  backgroundColor: V.primary, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.6 : 1,
                  flexShrink: 0, transition: 'all 150ms',
                }}
              >
                {loading
                  ? <Loader2 size={isCompact ? 14 : 16} className="noor-spin" />
                  : <Send    size={isCompact ? 14 : 16} />
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant mots-clés (version widget) ─────────────────────────────────────

interface WidgetKeywordTextProps {
  text: string;
  keywords: Keyword[];
  highlightPassage?: string | null;
  noorVars: typeof V;
}

function WidgetKeywordText({ text, keywords, highlightPassage, noorVars }: WidgetKeywordTextProps) {
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clean = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\*/g, '');
  const sanitized = clean(text);
  const cleanPassage = highlightPassage ? clean(highlightPassage).toLowerCase() : null;

  if (!keywords || keywords.length === 0) {
    if (cleanPassage) {
      const idx = sanitized.toLowerCase().indexOf(cleanPassage);
      if (idx >= 0) {
        return (
          <div ref={containerRef}>
            {sanitized.slice(0, idx)}
            <mark style={{ backgroundColor: 'rgba(56, 189, 248, 0.3)', borderRadius: '3px', padding: '0 2px' }}>
              {sanitized.slice(idx, idx + cleanPassage.length)}
            </mark>
            {sanitized.slice(idx + cleanPassage.length)}
          </div>
        );
      }
    }
    return <div ref={containerRef}>{sanitized}</div>;
  }

  const escapedTerms = keywords.map(k => k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = sanitized.split(pattern);
  const usedTerms = new Set<string>();

  const handleKwClick = (kw: Keyword, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const cRect = containerRef.current?.getBoundingClientRect();
    setPopupPos({ x: rect.left - (cRect?.left || 0), y: rect.bottom - (cRect?.top || 0) + 8 });
    setActiveKeyword(prev => prev?.term === kw.term ? null : kw);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {parts.map((part, i) => {
        const match = keywords.find(k => k.term.toLowerCase() === part.toLowerCase());
        const key = match?.term.toLowerCase();
        if (match && key && !usedTerms.has(key)) {
          usedTerms.add(key);
          const isActive = activeKeyword?.term === match.term;
          return (
            <span
              key={i}
              onClick={e => handleKwClick(match, e)}
              style={{
                backgroundColor: isActive ? noorVars.primary : 'rgba(5, 150, 105, 0.15)',
                color: isActive ? 'white' : noorVars.primary,
                borderRadius: '3px', padding: '0 3px',
                cursor: 'pointer', fontWeight: 600,
                borderBottom: `1px dashed ${noorVars.primary}`,
                transition: 'all 150ms',
              }}
            >
              {part}
            </span>
          );
        }
        if (cleanPassage && part.toLowerCase().includes(cleanPassage)) {
          const idx = part.toLowerCase().indexOf(cleanPassage);
          return (
            <span key={i}>
              {part.slice(0, idx)}
              <mark style={{ backgroundColor: 'rgba(56, 189, 248, 0.3)', borderRadius: '3px', padding: '0 2px' }}>
                {part.slice(idx, idx + cleanPassage.length)}
              </mark>
              {part.slice(idx + cleanPassage.length)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}

      {activeKeyword && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${Math.min(popupPos.x, 200)}px`,
            top: `${popupPos.y}px`,
            zIndex: 100,
            backgroundColor: '#1e293b', color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '0.75rem', maxWidth: '260px',
            fontSize: '0.82rem', lineHeight: 1.5,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <strong style={{ color: noorVars.primary }}>{activeKeyword.term}</strong>
            <button
              onClick={() => setActiveKeyword(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}
            >
              <X size={13} />
            </button>
          </div>
          <p style={{ margin: 0, opacity: 0.85 }}>{activeKeyword.definition}</p>
        </div>
      )}
    </div>
  );
}

// ─── Composant QCM dans le chat (version widget) ──────────────────────────────

interface WidgetQuizCardProps {
  quizData: ChatQuizData;
  isCompact: boolean;
}

function WidgetQuizCard({ quizData, isCompact }: WidgetQuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
  };

  const isCorrect = selectedOption === quizData.correctAnswerIndex;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontWeight: 600, fontSize: isCompact ? '0.88rem' : '0.95rem', lineHeight: 1.5 }}>
        📝 {quizData.questionText}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {quizData.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C', 'D'][idx];
          const isCorrectOpt = idx === quizData.correctAnswerIndex;
          const isSelectedWrong = isAnswered && idx === selectedOption && !isCorrectOpt;

          const btnStyle: React.CSSProperties = {
            padding: '0.55rem 0.75rem',
            borderRadius: '8px',
            border: isAnswered && isCorrectOpt
              ? '1px solid #10b981'
              : isSelectedWrong
              ? '1px solid #ef4444'
              : '1px solid rgba(128,128,128,0.25)',
            backgroundColor: isAnswered && isCorrectOpt
              ? 'rgba(16, 185, 129, 0.12)'
              : isSelectedWrong
              ? 'rgba(239, 68, 68, 0.12)'
              : 'transparent',
            color: isAnswered && isCorrectOpt ? '#10b981' : isSelectedWrong ? '#ef4444' : 'inherit',
            textAlign: 'left', cursor: isAnswered ? 'default' : 'pointer',
            fontSize: isCompact ? '0.85rem' : '0.9rem',
            fontFamily: 'inherit', transition: 'all 150ms',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            opacity: isAnswered && !isCorrectOpt && idx !== selectedOption ? 0.55 : 1,
            fontWeight: isAnswered && isCorrectOpt ? 700 : 400,
          };

          return (
            <button key={idx} disabled={isAnswered} onClick={() => handleSelect(idx)} style={btnStyle}>
              <span style={{
                fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.78rem',
                backgroundColor: isAnswered && isCorrectOpt ? '#10b981' : 'rgba(128,128,128,0.15)',
                color: isAnswered && isCorrectOpt ? 'white' : 'inherit',
              }}>
                {letter}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div style={{
          marginTop: '0.25rem', padding: '0.75rem', borderRadius: '8px', fontSize: '0.87rem',
          border: `1px solid ${isCorrect ? '#10b981' : 'rgba(239, 68, 68, 0.35)'}`,
          backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: isCorrect ? '#10b981' : '#ef4444' }}>
            {isCorrect
              ? "🎉 Bravo ! C'est la bonne réponse !"
              : `❌ Dommage ! La bonne réponse était la ${['A', 'B', 'C', 'D'][quizData.correctAnswerIndex]}.`}
          </div>
          <div style={{ lineHeight: 1.55 }}>
            <strong>💡 Explication : </strong>{quizData.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
