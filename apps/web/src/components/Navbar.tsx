import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, MessageSquareQuote, Sparkles, RotateCcw, Play, User, 
  Flame, LogIn, ShieldCheck, Phone, Radio, Bell, BarChart3, Download,
  LayoutDashboard, Compass, Mic, ChevronDown, Check 
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

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  activeTab,
  onNavigateToTab,
  onOpenAsk,
  onOpenLiveCall,
  onOpenInsights,
  onOpenAuth,
  onSeedGolden,
  onSeedFull,
  onResetDemo,
  onInstallPWA,
  canInstallPWA,
  isLoading,
  userId,
}) => {
  const currentUser = auth.currentUser;
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPresetsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'rgba(18, 24, 38, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        margin: '0 0 20px 0',
        position: 'sticky',
        top: '12px',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Left: Brand Identity */}
      <div 
        onClick={() => onNavigateToTab('dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Brain size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            AfterMe
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4edea3' }} className="animate-pulse" />
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.02em', fontFamily: 'JetBrains Mono' }}>
            PROACTIVE SPATIAL AI
          </div>
        </div>
      </div>

      {/* Center: Segmented Navigation Pill */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '30px',
          padding: '4px',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => onNavigateToTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'dashboard' ? 700 : 500,
            background: activeTab === 'dashboard' ? 'rgba(128, 131, 255, 0.25)' : 'transparent',
            color: activeTab === 'dashboard' ? '#c0c1ff' : '#94a3b8',
            boxShadow: activeTab === 'dashboard' ? '0 0 12px rgba(192, 193, 255, 0.2)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('map')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'map' ? 700 : 500,
            background: activeTab === 'map' ? 'rgba(128, 131, 255, 0.25)' : 'transparent',
            color: activeTab === 'map' ? '#c0c1ff' : '#94a3b8',
            boxShadow: activeTab === 'map' ? '0 0 12px rgba(192, 193, 255, 0.2)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Compass size={15} />
          <span>Spatial Map</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('voice')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'voice' ? 700 : 500,
            background: activeTab === 'voice' ? 'rgba(128, 131, 255, 0.25)' : 'transparent',
            color: activeTab === 'voice' ? '#c0c1ff' : '#94a3b8',
            boxShadow: activeTab === 'voice' ? '0 0 12px rgba(192, 193, 255, 0.2)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Mic size={15} />
          <span>Live Voice</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('insights')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: activeTab === 'insights' ? 700 : 500,
            background: activeTab === 'insights' ? 'rgba(128, 131, 255, 0.25)' : 'transparent',
            color: activeTab === 'insights' ? '#c0c1ff' : '#94a3b8',
            boxShadow: activeTab === 'insights' ? '0 0 12px rgba(192, 193, 255, 0.2)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <BarChart3 size={15} />
          <span>Insights</span>
        </button>
      </nav>

      {/* Right: Actions & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* PWA Install Button (if available) */}
        {canInstallPWA && onInstallPWA && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onInstallPWA}
            title="Install App"
            style={{ padding: '6px 10px', fontSize: '0.76rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
          >
            <Download size={13} />
            <span>Install</span>
          </button>
        )}

        {/* Demo Presets Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
            style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px' }}
          >
            <Sparkles size={13} color="#fbbf24" />
            <span>Demo Presets</span>
            <ChevronDown size={12} />
          </button>

          {isPresetsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '210px',
                background: 'rgba(18, 24, 38, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                zIndex: 2000,
                animation: 'fadeIn 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsPresetsOpen(false);
                  onSeedGolden();
                }}
                disabled={isLoading}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.04)', padding: '8px 10px' }}
              >
                <Play size={14} color="#fbbf24" />
                <span style={{ fontSize: '0.8rem' }}>1-Click Golden Demo</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsPresetsOpen(false);
                  onSeedFull();
                }}
                disabled={isLoading}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.04)', padding: '8px 10px' }}
              >
                <Sparkles size={14} color="#38bdf8" />
                <span style={{ fontSize: '0.8rem' }}>Full Multimodal Set</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsPresetsOpen(false);
                  onResetDemo();
                }}
                disabled={isLoading}
                style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#f87171', padding: '8px 10px' }}
              >
                <RotateCcw size={14} />
                <span style={{ fontSize: '0.8rem' }}>Reset All Data</span>
              </button>
            </div>
          )}
        </div>

        {/* User Auth Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onOpenAuth}
          style={{
            padding: '6px 12px',
            fontSize: '0.78rem',
            borderColor: currentUser ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            background: currentUser ? 'rgba(16, 185, 129, 0.1)' : undefined,
          }}
        >
          {currentUser ? (
            <>
              <ShieldCheck size={13} color="#34d399" />
              <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#34d399', fontWeight: 600 }}>
                {currentUser.displayName?.split(' ')[0] || 'User'}
              </span>
            </>
          ) : (
            <>
              <LogIn size={13} color="#c0c1ff" />
              <span>Sign In</span>
            </>
          )}
        </button>

        {/* Ask AfterMe Hero Button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onOpenAsk}
          style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}
        >
          <MessageSquareQuote size={15} />
          <span>Ask AI</span>
        </button>
      </div>
    </header>
  );
};
