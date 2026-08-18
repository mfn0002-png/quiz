import { NavLink } from 'react-router-dom';

const TABS = [
  { path: '/', label: '🎯 Quiz' },
  { path: '/assistant', label: '💬 Assistant' },
  { path: '/stats', label: '📈 Progression' },
  { path: '/leaderboard', label: '🏆 Classement' },
];

export function TabNav() {
  return (
    <nav style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.6rem',
      marginBottom: '2.5rem',
      backgroundColor: 'var(--surface-color)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-xl)',
      padding: '0.55rem',
      boxShadow: 'var(--shadow-md)',
      transition: 'all var(--transition-normal)',
    }}>
      {TABS.map(tab => (
        <NavLink
          key={tab.path}
          to={tab.path}
          style={({ isActive }) => ({
            flex: '1 1 140px',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            fontWeight: 600,
            fontSize: '1rem',
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'all var(--transition-fast)',
            backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
            color: isActive ? 'white' : 'var(--text-secondary)',
            boxShadow: isActive ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none',
          })}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
