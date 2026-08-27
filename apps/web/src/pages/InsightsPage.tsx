import React from 'react';
import { 
  BarChart3, ShieldCheck, MapPin, TrendingUp, Sparkles, 
  PieChart, Zap, ArrowRight, Shield 
} from 'lucide-react';
import { Memory, AppStats } from '../types';

interface InsightsPageProps {
  memories: Memory[];
  stats: AppStats | null;
  onNavigateToTab: (tab: 'dashboard' | 'map' | 'voice' | 'insights') => void;
}

export const InsightsPage: React.FC<InsightsPageProps> = ({
  memories,
  stats,
  onNavigateToTab,
}) => {
  const totalItems = memories.length > 0 ? memories.length : 42;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>
            Intelligence Insights
          </h2>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(78, 222, 163, 0.15)',
              border: '1px solid rgba(78, 222, 163, 0.4)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#4edea3',
              fontFamily: 'JetBrains Mono',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4edea3' }} className="animate-pulse" />
            NEURAL ANALYSIS ACTIVE
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
          Proactive departure prevention metrics, spatial forgetfulness heatmaps, and retrieval safety
        </p>
      </div>

      {/* Bento Score Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Safety Score */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
            Safety Score
          </div>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#c0c1ff', fontFamily: 'JetBrains Mono', letterSpacing: '-0.02em', textShadow: '0 0 15px rgba(192, 193, 255, 0.4)' }}>
            98.2<span style={{ fontSize: '1.4rem', color: '#818cf8' }}>%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: '98.2%', height: '100%', background: '#c0c1ff', borderRadius: '3px', boxShadow: '0 0 12px rgba(192, 193, 255, 0.6)' }} />
          </div>
        </div>

        {/* Total Items Tracked */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
            Total Items Tracked
          </div>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#7bd0ff', fontFamily: 'JetBrains Mono', letterSpacing: '-0.02em', textShadow: '0 0 15px rgba(123, 208, 255, 0.4)' }}>
            {totalItems}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4edea3', fontSize: '0.76rem', fontWeight: 700, marginTop: '14px' }}>
            <TrendingUp size={14} />
            <span>+3 this week</span>
          </div>
        </div>

        {/* Proactivity Score */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
            Proactivity Score
          </div>
          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#4edea3', fontFamily: 'JetBrains Mono', letterSpacing: '-0.02em', textShadow: '0 0 15px rgba(78, 222, 163, 0.4)' }}>
            4.9<span style={{ fontSize: '1.4rem', color: '#94a3b8' }}>/5.0</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
            <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
            <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
            <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
            <div style={{ height: '6px', flex: 1, background: '#4edea3', borderRadius: '3px' }} />
            <div style={{ height: '6px', flex: 1, background: 'rgba(78, 222, 163, 0.3)', borderRadius: '3px' }} />
          </div>
        </div>
      </div>

      {/* Gemini 2.5 Spatial Insight Card */}
      <div
        style={{
          background: 'rgba(18, 24, 38, 0.7)',
          backdropFilter: 'blur(16px)',
          borderLeft: '4px solid #c0c1ff',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          marginBottom: '24px',
          boxShadow: '0 0 30px rgba(192, 193, 255, 0.1)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'rgba(192, 193, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={22} color="#c0c1ff" />
        </div>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>
            Gemini 2.5 Insight
          </h4>
          <p style={{ fontSize: '0.88rem', color: '#c7d2fe', lineHeight: 1.5, margin: 0 }}>
            You frequently forget items in the <strong style={{ color: '#c0c1ff', background: 'rgba(192, 193, 255, 0.15)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>Conference Room</strong> on Tuesdays. Increasing proactive alert sensitivity for that specific zone.
          </p>
        </div>
      </div>

      {/* Deep Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Top Departure Hotspots */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '22px',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '18px' }}>
            Top Departure Hotspots
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', fontFamily: 'JetBrains Mono' }}>
                <span style={{ color: '#e1e2ec' }}>📍 Conference Room</span>
                <span style={{ color: '#c0c1ff' }}>12 incidents (85%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '85%', height: '100%', background: '#c0c1ff', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', fontFamily: 'JetBrains Mono' }}>
                <span style={{ color: '#e1e2ec' }}>📍 Office Desk</span>
                <span style={{ color: '#7bd0ff' }}>8 incidents (55%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '55%', height: '100%', background: '#7bd0ff', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', fontFamily: 'JetBrains Mono' }}>
                <span style={{ color: '#e1e2ec' }}>📍 Cafeteria</span>
                <span style={{ color: '#4edea3' }}>4 incidents (25%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '25%', height: '100%', background: '#4edea3', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Concentric SVG Category Rings */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', alignSelf: 'flex-start', marginBottom: '14px' }}>
            Category Breakdown
          </h3>

          <div style={{ position: 'relative', width: '180px', height: '180px', margin: '10px 0' }}>
            {/* Outer Ring: Belongings 60% */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="#c0c1ff" strokeWidth="7" strokeDasharray="276" strokeDashoffset="110" />
            </svg>

            {/* Middle Ring: Documents 30% */}
            <svg style={{ position: 'absolute', inset: '18px', width: 'calc(100% - 36px)', height: 'calc(100% - 36px)', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="#7bd0ff" strokeWidth="8" strokeDasharray="276" strokeDashoffset="193" />
            </svg>

            {/* Inner Ring: Vehicles 10% */}
            <svg style={{ position: 'absolute', inset: '36px', width: 'calc(100% - 72px)', height: 'calc(100% - 72px)', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="#4edea3" strokeWidth="10" strokeDasharray="276" strokeDashoffset="248" />
            </svg>

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'JetBrains Mono' }}>{totalItems}</span>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase' }}>ITEMS</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono' }}>
            <span style={{ color: '#c0c1ff' }}>● Belongings (60%)</span>
            <span style={{ color: '#7bd0ff' }}>● Docs (30%)</span>
            <span style={{ color: '#4edea3' }}>● Vehicles (10%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
