import React, { useState } from 'react';
import { Play, Sparkles, CheckCircle2, Navigation, HelpCircle, GraduationCap, Trophy } from 'lucide-react';
import { VivaDemoGuideModal } from './VivaDemoGuideModal';
import { JudgeLiveModal } from './JudgeLiveModal';
import { alertSound } from '../services/alertSound';

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
  const [isVivaGuideOpen, setIsVivaGuideOpen] = useState(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);

  const handleStep1 = () => {
    alertSound.playSuccessPing();
    onRunGoldenStep1();
  };

  const handleStep2 = () => {
    alertSound.playDepartureAlarm();
    onRunGoldenStep2();
  };

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.05))',
          border: '1px solid var(--border-glow)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e0e7ff' }}>
              ⚡ 1-Click Golden Demo & Viva Triggers
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsJudgeModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.15))',
                borderColor: 'var(--accent)',
                color: '#e0e7ff',
                fontWeight: 700,
              }}
            >
              <Trophy size={14} color="var(--warning-text)" />
              <span>Judges Hub & Live QR</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsVivaGuideOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '4px 10px' }}
            >
              <GraduationCap size={14} color="var(--accent)" />
              <span>Viva & Architecture Guide</span>
            </button>
          </div>
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
              onClick={handleStep1}
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
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger-text)' }}>
                STEP 2 &bull; Simulate Departure
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Moves location to Office Desk &rarr; Triggers Geofence Departure Alert + Sound
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleStep2}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              <Navigation size={12} />
              <span>2. Leave Room (Fire Alert)</span>
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
                Asks: "Where did I leave my charger?" with grounded citation retrieval
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

      <VivaDemoGuideModal
        isOpen={isVivaGuideOpen}
        onClose={() => setIsVivaGuideOpen(false)}
      />

      <JudgeLiveModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
      />
    </>
  );
};
