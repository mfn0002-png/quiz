import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Quote, X, MessageSquareQuote, History, Plus, Trash2 } from 'lucide-react';
import {
  askQuestion,
  AssistantResponse,
  ChatQuizData,
  getClientSessionId,
  getAssistantHistory,
  getAssistantConversations,
  deleteAssistantConversation,
  AssistantConversation
} from '../services/apiService';
import { parseApiError } from '../utils/errorUtils';
import { KeywordText } from './KeywordText';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  quote?: string | null;
  quoteMsgId?: number | null;
  assistantData?: AssistantResponse;
}

interface AssistantProps {
  isCompact?: boolean;
}

const DEFAULT_WELCOME_MSG: Message = {
  id: 0,
  role: 'assistant',
  content: 'Assalamu Alaykoum ! Je suis votre assistant islamique. Posez-moi toutes vos questions sur la religion musulmane.',
  assistantData: { answer: '', keywords: [] }
};

export function Assistant({ isCompact = false }: AssistantProps = {}) {
  const clientId = getClientSessionId();

  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    return localStorage.getItem('quiz_active_conv_id') || null;
  });
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [isLoadingConvs, setIsLoadingConvs] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(() => {
    return !!localStorage.getItem('quiz_active_conv_id');
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [quotedMsgId, setQuotedMsgId] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedMsgId, setSelectedMsgId] = useState<number | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [highlightedPassage, setHighlightedPassage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<{ message: string; detail?: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Charger la liste des conversations du client
  const refreshConversations = async () => {
    setIsLoadingConvs(true);
    try {
      const list = await getAssistantConversations(clientId);
      setConversations(list);
    } catch (err) {
      console.error('Erreur chargement liste conversations:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  };

  useEffect(() => {
    refreshConversations();
  }, [clientId]);

  // Charger les messages de la conversation active (ou fallback sessionId legacy)
  const loadConversationMessages = async (convId: string | null) => {
    if (!convId) {
      setMessages([DEFAULT_WELCOME_MSG]);
      setIsLoadingMessages(false);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const history = await getAssistantHistory(convId);
      if (history && history.length > 0) {
        const loadedMsgs = history.map((msg, index) => {
          let quote: string | null = msg.quote || null;
          let content = msg.content;

          if (!quote && msg.role === 'user') {
            const match = msg.content.match(/^>\s*"([\s\S]*?)"\n\n([\s\S]*)$/);
            if (match) {
              quote = match[1];
              content = match[2];
            }
          }

          return {
            id: index,
            role: msg.role as 'user' | 'assistant',
            content,
            quote,
            quoteMsgId: msg.quoteMsgId || null,
            assistantData: {
              answer: content,
              keywords: msg.keywords || [],
              quizData: msg.quizData
            }
          };
        });
        setMessages(loadedMsgs);
      } else {
        setMessages([DEFAULT_WELCOME_MSG]);
      }
    } catch (err) {
      console.error("Erreur chargement historique :", err);
      setMessages([DEFAULT_WELCOME_MSG]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversationMessages(activeConvId);
  }, [activeConvId]);

  // Écouteur de sélection de texte
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length >= 3 && chatContainerRef.current) {
        try {
          const anchorEl = selection?.anchorNode?.parentElement;
          const focusEl = selection?.focusNode?.parentElement;

          const isNoQuote = anchorEl?.closest('.no-quote') || focusEl?.closest('.no-quote');
          const isButton = anchorEl?.closest('button') || focusEl?.closest('button');
          const msgDiv = anchorEl?.closest('[data-msg-id]');

          const isInsideChatBubbles = (
            anchorEl && focusEl &&
            chatContainerRef.current.contains(anchorEl) &&
            chatContainerRef.current.contains(focusEl) &&
            !isNoQuote &&
            !isButton &&
            msgDiv
          );

          if (isInsideChatBubbles) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
              const msgIdAttr = msgDiv.getAttribute('data-msg-id');
              setSelectedText(text);
              setSelectedMsgId(msgIdAttr ? Number(msgIdAttr) : null);
              setSelectionPos({
                x: rect.left + rect.width / 2,
                y: Math.max(10, rect.top - 48),
              });
              return;
            }
          }
        } catch {
          // Ignorer
        }
      }
      setSelectionPos(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectConv = (convId: string) => {
    if (convId === activeConvId) {
      setShowHistoryDrawer(false);
      return;
    }
    setIsLoadingMessages(true);
    setActiveConvId(convId);
    localStorage.setItem('quiz_active_conv_id', convId);
    setShowHistoryDrawer(false);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    localStorage.removeItem('quiz_active_conv_id');
    setMessages([DEFAULT_WELCOME_MSG]);
    setIsLoadingMessages(false);
    setShowHistoryDrawer(false);
    setErrorBanner(null);
  };

  const handleDeleteConv = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    await deleteAssistantConversation(convId, clientId);
    setConversations(prev => prev.filter(c => c.id !== convId));

    if (activeConvId === convId) {
      handleNewChat();
    }
  };

  const handleApplyQuote = () => {
    if (selectedText) {
      setQuotedText(selectedText);
      setQuotedMsgId(selectedMsgId);

      window.getSelection()?.removeAllRanges();
      setSelectionPos(null);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleRemoveQuote = () => {
    setQuotedText(null);
    setQuotedMsgId(null);
  };

  const navigateToQuote = (passage: string, msgId?: number | null) => {
    const cleanQ = passage.toLowerCase().trim();

    if (msgId !== undefined && msgId !== null) {
      const targetEl = document.querySelector(`[data-msg-id="${msgId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(msgId);
        setHighlightedPassage(passage);

        setTimeout(() => {
          setHighlightedMsgId(null);
          setHighlightedPassage(null);
        }, 3000);
        return;
      }
    }

    const found = messages.find(m => m.role === 'assistant' && m.content.toLowerCase().includes(cleanQ));
    if (found) {
      const targetEl = document.querySelector(`[data-msg-id="${found.id}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(found.id);
        setHighlightedPassage(passage);

        setTimeout(() => {
          setHighlightedMsgId(null);
          setHighlightedPassage(null);
        }, 3000);
      }
    }
  };

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

      const response = await askQuestion(formattedQuestion, activeConvId, clientId);

      if (response.conversationId && response.conversationId !== activeConvId) {
        setActiveConvId(response.conversationId);
        localStorage.setItem('quiz_active_conv_id', response.conversationId);
      }

      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        assistantData: response
      };

      setMessages(prev => [...prev, assistantMsg]);
      refreshConversations();
    } catch (err: any) {
      console.error('Erreur Assistant :', err);
      const parsed = parseApiError(err);
      setErrorBanner({ message: parsed.title, detail: parsed.detail });

      const errorMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ ${parsed.title} : ${parsed.detail}`,
        assistantData: { answer: '', keywords: [] }
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 140px)',
      position: 'relative',
    }}>
      {errorBanner && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--error-color)',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          marginBottom: '0.75rem',
          fontSize: '0.9rem',
        }}>
          <strong>⚠️ {errorBanner.message}</strong>
          {errorBanner.detail && <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.8 }}>{errorBanner.detail}</div>}
        </div>
      )}
      {/* Barre de navigation supérieure (Barre de titre & Historique) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--surface-color)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '16px',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.12)',
              backgroundColor: showHistoryDrawer ? 'var(--primary-color)' : 'var(--background-color)',
              color: showHistoryDrawer ? 'white' : 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            title="Afficher l'historique des discussions"
          >
            <History size={16} className={isLoadingConvs ? 'spin' : ''} />
            <span>{isLoadingConvs ? 'Chargement...' : `Historique (${conversations.length})`}</span>
          </button>

          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
            {activeConv ? activeConv.title : 'Discussion en cours'}
          </div>
        </div>

        <button
          onClick={handleNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.9rem',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'all 150ms',
          }}
        >
          <Plus size={16} />
          <span>Nouvelle conversation</span>
        </button>
      </div>

      {/* Popover flottant de citation */}
      {selectionPos && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionPos.x}px`,
            top: `${selectionPos.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
            animation: 'fadeIn 150ms ease-out',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleApplyQuote();
          }}
        >
          <Quote size={13} style={{ color: '#38bdf8' }} />
          <span>Citer ce passage</span>
        </div>
      )}

      {/* Conteneur principal avec volet latéral d'historique */}
      <div style={{ display: 'flex', flex: 1, gap: '0.75rem', minHeight: 0, position: 'relative' }}>

        {/* Volet latéral (Sidebar / Drawer des conversations) */}
        {showHistoryDrawer && (
          <div style={{
            width: '280px',
            flexShrink: 0,
            backgroundColor: 'var(--surface-color)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 20,
          }}>
            <div style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '0.92rem',
            }}>
              <span>📜 Discussions passées</span>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {isLoadingConvs ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  ⏳ Chargement des discussions...
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Aucune conversation enregistrée.
                </div>
              ) : (
                conversations.map(conv => {
                  const isActive = conv.id === activeConvId;
                  const dateStr = new Date(conv.lastUpdated || conv.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '10px',
                        marginBottom: '0.4rem',
                        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                        border: isActive ? '1px solid var(--primary-color)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
        justifyContent: 'space-between',
                        transition: 'all 150ms',
                      }}
                    >
                      <div style={{ overflow: 'hidden', flex: 1, paddingRight: '0.5rem' }}>
                        <div style={{
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.88rem',
                          color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}>
                          {conv.title || 'Discussion'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {dateStr}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteConv(e, conv.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Supprimer cette conversation"
                      >
                        <Trash2 size={14} />
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
            flex: 1,
            backgroundColor: 'var(--surface-color)',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}
        >
          {isLoadingMessages ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              gap: '1.25rem',
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-color)',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.12)',
              }}>
                <Bot size={36} />
              </div>

              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.45rem',
                  lineHeight: 1.4,
                }}>
                  Assalamu Alaykoum wa Rahmatullahi wa Barakatuh 🌙
                </h3>
                <p style={{
                  fontSize: '0.92rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  margin: 0,
                }}>
                  <Loader2 size={16} className="spin" style={{ color: 'var(--primary-color)' }} />
                  <span>Chargement de votre discussion en cours...</span>
                </p>
              </div>

              {/* Skeleton placeholders */}
              <div style={{
                width: '100%',
                maxWidth: '440px',
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                opacity: 0.6,
              }}>
                <div style={{
                  alignSelf: 'flex-end',
                  width: '55%',
                  height: '40px',
                  borderRadius: '16px 16px 4px 16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                }} />
                <div style={{
                  alignSelf: 'flex-start',
                  width: '80%',
                  height: '60px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: 'rgba(0, 0, 0, 0.06)',
                }} />
              </div>
            </div>
          ) : (
            /* Zone des messages */
            <div className="custom-scrollbar" style={{
              flex: 1,
              overflowY: 'auto',
              padding: isCompact ? '0.65rem 0.75rem' : '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompact ? '0.65rem' : '1.25rem',
            }}>
              {messages.map((msg) => {
                const isMsgHighlighted = msg.id === highlightedMsgId;

                return (
                  <div
                    key={msg.id}
                    data-msg-id={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: isMsgHighlighted ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      borderRadius: '12px',
                      padding: isMsgHighlighted ? (isCompact ? '0.35rem' : '0.5rem') : '0',
                      transition: 'background-color 300ms ease-in-out',
                    }}
                  >
                    {/* Ligne de citation au-dessus de la bulle utilisateur */}
                    {msg.role === 'user' && msg.quote && (
                      <div
                        onClick={() => navigateToQuote(msg.quote!, msg.quoteMsgId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: isCompact ? '0.75rem' : '0.85rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.25rem',
                          maxWidth: isCompact ? '90%' : '80%',
                          marginLeft: 'auto',
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                          transition: 'opacity 150ms',
                        }}
                        title="Cliquer pour voir le passage d'origine dans la conversation"
                      >
                        <span style={{ fontSize: isCompact ? '0.95rem' : '1.1rem', lineHeight: 1, color: 'var(--primary-color)' }}>↳</span>
                        <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: isCompact ? '220px' : '350px' }}>
                          "{msg.quote}"
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        gap: isCompact ? '0.45rem' : '0.75rem',
                        alignItems: 'flex-start',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: isCompact ? '28px' : '36px',
                        height: isCompact ? '28px' : '36px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        backgroundColor: msg.role === 'user' ? 'var(--secondary-color)' : 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {msg.role === 'user'
                          ? <User size={isCompact ? 14 : 18} color="white" />
                          : <Bot size={isCompact ? 14 : 18} color="white" />
                        }
                      </div>

                      {/* Bulle */}
                      <div style={{
                        maxWidth: isCompact ? '88%' : '80%',
                        backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--background-color)',
                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                        padding: isCompact ? '0.55rem 0.8rem' : '0.875rem 1.1rem',
                        borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        fontSize: isCompact ? '0.85rem' : '1rem',
                        lineHeight: isCompact ? 1.5 : 1.7,
                        border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                        whiteSpace: 'pre-wrap',
                        transition: 'all 300ms ease-in-out',
                      }}>
                        {msg.role === 'assistant' && msg.assistantData?.quizData ? (
                          <ChatQuizCard quizData={msg.assistantData.quizData} sessionId={clientId} msgId={msg.id} />
                        ) : msg.role === 'assistant' && msg.assistantData && msg.id !== 0 ? (
                          <>
                            <KeywordText
                              text={msg.content}
                              keywords={msg.assistantData.keywords}
                              highlightPassage={isMsgHighlighted ? highlightedPassage : null}
                            />
                            {msg.assistantData.keywords.length > 0 && (
                              <div className="no-quote" style={{ marginTop: isCompact ? '0.4rem' : '0.75rem', paddingTop: isCompact ? '0.4rem' : '0.75rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                <p style={{ fontSize: isCompact ? '0.72rem' : '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.35rem 0' }}>
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
                <div style={{ display: 'flex', gap: isCompact ? '0.45rem' : '0.75rem', alignItems: 'center' }}>
                  <div style={{
                    width: isCompact ? '28px' : '36px',
                    height: isCompact ? '28px' : '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Bot size={isCompact ? 14 : 18} color="white" />
                  </div>
                  <div style={{
                    backgroundColor: 'var(--background-color)',
                    padding: isCompact ? '0.55rem 0.8rem' : '0.875rem 1.1rem',
                    borderRadius: '3px 14px 14px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <Loader2 size={isCompact ? 15 : 18} className="spin" style={{ color: 'var(--primary-color)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: isCompact ? '0.82rem' : '0.95rem' }}>L'assistant réfléchit...</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}

          {/* Formulaire de saisie */}
          <div style={{
            padding: isCompact ? '0.65rem 0.75rem' : '1rem',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'var(--surface-color)',
          }}>
            {/* Aperçu de la citation sélectionnée */}
            {quotedText && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderLeft: '4px solid #38bdf8',
                padding: isCompact ? '0.35rem 0.65rem' : '0.5rem 0.85rem',
                borderRadius: '0 8px 8px 0',
                marginBottom: isCompact ? '0.45rem' : '0.65rem',
                fontSize: isCompact ? '0.78rem' : '0.88rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', flex: 1 }}>
                  <MessageSquareQuote size={isCompact ? 14 : 16} style={{ color: '#0284c7', flexShrink: 0 }} />
                  <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    "{quotedText}"
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveQuote}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '2px',
                    marginLeft: '0.5rem',
                  }}
                  title="Annuler la citation"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur l'Islam..."
                rows={1}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: isCompact ? '0.5rem 0.75rem' : '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.15)',
                  backgroundColor: 'var(--background-color)',
                  color: 'var(--text-primary)',
                  fontSize: isCompact ? '0.85rem' : '0.95rem',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  minHeight: isCompact ? '38px' : '44px',
                  maxHeight: '120px',
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  width: isCompact ? '38px' : '44px',
                  height: isCompact ? '38px' : '44px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.6 : 1,
                  flexShrink: 0,
                  transition: 'all 150ms',
                }}
              >
                {loading ? <Loader2 size={isCompact ? 15 : 18} className="spin" /> : <Send size={isCompact ? 15 : 18} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant Carte QCM dans le chat
// ─────────────────────────────────────────────

interface ChatQuizCardProps {
  quizData: ChatQuizData;
  sessionId: string;
  msgId: number;
}

function ChatQuizCard({ quizData }: ChatQuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
  };

  const isCorrect = selectedOption === quizData.correctAnswerIndex;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.98rem', lineHeight: 1.5 }}>
        📝 {quizData.questionText}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {quizData.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C', 'D'][idx];
          const btnStyle: React.CSSProperties = {
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-primary)',
            textAlign: 'left',
            cursor: isAnswered ? 'default' : 'pointer',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            transition: 'all 150ms',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          };

          if (isAnswered) {
            if (idx === quizData.correctAnswerIndex) {
              btnStyle.backgroundColor = 'rgba(16, 185, 129, 0.15)';
              btnStyle.borderColor = 'var(--success-color)';
              btnStyle.color = 'var(--success-color)';
              btnStyle.fontWeight = 700;
            } else if (idx === selectedOption) {
              btnStyle.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              btnStyle.borderColor = 'var(--error-color)';
              btnStyle.color = 'var(--error-color)';
            } else {
              btnStyle.opacity = 0.6;
            }
          }

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleSelectOption(idx)}
              style={btnStyle}
            >
              <span style={{
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: isAnswered && idx === quizData.correctAnswerIndex ? 'var(--success-color)' : 'rgba(0,0,0,0.06)',
                color: isAnswered && idx === quizData.correctAnswerIndex ? 'white' : 'var(--text-primary)',
                fontSize: '0.8rem'
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
          marginTop: '0.5rem',
          padding: '0.85rem',
          borderRadius: '8px',
          border: `1px solid ${isCorrect ? 'var(--success-color)' : 'rgba(239, 68, 68, 0.3)'}`,
          backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          fontSize: '0.88rem',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: isCorrect ? 'var(--success-color)' : 'var(--error-color)' }}>
            {isCorrect ? "🎉 Bravo ! C'est la bonne réponse !" : `❌ Dommage ! La bonne réponse était la ${['A', 'B', 'C', 'D'][quizData.correctAnswerIndex]}.`}
          </div>

          <div style={{ marginTop: '0.35rem', lineHeight: 1.6 }}>
            <strong>💡 Explication : </strong>
            <KeywordText text={quizData.explanation} keywords={quizData.keywords || []} />
          </div>
        </div>
      )}
    </div>
  );
}
