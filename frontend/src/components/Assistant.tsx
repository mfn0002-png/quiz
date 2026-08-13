import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, RotateCcw, Cpu, Quote, X, MessageSquareQuote } from 'lucide-react';
import { askQuestion, AssistantResponse, ChatQuizData, getClientSessionId, resetAssistantSession, getAssistantHistory } from '../services/apiService';
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
  const [quotedMsgId, setQuotedMsgId] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedMsgId, setSelectedMsgId] = useState<number | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [highlightedPassage, setHighlightedPassage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const sessionId = getClientSessionId();

  // Charger l'historique depuis Redis au montage et restaurer les citations
  useEffect(() => {
    getAssistantHistory(sessionId).then(history => {
      if (history && history.length > 0) {
        const loadedMsgs = history.map((msg, index) => {
          let quote: string | null = (msg as any).quote || null;
          let content = msg.content;

          // Extraire la citation si le message utilisateur stocké en Redis utilise la syntaxe > "extrait"\n\n question
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
            quoteMsgId: (msg as any).quoteMsgId || null,
            assistantData: {
              answer: content,
              keywords: msg.keywords || [],
              quizData: (msg as any).quizData
            }
          };
        });
        setMessages(loadedMsgs);
      }
    }).catch(err => console.error("Erreur chargement historique :", err));
  }, [sessionId]);

  // Écouteur de sélection de texte (limité aux messages & exclusion du texte d'aide)
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length >= 3 && chatContainerRef.current) {
        try {
          const anchorEl = selection?.anchorNode?.parentElement;
          const focusEl = selection?.focusNode?.parentElement;

          // Exclure les consignes "Cliquez sur les mots surlignés" (.no-quote) et les boutons
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
      setQuotedMsgId(selectedMsgId);
      setSelectedText('');
      setSelectedMsgId(null);
      setSelectionPos(null);
      window.getSelection()?.removeAllRanges();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const scrollToMessage = (targetMsgId: number, passageText?: string | null) => {
    const el = document.getElementById(`msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetMsgId);
      if (passageText) setHighlightedPassage(passageText);
      setTimeout(() => {
        setHighlightedMsgId(null);
        setHighlightedPassage(null);
      }, 1800);
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
    setQuotedMsgId(null);
    setLoading(false);
  };

  const sendMessage = async () => {
    const rawQuestion = input.trim();
    if (!rawQuestion || loading) return;

    const currentQuote = quotedText;
    const currentQuoteMsgId = quotedMsgId;

    const questionToSend = currentQuote
      ? `> "${currentQuote}"\n\n${rawQuestion}`
      : rawQuestion;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: rawQuestion,
      quote: currentQuote,
      quoteMsgId: currentQuoteMsgId,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setQuotedText(null);
    setQuotedMsgId(null);
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
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {messages.map(msg => {
          const isMsgHighlighted = highlightedMsgId === msg.id;

          return (
            <div key={msg.id} id={`msg-${msg.id}`} data-msg-id={msg.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {/* Ligne de citation au-dessus de la bulle utilisateur (cliquable pour rediriger vers le texte d'origine) */}
              {msg.role === 'user' && msg.quote && (
                <div
                  onClick={() => msg.quoteMsgId !== null && msg.quoteMsgId !== undefined && scrollToMessage(msg.quoteMsgId, msg.quote)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                    maxWidth: '80%',
                    marginLeft: 'auto',
                    justifyContent: 'flex-end',
                    cursor: msg.quoteMsgId !== null && msg.quoteMsgId !== undefined ? 'pointer' : 'default',
                    transition: 'opacity 150ms',
                  }}
                  title={msg.quoteMsgId !== null && msg.quoteMsgId !== undefined ? "Cliquer pour voir le passage d'origine dans la conversation" : undefined}
                >
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
                  transition: 'all 300ms ease-in-out',
                }}>
                  {msg.role === 'assistant' && msg.assistantData?.quizData ? (
                    <ChatQuizCard quizData={msg.assistantData.quizData} />
                  ) : msg.role === 'assistant' && msg.assistantData && msg.id !== 0 ? (
                    <>
                      <KeywordText
                        text={msg.content}
                        keywords={msg.assistantData.keywords}
                        highlightPassage={isMsgHighlighted ? highlightedPassage : null}
                      />
                      {msg.assistantData.keywords.length > 0 && (
                        <div className="no-quote" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
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
          );
        })}

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

      {/* Input area avec bannière de citation cliquable pour voir l'extrait d'origine */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        {quotedText && (
          <div
            onClick={() => quotedMsgId !== null && quotedMsgId !== undefined && scrollToMessage(quotedMsgId, quotedText)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.55rem 0.85rem',
              backgroundColor: 'rgba(5, 150, 105, 0.08)',
              borderLeft: '4px solid var(--primary-color)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              cursor: quotedMsgId !== null && quotedMsgId !== undefined ? 'pointer' : 'default',
              transition: 'background-color 150ms',
            }}
            title={quotedMsgId !== null && quotedMsgId !== undefined ? "Cliquer pour voir le passage d'origine dans la conversation" : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
              <Quote size={14} color="var(--primary-color)" />
              <span style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                "{quotedText}"
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQuotedText(null);
                setQuotedMsgId(null);
              }}
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

function ChatQuizCard({ quizData }: { quizData: ChatQuizData }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const isAnswered = selectedOption !== null;
  const isCorrect = selectedOption === quizData.correctAnswerIndex;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.98rem', lineHeight: 1.5 }}>
        📝 {quizData.questionText}
      </div>

      {/* Grid or list of 4 options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {quizData.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C', 'D'][idx];
          let btnStyle: React.CSSProperties = {
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
              onClick={() => setSelectedOption(idx)}
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

      {/* Révélation après le clic sur une option */}
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
