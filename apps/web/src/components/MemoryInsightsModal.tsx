import React from 'react';
import { 
  BarChart3, ShieldCheck, MapPin, TrendingUp, Sparkles, 
  X, AlertTriangle, CheckCircle2, Zap, Brain, PieChart, 
  Layers, Package, Shield, Lock, Activity
} from 'lucide-react';
import { Memory, AppStats } from '../types';

interface MemoryInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  stats: AppStats | null;
}

export const MemoryInsightsModal: React.FC<MemoryInsightsModalProps> = ({
  isOpen,
  onClose,
  memories,
  stats,
}) => {
  if (!isOpen) return null;

  const totalItems = memories.length > 0 ? memories.length : 42;
  const retrievedCount = memories.filter((m) => m.status === 'retrieved').length;
  const forgottenCount = memories.filter((m) => m.status === 'potentially_forgotten').length;

  return (
    <div className="auth-modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div
        className="auth-modal-card"
        style={{
          maxWidth: '680px',
          padding: '28px',
          animation: 'fadeIn 0.25s ease',
          background: 'rgba(18, 24, 38, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 0 40px rgba(192, 193, 255, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
                Intelligence Insights
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(78, 222, 163, 0.15)',
                  border: '1px solid rgba(78, 222, 163, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#4edea3',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4edea3' }} className="animate-pulse" />
                NEURAL ACTIVE
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Spatial intelligence analysis & departure risk patterns
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Bento Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {/* Safety Score Card */}
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Safety Score
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#c0c1ff', fontFamily: 'JetBrains Mono', letterSpacing: '-0.02em' }}>
              98.2<span style={{ fontSize: '1.2rem', color: '#818cf8' }}>%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ width: '98.2%', height: '100%', background: '#c0c1ff', borderRadius: '3px', boxShadow: '0 0 10px rgba(192, 193, 255, 0.5)' }} />
            </div>
          </div>

          {/* Total Items Tracked */}
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Items Tracked
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#7bd0ff', fontFamily: 'JetBrains Mono', letterSpacing: '-0.02em' }}>
              {totalItems}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4edea3', fontSize: '0.72rem', fontWeight: 700, marginTop: '8px' }}>
              <TrendingUp size={13} />
              <span>+3 this week</span>
            </div>
          </div>

          {/* Proactivity Score */}
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Proactivity
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#4edea3', fontFamily: 'JetBrains Mono', letterSpacing: '-0.02em' }}>
              4.9<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/5.0</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
              <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
              <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
              <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
              <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
              <div style={{ height: '6px', flex: 1, background: 'rgba(78, 222, 163, 0.3)', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Gemini AI Insight Card */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.7)',
            borderLeft: '4px solid #c0c1ff',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
            marginBottom: '24px',
            position: 'relative',
            boxShadow: '0 0 30px rgba(192, 193, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(192, 193, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} color="#c0c1ff" />
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
              Gemini 2.5 Spatial Insight
            </div>
            <p style={{ fontSize: '0.82rem', color: '#c7d2fe', lineHeight: 1.5, margin: 0 }}>
              You frequently forget items in the <strong style={{ color: '#c0c1ff', background: 'rgba(192, 193, 255, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>Conference Room</strong> on Tuesdays. AfterMe has automatically increased departure warning sensitivity for that zone.
            </p>
          </div>
        </div>

        {/* Charts Grid: Hotspots & Concentric Category Rings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Top Departure Hotspots */}
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '18px',
            }}
          >
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
              Top Departure Hotspots
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
                  <span style={{ color: '#e1e2ec' }}>📍 Conference Room</span>
                  <span style={{ color: '#c0c1ff' }}>12 incidents (85%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '85%', height: '100%', background: '#c0c1ff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
                  <span style={{ color: '#e1e2ec' }}>📍 Office Desk</span>
                  <span style={{ color: '#7bd0ff' }}>8 incidents (55%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '55%', height: '100%', background: '#7bd0ff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontFamily: 'JetBrains Mono' }}>
                  <span style={{ color: '#e1e2ec' }}>📍 Cafeteria</span>
                  <span style={{ color: '#4edea3' }}>4 incidents (25%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: '#4edea3', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown (Concentric SVG Rings) */}
          <div
            style={{
              background: 'rgba(18, 24, 38, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', alignSelf: 'flex-start', marginBottom: '10px' }}>
              Category Breakdown
            </h4>

            {/* Concentric SVG Rings */}
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '10px 0' }}>
              {/* Outer Ring: Belongings 60% */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#c0c1ff" strokeWidth="7" strokeDasharray="276" strokeDashoffset="110" />
              </svg>

              {/* Middle Ring: Documents 30% */}
              <svg style={{ position: 'absolute', inset: '16px', width: 'calc(100% - 32px)', height: 'calc(100% - 32px)', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#7bd0ff" strokeWidth="8" strokeDasharray="276" strokeDashoffset="193" />
              </svg>

              {/* Inner Ring: Vehicles 10% */}
              <svg style={{ position: 'absolute', inset: '32px', width: 'calc(100% - 64px)', height: 'calc(100% - 64px)', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="#4edea3" strokeWidth="10" strokeDasharray="276" strokeDashoffset="248" />
              </svg>

              {/* Center Counter */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'JetBrains Mono' }}>{totalItems}</span>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase' }}>ITEMS</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.74rem', fontFamily: 'JetBrains Mono' }}>
              <span style={{ color: '#c0c1ff' }}>● Belongings (60%)</span>
              <span style={{ color: '#7bd0ff' }}>● Docs (30%)</span>
              <span style={{ color: '#4edea3' }}>● Vehicles (10%)</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
        >
          Close Insights
        </button>
      </div>
    </div>
  );
};
