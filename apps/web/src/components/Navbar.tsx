import React, { useState, useRef, useEffect } from 'react';
import {
  Brain, MessageSquareQuote, Sparkles, RotateCcw, Play,
  LogIn, ShieldCheck, BarChart3, Download,
  LayoutDashboard, Compass, Mic, ChevronDown, Zap, Search
} from 'lucide-react';
import { AppStats } from '../types';
import { auth } from '../services/firebase';
import { ActivePageTab } from './BottomNavBar';

interface NavbarProps {
  stats: AppStats | null;
  activeTab: ActivePageTab;
  onNavigateToTab: (tab: ActivePageTab) => void;
  onOpenAsk: () => void;
  onOpenLiveCall: () => void;
  onOpenInsights: () => void;
  onOpenAuth: () => void;
  onSeedGolden: () => void;
  onSeedFull: () => void;
  onResetDemo: () => void;
  onInstallPWA?: () => void;
  canInstallPWA?: boolean;
  isLoading: boolean;
  userId: string;
}

const NAV_ITEMS: { tab: ActivePageTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { tab: 'map',       label: 'Spatial Map', icon: <Compass size={14} /> },
  { tab: 'voice',     label: 'Live Voice', icon: <Mic size={14} /> },
  { tab: 'insights',  label: 'Insights', icon: <BarChart3 size={14} /> },
];

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  activeTab,
  onNavigateToTab,
  onOpenAsk,
  onOpenAuth,
  onSeedGolden,
  onSeedFull,
  onResetDemo,
  onInstallPWA,
  canInstallPWA,
  isLoading,
}) => {
  const currentUser = auth.currentUser;
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPresetsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <header className="navbar">
      {/* Brand */}
      <div
        className="navbar-brand"
        onClick={() => onNavigateToTab('dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onNavigateToTab('dashboard')}
      >
        <div className="navbar-logo">
          <Brain size={18} color="#ffffff" />
        </div>
        <div>
          <div className="navbar-wordmark">AfterMe</div>
          <div className="navbar-tagline">Proactive Spatial AI</div>
        </div>
      </div>

      {/* Center Nav Tabs */}
      <nav className="nav-tabs">
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button
            key={tab}
            type="button"
            className={`nav-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => onNavigateToTab(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="nav-actions">
        {/* Live Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'var(--success-subtle)',
            border: '1px solid var(--success-border)',
            borderRadius: 'var(--r-full)',
          }}
        >
          <div className="live-dot" />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--success-text)',
              letterSpacing: '0.06em',
            }}
          >
            LIVE
          </span>
        </div>

        {/* Ask AI Button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenAsk}
          id="ask-ai-btn"
        >
          <MessageSquareQuote size={14} />
          <span>Ask AI</span>
        </button>

        {/* Demo Presets */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            disabled={isLoading}
            id="demo-presets-btn"
          >
            <Zap size={13} color="var(--warning-text)" />
            <span>Demo</span>
            <ChevronDown
              size={12}
              style={{
                transform: isPresetsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 180ms ease',
              }}
            />
          </button>

          {isPresetsOpen && (
            <div className="dropdown-menu" style={{ minWidth: '200px' }}>
              <button
                className="dropdown-item"
                onClick={() => { setIsPresetsOpen(false); onSeedGolden(); }}
                disabled={isLoading}
              >
                <Play size={14} color="var(--warning-text)" />
                1-Click Golden Demo
              </button>
              <button
                className="dropdown-item"
                onClick={() => { setIsPresetsOpen(false); onSeedFull(); }}
                disabled={isLoading}
              >
                <Sparkles size={14} color="var(--info-text)" />
                Full Multimodal Set
              </button>
              <div className="dropdown-separator" />
              <button
                className="dropdown-item danger"
                onClick={() => { setIsPresetsOpen(false); onResetDemo(); }}
                disabled={isLoading}
              >
                <RotateCcw size={14} />
                Reset All Data
              </button>
            </div>
          )}
        </div>

        {/* Install PWA */}
        {canInstallPWA && onInstallPWA && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onInstallPWA}
            title="Install as App"
          >
            <Download size={13} />
          </button>
        )}

        {/* Auth */}
        <button
          type="button"
          className={`btn btn-sm ${currentUser ? 'btn-success' : 'btn-secondary'}`}
          onClick={onOpenAuth}
          id="auth-btn"
          style={{ gap: 6 }}
        >
          {currentUser ? (
            initials ? (
              <>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  {initials}
                </div>
                <span
                  style={{
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUser.displayName?.split(' ')[0] || 'User'}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck size={13} />
                <span>Signed In</span>
              </>
            )
          ) : (
            <>
              <LogIn size={13} />
              <span>Sign In</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
