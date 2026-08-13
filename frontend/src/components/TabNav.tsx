import { NavLink } from 'react-router-dom';

const TABS = [
  { path: '/', label: '🎯 Quiz' },
  { path: '/assistant', label: '💬 Assistant' },
  { path: '/stats', label: '📈 Progression' },
  { path: '/leaderboard', label: '🏆 Classement' },
];

export function TabNav() {
  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-full)', padding: '0.35rem', boxShadow: 'var(--shadow-sm)' }}>
      {TABS.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          style={({ isActive }) => ({
            flex: 1,
            minWidth: '120px',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            fontWeight: 600,
            fontSize: '0.95rem',
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'all var(--transition-fast)',
            backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
            color: isActive ? 'white' : 'var(--text-secondary)',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
