import { MessageCircle } from 'lucide-react';
import { Assistant } from './Assistant';

export function AssistantTab() {
  return (
    <div
      className="glass-panel slide-up"
      style={{
        overflow: 'hidden',
        padding: 0,
        width: '100%',
        height: 'calc(100vh - 4.5rem)',
        minHeight: '550px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          backgroundColor: 'var(--surface-color-subtle)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-color)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageCircle size={22} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Assistant Islamique</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Posez toutes vos questions sur la foi, le Coran et les pratiques. Les termes clés seront expliqués.
          </p>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Assistant isCompact={false} />
      </div>
    </div>
  );
}
