import { ActiveTab } from '../constants';

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'quiz', label: '🎯 Quiz' },
  { id: 'assistant', label: '💬 Assistant' },
  { id: 'stats', label: '📈 Progression' },
  { id: 'leaderboard', label: '🏆 Classement' },
];

interface TabNavProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

export function TabNav({ activeTab, onChange }: TabNavProps) {
  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-full)', padding: '0.35rem', boxShadow: 'var(--shadow-sm)' }}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)',
            backgroundColor: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
