import { RefreshCw, X, Lightbulb } from 'lucide-react';
import { parseApiError, UserFacingError } from '../utils/errorUtils';

interface ErrorBannerProps {
  error: string | UserFacingError | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onDismiss, onRetry }: ErrorBannerProps) {
  if (!error) return null;

  const parsed: UserFacingError = typeof error === 'string'
    ? parseApiError(error)
    : error;

  return (
    <div
      style={{
        margin: '1.25rem auto 2rem auto',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        backdropFilter: 'blur(10px)',
        color: 'var(--text-color, #f87171)',
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.1)',
        animation: 'fadeIn 0.3s ease-in-out',
        maxWidth: '540px',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1, marginTop: '2px', flexShrink: 0 }}>
          {parsed.icon || '⚠️'}
        </span>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ef4444', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {parsed.title}
          </div>
          
          <div style={{ fontSize: '0.875rem', lineHeight: '1.45', opacity: 0.95, wordBreak: 'break-word' }}>
            {parsed.detail}
          </div>

          {parsed.hint && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              borderLeft: '3px solid #ef4444',
              fontSize: '0.825rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem'
            }}>
              <Lightbulb size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#f87171' }} />
              <span><strong>Conseil :</strong> {parsed.hint}</span>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            title="Masquer l'erreur"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {onRetry && (
        <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onRetry}
            className="btn btn-outline"
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.825rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444'
            }}
          >
            <RefreshCw size={13} /> Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
