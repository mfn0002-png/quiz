import { useState, useRef } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { askQuestion, AssistantResponse } from '../services/apiService';
import { KeywordText } from './KeywordText';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askQuestion(question);
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        assistantData: response
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Erreur IA : ${err.message || JSON.stringify(err)}`,
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
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

      {/* Input area */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-end',
      }}>
        <textarea
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
  );
}
