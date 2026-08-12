import { MessageCircle } from 'lucide-react';
import { Assistant } from './Assistant';

export function AssistantTab() {
  return (
    <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <MessageCircle size={22} color="var(--primary-color)" />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Assistant Islamique</h2>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Posez vos questions, les termes clés seront expliqués.</p>
        </div>
      </div>
      <Assistant />
    </div>
  );
}
