import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/theme-context';

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 0 : '0.4rem',
        width: compact ? '38px' : 'auto',
        height: compact ? '38px' : 'auto',
        padding: compact ? 0 : '0.45rem 0.85rem',
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
        flexShrink: 0,
      }}
      title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
      aria-label="Basculer le thème"
    >
      {isDark ? (
        <>
          <Sun size={17} color="#fbbf24" style={{ transition: 'transform 300ms ease' }} />
          {!compact && <span>Clair</span>}
        </>
      ) : (
        <>
          <Moon size={17} color="#6366f1" style={{ transition: 'transform 300ms ease' }} />
          {!compact && <span>Sombre</span>}
        </>
      )}
    </button>
  );
}
