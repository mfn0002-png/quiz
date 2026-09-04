import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Moon, Clock, Sparkles, Menu, X, BookOpen, Target, BarChart2, Award } from 'lucide-react';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { User } from '../firebase';
import { LivesState } from '../services/livesService';
import { MAX_GLOBAL_LIVES } from '../constants';

interface HeaderProps {
  user: User | null;
  authLoading: boolean;
  livesState?: LivesState;
}

const NAV_LINKS = [
  { path: '/', label: 'Quiz', icon: Target },
  { path: '/learn', label: 'Apprendre', icon: BookOpen },
  { path: '/stats', label: 'Progression', icon: BarChart2 },
  { path: '/leaderboard', label: 'Classement', icon: Award },
];

export function Header({ user, authLoading, livesState }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLives = livesState?.lives ?? MAX_GLOBAL_LIVES;
  const isZeroLives = currentLives <= 0;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 900,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2rem',
        marginInline: '-1.5rem',
        paddingInline: '1.5rem',
        paddingBlock: '0.85rem',
        transition: 'all var(--transition-normal)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Noor <span style={{ color: 'var(--primary-light)' }}>Quiz</span>
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Savoir & Foi Islamique
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: 'var(--surface-color)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: 'var(--radius-full)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                  boxShadow: isActive ? '0 2px 10px rgba(5, 150, 105, 0.35)' : 'none',
                })}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Section: Lives + Theme + Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Lives Indicator Widget */}
          <div
            title={livesState && !livesState.isMaxLives ? `Recharge dans ${formatTimer(livesState.nextRechargeSeconds)}` : 'Vies au maximum'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isZeroLives ? 'rgba(239, 68, 68, 0.12)' : 'rgba(217, 119, 6, 0.12)',
              border: `1px solid ${isZeroLives ? 'rgba(239, 68, 68, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
            }}
          >
            <Moon
              size={18}
              fill={currentLives > 0 ? '#f59e0b' : 'transparent'}
              color={currentLives > 0 ? '#d97706' : '#ef4444'}
            />
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: currentLives > 0 ? 'var(--secondary-color)' : 'var(--error-color)' }}>
              {currentLives}/{MAX_GLOBAL_LIVES}
            </span>

            {livesState && !livesState.isMaxLives && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.2rem' }}>
                <Clock size={12} />
                <span>{formatTimer(livesState.nextRechargeSeconds)}</span>
              </div>
            )}
          </div>

          <ThemeToggle />
          <AuthButton user={user} authLoading={authLoading} />

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '0.5rem',
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          className="slide-up"
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--surface-color)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                })}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
