import { CheckCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface ModalState {
  open: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmLabel?: string;
}

interface AppModalProps {
  modal: ModalState;
  onClose: () => void;
}

const COLOR_MAP: Record<ModalType, string> = {
  success: '#10b981',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
  confirm: '#f59e0b',
};

const BG_MAP: Record<ModalType, string> = {
  success: 'rgba(16, 185, 129, 0.13)',
  error:   'rgba(239, 68, 68, 0.13)',
  warning: 'rgba(245, 158, 11, 0.13)',
  info:    'rgba(59, 130, 246, 0.13)',
  confirm: 'rgba(245, 158, 11, 0.13)',
};

const ICON_MAP: Record<ModalType, React.ReactNode> = {
  success: <CheckCircle  size={26} />,
  error:   <AlertTriangle size={26} />,
  warning: <AlertTriangle size={26} />,
  info:    <Info          size={26} />,
  confirm: <Trash2        size={26} />,
};

export function AppModal({ modal, onClose }: AppModalProps) {
  if (!modal.open) return null;

  const color = COLOR_MAP[modal.type];
  const bg    = BG_MAP[modal.type];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && modal.type !== 'confirm') onClose();
      }}
      role="presentation"
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ border: `1px solid ${color}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre d'accent coloree */}
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${color}, ${color}66)` }} />

        <div style={{ padding: '1.75rem 1.75rem 1.5rem' }}>
          {/* Icone + bouton fermer */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <div
              style={{
                width: 50, height: 50, borderRadius: '50%',
                backgroundColor: bg, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 0 6px ${bg}`,
              }}
            >
              {ICON_MAP[modal.type]}
            </div>

            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '0.3rem',
                borderRadius: 'var(--radius-sm)', display: 'flex',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={18} />
            </button>
          </div>

          <h3
            id="modal-title"
            style={{
              fontSize: '1.05rem', fontWeight: 700,
              margin: '0 0 0.55rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-family)',
            }}
          >
            {modal.title}
          </h3>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: 'pre-line',
              fontFamily: 'var(--font-family)',
            }}
          >
            {modal.message}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            {modal.type === 'confirm' ? (
              <>
                <button
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => { modal.onConfirm?.(); onClose(); }}
                  style={{
                    padding: '0.5rem 1.1rem', fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)', fontWeight: 700,
                    backgroundColor: '#f59e0b', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    fontFamily: 'var(--font-family)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d97706'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f59e0b'; }}
                >
                  <Trash2 size={14} />
                  {modal.confirmLabel ?? 'Retirer quand même'}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.35rem', fontSize: '0.875rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
