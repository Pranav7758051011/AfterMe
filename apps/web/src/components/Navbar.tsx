import React from 'react';
import { 
  Brain, MessageSquareQuote, Sparkles, RotateCcw, Play, User, 
  Flame, LogIn, ShieldCheck, Phone, Radio, Bell, BarChart3, Download 
} from 'lucide-react';
import { AppStats } from '../types';
import { auth } from '../services/firebase';

interface NavbarProps {
  stats: AppStats | null;
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
          title="Connected to Firebase: afterme-ai-app"
        >
          <Flame size={13} color="#f59e0b" />
          <span>Firestore & Auth Active</span>
        </div>

        {/* Prominent Firebase Authenticator Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenAuth}
          title="Open Firebase Authentication (Email/Password & Google Sign-In)"
          style={{
            padding: '6px 12px',
            borderColor: currentUser ? '#10b981' : 'rgba(99, 102, 241, 0.4)',
            background: currentUser ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
          }}
        >
          {currentUser ? (
            <>
              <ShieldCheck size={14} color="#34d399" />
              <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', color: '#34d399', fontWeight: 700 }}>
                {currentUser.displayName || currentUser.email || userId}
              </span>
            </>
          ) : (
            <>
              <LogIn size={14} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>🔐 Firebase Sign In</span>
            </>
          )}
        </button>

        {/* AI Memory Spatial Insights Analytics */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenInsights}
          title="View AI Spatial Memory Intelligence & Safety Analytics"
          style={{
            borderColor: 'rgba(99, 102, 241, 0.4)',
            color: '#c7d2fe',
            fontWeight: 600,
          }}
        >
          <BarChart3 size={14} color="#818cf8" />
          <span>📊 Insights</span>
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

        {/* PWA Install Button */}
        {canInstallPWA && onInstallPWA && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onInstallPWA}
            title="Install AfterMe as standalone Desktop / Mobile app"
            style={{
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontWeight: 700,
            }}
          >
            <Download size={14} color="#38bdf8" />
            <span>📲 Install App</span>
          </button>
        )}

        {/* Gemini 2.0 Live Bidirectional Call Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenLiveCall}
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            borderColor: '#34d399',
            color: '#ffffff',
            fontWeight: 700,
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
          }}
          title="Start Live Bidirectional Voice Call with Gemini 2.5"
        >
          <Phone size={14} color="#ffffff" />
          <span>📞 Live Voice Call</span>
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
