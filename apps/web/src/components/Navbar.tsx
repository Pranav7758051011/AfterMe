import React from 'react';
import { Brain, MessageSquareQuote, Sparkles, RotateCcw, Play, User, Flame } from 'lucide-react';
import { AppStats } from '../types';
import { getApiUserId } from '../services/api';

interface NavbarProps {
  stats: AppStats | null;
  onOpenAsk: () => void;
  onOpenAuth: () => void;
  onSeedGolden: () => void;
  onSeedFull: () => void;
  onResetDemo: () => void;
  isLoading: boolean;
  userId: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  onOpenAsk,
  onOpenAuth,
  onSeedGolden,
  onSeedFull,
  onResetDemo,
  isLoading,
  userId,
}) => {
  return (
    <header className="navbar">
      <div className="logo-container">
        <div className="logo-badge">
          <Brain size={24} color="#ffffff" />
        </div>
        <div>
          <div className="logo-text">AfterMe</div>
          <div className="logo-tagline">Proactive AI Memory &bull; Firebase Powered</div>
        </div>
      </div>

      <div className="nav-actions">
        {/* Firebase Connected Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            color: '#fbbf24',
            fontWeight: 600,
          }}
          title="Backend backed by Cloud Firestore & Firebase Auth"
        >
          <Flame size={13} color="#f59e0b" />
          <span>Firestore Ready</span>
        </div>

        {/* User Identity Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenAuth}
          title="Switch Firebase User Identity"
          style={{ padding: '6px 12px' }}
        >
          <User size={13} color="var(--accent-cyan)" />
          <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userId}
          </span>
        </button>

        {/* Quick Judge Demo Presets */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onSeedGolden}
          disabled={isLoading}
          title="Setup 1-Click Golden Demo Scenario in Firestore"
        >
          <Play size={14} className="text-amber-400" />
          <span>Golden Demo</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onSeedFull}
          disabled={isLoading}
          title="Seed Rich Multimodal Scenarios"
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span>Full Scenarios</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onResetDemo}
          disabled={isLoading}
          title="Clear all data for clean reset"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        {/* Ask AfterMe Button */}
        <button className="btn btn-primary" onClick={onOpenAsk}>
          <MessageSquareQuote size={18} />
          <span>Ask AfterMe</span>
        </button>
      </div>
    </header>
  );
};
