import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Target,
  BookOpen,
  BarChart2,
  Award,
  MessageCircle,
  Moon,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { User } from '../firebase';
import { LivesState } from '../services/livesService';
import { MAX_GLOBAL_LIVES } from '../constants';

interface SidebarProps {
  user: User | null;
  authLoading: boolean;
  livesState?: LivesState;
}

const NAV_LINKS = [
  { path: '/', label: 'Quiz', icon: Target, badge: 'Jouer' },
  { path: '/learn', label: 'Apprendre', icon: BookOpen, badge: 'Nouveau' },
  { path: '/stats', label: 'Progression', icon: BarChart2 },
  { path: '/leaderboard', label: 'Classement', icon: Award },
  { path: '/assistant', label: 'Assistant IA', icon: MessageCircle },
];

export function Sidebar({ user, authLoading, livesState }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLives = livesState?.lives ?? MAX_GLOBAL_LIVES;
  const isZeroLives = currentLives <= 0;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="mobile-header-bar">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Sparkles size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>
            Noor <span style={{ color: 'var(--primary-light)' }}>Quiz</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isZeroLives ? 'rgba(239, 68, 68, 0.12)' : 'rgba(217, 119, 6, 0.12)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <Moon size={15} fill={currentLives > 0 ? '#f59e0b' : 'transparent'} color={currentLives > 0 ? '#d97706' : '#ef4444'} />
            <span>{currentLives}/{MAX_GLOBAL_LIVES}</span>
          </div>

          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '0.4rem',
            }}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar (Desktop / Tablet / Mobile Drawer) */}
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Sidebar Header / Brand */}
        <div className="sidebar-brand-wrapper">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              textDecoration: 'none',
              color: 'inherit',
              overflow: 'hidden',
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
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
              }}
            >
              <Sparkles size={22} />
            </div>
            {!collapsed && (
              <div style={{ whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Noor <span style={{ color: 'var(--primary-light)' }}>Quiz</span>
                </span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Savoir & Foi Islamique
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-collapse-btn"
            title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Lives & Moon Counter Status Card */}
        {!collapsed && (
          <div
            style={{
              margin: '1.25rem 1rem 0.5rem 1rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isZeroLives ? 'rgba(239, 68, 68, 0.08)' : 'rgba(217, 119, 6, 0.08)',
              border: `1px solid ${isZeroLives ? 'rgba(239, 68, 68, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary-color)' }}>
                🌙 Vies disponibles
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isZeroLives ? 'var(--error-color)' : 'var(--text-primary)' }}>
                {currentLives}/{MAX_GLOBAL_LIVES}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem' }}>
              {Array.from({ length: MAX_GLOBAL_LIVES }).map((_, idx) => {
                const isActive = idx < currentLives;
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isActive ? 'var(--secondary-color)' : 'rgba(148, 163, 184, 0.25)',
                    }}
                  />
                );
              })}
            </div>

            {livesState && !livesState.isMaxLives && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <Clock size={12} />
                <span>+1 vie dans <strong>{formatTimer(livesState.nextRechargeSeconds)}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Links */}
        <nav className="sidebar-nav-list custom-scrollbar">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? link.label : undefined}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} className="nav-icon" />
                {!collapsed && <span className="nav-label">{link.label}</span>}
                {!collapsed && link.badge && (
                  <span className="nav-badge">{link.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Theme + Auth Profile */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '0.5rem', width: '100%', marginBottom: collapsed ? '0' : '0.75rem' }}>
            <ThemeToggle />
            {!collapsed && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thème</span>
            )}
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <AuthButton user={user} authLoading={authLoading} />
          </div>
        </div>
      </aside>
    </>
  );
}
