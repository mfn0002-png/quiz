import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, RotateCcw, Cpu, Quote, X, MessageSquareQuote } from 'lucide-react';
import { askQuestion, AssistantResponse, getClientSessionId, resetAssistantSession, getAssistantHistory } from '../services/apiService';
import { parseApiError } from '../utils/errorUtils';
import { KeywordText } from './KeywordText';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  quote?: string | null;
  assistantData?: AssistantResponse;
}

export function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: 'Assalamu Alaykoum ! Je suis votre assistant islamique. Posez-moi toutes vos questions sur la religion musulmane.',
      assistantData: { answer: '', keywords: [] }
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotedText, setQuotedText] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessionId = getClientSessionId();

  // Charger l'historique depuis Redis au montage
  useEffect(() => {
    getAssistantHistory(sessionId).then(history => {
      if (history && history.length > 0) {
        const loadedMsgs = history.map((msg, index) => ({
          id: index,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          assistantData: { answer: msg.content, keywords: msg.keywords || [] }
        }));
        setMessages(loadedMsgs);
      }
    }).catch(err => console.error("Erreur chargement historique :", err));
  }, [sessionId]);

  // Écouteur global de sélection de texte (style ChatGPT)
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length >= 3) {
        try {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          if (rect && rect.width > 0 && rect.height > 0) {
            setSelectedText(text);
            setSelectionPos({
              x: rect.left + rect.width / 2,
              y: Math.max(10, rect.top - 48),
            });
            return;
          }
        } catch {
          // Ignorer les erreurs de portée
        }
      }
      setSelectionPos(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const applyQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText) {
      setQuotedText(selectedText);
      setSelectedText('');
      setSelectionPos(null);
      window.getSelection()?.removeAllRanges();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleResetConversation = async () => {
    if (loading) return;
    setLoading(true);
    await resetAssistantSession(sessionId);
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: 'Nouvelle conversation démarrée ! Comment puis-je vous aider ?',
        assistantData: { answer: '', keywords: [] }
      }
    ]);
    setQuotedText(null);
    setLoading(false);
  };

  const sendMessage = async () => {
    const rawQuestion = input.trim();
    if (!rawQuestion || loading) return;

    const currentQuote = quotedText;

    const questionToSend = currentQuote
      ? `> "${currentQuote}"\n\n${rawQuestion}`
      : rawQuestion;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: rawQuestion,
      quote: currentQuote,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setQuotedText(null);
    setLoading(true);

    try {
      const response = await askQuestion(questionToSend, sessionId);
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        assistantData: response
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const parsed = parseApiError(err);
      const errorMsg = `${parsed.icon} ${parsed.title} : ${parsed.detail}${parsed.hint ? ` (${parsed.hint})` : ''}`;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMsg,
        assistantData: { answer: '', keywords: [] }
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', position: 'relative' }}>
      {/* Header bar */}
      <div style={{
        padding: '0.5rem 1rem',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.825rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Cpu size={14} color="var(--primary-color)" />
          <span>Mémoire Redis active</span>
        </div>
        <button
          onClick={handleResetConversation}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'none',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: '6px',
            padding: '0.25rem 0.6rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}
        >
          <RotateCcw size={13} />
          Nouvelle conversation
        </button>
      </div>

      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Ligne de citation au-dessus de la bulle utilisateur (style ChatGPT) */}
            {msg.role === 'user' && msg.quote && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.35rem',
                maxWidth: '80%',
                marginLeft: 'auto',
                justifyContent: 'flex-end',
              }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1, color: 'var(--primary-color)' }}>↳</span>
                <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '350px' }}>
                  "{msg.quote}"
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: msg.role === 'user' ? 'var(--secondary-color)' : 'var(--primary-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'user'
                  ? <User size={18} color="white" />
                  : <Bot size={18} color="white" />
                }
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '80%',
                backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--surface-color)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '0.875rem 1.1rem',
                borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                fontSize: '1rem',
                lineHeight: 1.7,
                border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.06)' : 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.role === 'assistant' && msg.assistantData && msg.id !== 0 ? (
                  <>
                    <KeywordText text={msg.content} keywords={msg.assistantData.keywords} />
                    {msg.assistantData.keywords.length > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
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
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'var(--primary-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{
              backgroundColor: 'var(--surface-color)',
              padding: '0.875rem 1.1rem',
              borderRadius: '4px 18px 18px 18px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <Loader2 size={18} color="var(--primary-color)" style={{ animation: 'spin 1.5s linear infinite' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>L'assistant réfléchit...</span>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bulle flottante fixe de citation au surlignement de texte (style ChatGPT) */}
      {selectionPos && (
        <button
          onMouseDown={applyQuote}
          style={{
            position: 'fixed',
            left: `${selectionPos.x}px`,
            top: `${selectionPos.y}px`,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.825rem',
            fontWeight: 600,
            boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          <MessageSquareQuote size={15} />
          Citer ce passage
        </button>
      )}

      {/* Input area avec bannière de citation */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        {quotedText && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.85rem',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            borderLeft: '4px solid var(--primary-color)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
              <Quote size={14} color="var(--primary-color)" />
              <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                "{quotedText}"
              </span>
            </div>
            <button
              onClick={() => setQuotedText(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-secondary)' }}
              title="Annuler la citation"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question... (ex: « C'est quoi le Nisab ? »)"
            rows={2}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '2px solid rgba(0,0,0,0.1)',
              fontFamily: 'var(--font-family)',
              fontSize: '1rem',
              resize: 'none',
              outline: 'none',
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-primary)',
              transition: 'border-color 150ms',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary-color)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{
              padding: '0.75rem',
              borderRadius: '12px',
              aspectRatio: '1',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
