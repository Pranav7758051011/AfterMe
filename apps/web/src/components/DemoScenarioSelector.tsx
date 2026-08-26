import React from 'react';
import { Play, Sparkles, CheckCircle2, Navigation, HelpCircle } from 'lucide-react';

interface DemoScenarioSelectorProps {
  onRunGoldenStep1: () => void;
  onRunGoldenStep2: () => void;
  onOpenAskWithQuery: (q: string) => void;
  isLoading: boolean;
}

export const DemoScenarioSelector: React.FC<DemoScenarioSelectorProps> = ({
  onRunGoldenStep1,
  onRunGoldenStep2,
  onOpenAskWithQuery,
  isLoading,
}) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.05))',
        border: '1px solid var(--border-glow)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e0e7ff' }}>
            ⚡ Hackathon Demo Guide & Quick Triggers
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Click steps sequentially to demonstrate the proactive AI pipeline
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              STEP 1 &bull; Create Memory
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Seeds: "I left my black laptop charger in the conference room."
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRunGoldenStep1}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            <Play size={12} />
            <span>1. Seed Charger Memory</span>
          </button>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f43f5e' }}>
              STEP 2 &bull; Proactive Departure
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Simulates leaving Conference Room &rarr; Triggers instant 🚨 alert
            </div>
          </div>
          <button
            className="btn btn-leave btn-sm"
            onClick={onRunGoldenStep2}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            <Navigation size={12} />
            <span>2. Simulate Leaving Room</span>
          </button>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              STEP 3 &bull; Grounded Retrieval
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Asks: "Where did I leave my charger?" with zero hallucinations
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenAskWithQuery('Where did I leave my charger?')}
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            <HelpCircle size={12} />
            <span>3. Ask "Where is my charger?"</span>
          </button>
        </div>
      </div>
    </div>
  );
};
