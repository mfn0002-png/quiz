import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, Sparkles, X, Maximize2, Minimize2, MessageCircle } from 'lucide-react';
import { Assistant } from './Assistant';

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // If user is directly on the /assistant full page, we can hide the floating bubble to avoid redundancy
  const isAssistantRoute = location.pathname === '/assistant';

  if (isAssistantRoute) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="floating-assistant-btn"
          onClick={() => setIsOpen(true)}
          title="Poser une question à l'Assistant IA"
          aria-label="Ouvrir l'Assistant Islamique IA"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bot size={22} />
            <Sparkles
              size={12}
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                color: '#fef08a',
                animation: 'spin 4s linear infinite',
              }}
            />
          </div>
          <span className="btn-text" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Assistant IA
          </span>
        </button>
      )}

      {/* Floating Panel Drawer / Modal */}
      {isOpen && (
        <div
          className="floating-assistant-panel"
          style={{
            width: isExpanded ? '680px' : '440px',
            height: isExpanded ? '780px' : '600px',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--surface-color-subtle)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--primary-color)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  Assistant Islamique
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
                  En ligne & prêt à vous guider
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {/* Expand to full page or expand modal */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Réduire la taille' : 'Agrandir la fenêtre'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/assistant');
                }}
                title="Ouvrir en plein écran"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={16} />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                title="Fermer l'assistant"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Assistant isCompact={!isExpanded} />
          </div>
        </div>
      )}
    </>
  );
}
