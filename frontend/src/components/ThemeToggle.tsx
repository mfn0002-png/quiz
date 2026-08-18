import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.45rem 0.85rem',
        borderRadius: '9999px',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
        backgroundColor: 'var(--surface-color, #1e293b)',
        color: 'var(--text-primary, #ffffff)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 200ms ease-in-out',
        fontFamily: 'var(--font-family)',
      }}
      title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
      aria-label="Basculer le thème"
    >
      {isDark ? (
        <>
          <Sun size={16} color="#fbbf24" style={{ transition: 'transform 300ms ease' }} />
          <span>Clair</span>
        </>
      ) : (
        <>
          <Moon size={16} color="#6366f1" style={{ transition: 'transform 300ms ease' }} />
          <span>Sombre</span>
        </>
      )}
    </button>
  );
}
