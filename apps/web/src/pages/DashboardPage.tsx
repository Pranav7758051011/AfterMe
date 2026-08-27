import React from 'react';
import { MemoryInput } from '../components/MemoryInput';
import { MemoryCard } from '../components/MemoryCard';
import { ProactiveAlertBanner } from '../components/ProactiveAlertBanner';
import { Memory, ProactiveAlert, AppStats } from '../types';
import { Search, ShieldCheck, Sparkles, Filter, Compass, Mic, MapPin } from 'lucide-react';

interface DashboardPageProps {
  memories: Memory[];
  alerts: ProactiveAlert[];
  stats: AppStats | null;
  currentLocation: string;
  userLatitude: number;
  userLongitude: number;
  activeFilter: 'all' | 'potentially_forgotten' | 'belonging' | 'task' | 'document' | 'event';
  setActiveFilter: (filter: 'all' | 'potentially_forgotten' | 'belonging' | 'task' | 'document' | 'event') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  prefilledMemoryText?: string;
  onSaveMemory: (text: string, options?: any) => Promise<any>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onDismissAlert: (id: string) => Promise<void>;
  onMarkRetrieved: (id: string, alertId?: string) => Promise<void>;
  onLocateOnMap: (loc: any) => void;
  onShareMemory: (mem: Memory) => void;
  onSeedGolden: () => void;
  onSimulateDeparture: (loc: string) => void;
  onOpenAsk: () => void;
  onNavigateToTab: (tab: 'dashboard' | 'map' | 'voice' | 'insights') => void;
  isLoading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  memories,
  alerts,
  stats,
  currentLocation,
  userLatitude,
  userLongitude,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  prefilledMemoryText,
  onSaveMemory,
  onStatusChange,
  onDeleteMemory,
  onDismissAlert,
  onMarkRetrieved,
  onLocateOnMap,
  onShareMemory,
  onSeedGolden,
  onSimulateDeparture,
  onOpenAsk,
  onNavigateToTab,
  isLoading,
}) => {
  const filteredMemories = memories.filter((m) => {
    if (activeFilter === 'potentially_forgotten') {
      if (m.status !== 'potentially_forgotten') return false;
    } else if (activeFilter !== 'all') {
      if (m.memory_type !== activeFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${m.original_text} ${m.object || ''} ${m.location || ''} ${m.task || ''} ${m.person || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    return true;
  });

  const forgottenCount = memories.filter((m) => m.status === 'potentially_forgotten').length;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Proactive Departure Alert Banner (Appears only when departure triggered) */}
      <ProactiveAlertBanner
        alerts={alerts}
        onDismiss={onDismissAlert}
        onMarkRetrieved={onMarkRetrieved}
      />

      {/* Top Hero Grid: Left Capture Box + Right AI Safety Widget */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
          alignItems: 'stretch',
        }}
      >
        {/* Left (Hero Capture Bar) */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <MemoryInput
            onSave={onSaveMemory}
            currentLocation={currentLocation}
            userLatitude={userLatitude}
            userLongitude={userLongitude}
            prefilledText={prefilledMemoryText}
          />
        </div>

        {/* Right (Compact AI Safety & Spatial Zone Card) */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Gauge Ring */}
          <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', position: 'absolute' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#4edea3"
                strokeWidth="8"
                strokeDasharray="264"
                strokeDashoffset="5.2"
                style={{ filter: 'drop-shadow(0 0 8px rgba(78,222,163,0.6))' }}
              />
            </svg>
            <div style={{ textAlign: 'center', zIndex: 10 }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 900, color: '#4edea3', fontFamily: 'Plus Jakarta Sans', lineHeight: 1 }}>
                98%
              </span>
              <span style={{ display: 'block', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                SAFETY
              </span>
            </div>
          </div>

          {/* Context & Actions */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4edea3' }} className="animate-pulse" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4edea3', fontFamily: 'JetBrains Mono', letterSpacing: '0.05em' }}>
                AI SURVEILLANCE ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} color="#c0c1ff" />
              <span>{currentLocation}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 10px' }}>
              {forgottenCount > 0 ? `⚠️ ${forgottenCount} item(s) flagged at risk.` : 'All recorded belongings secure.'}
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateToTab('map')}
                style={{ fontSize: '0.74rem', padding: '4px 10px', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#c0c1ff' }}
              >
                <Compass size={12} />
                <span>Radar Map</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateToTab('voice')}
                style={{ fontSize: '0.74rem', padding: '4px 10px', borderColor: 'rgba(78, 222, 163, 0.3)', color: '#4edea3' }}
              >
                <Mic size={12} />
                <span>Live Voice</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
          padding: '4px 0',
        }}
      >
        {/* Category Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <button
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.78rem' }}
          >
            All ({memories.length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'potentially_forgotten' ? 'active' : ''}`}
            onClick={() => setActiveFilter('potentially_forgotten')}
            style={{
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              ...(forgottenCount > 0 ? { color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.5)' } : {}),
            }}
          >
            ⚠️ Forgotten ({forgottenCount})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'belonging' ? 'active' : ''}`}
            onClick={() => setActiveFilter('belonging')}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.78rem' }}
          >
            🔌 Belongings ({memories.filter((m) => m.memory_type === 'belonging').length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'task' ? 'active' : ''}`}
            onClick={() => setActiveFilter('task')}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.78rem' }}
          >
            📝 Tasks ({memories.filter((m) => m.memory_type === 'task').length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'document' ? 'active' : ''}`}
            onClick={() => setActiveFilter('document')}
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '0.78rem' }}
          >
            📁 Documents ({memories.filter((m) => m.memory_type === 'document').length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-bar" style={{ minWidth: '240px', maxWidth: '320px', margin: 0 }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search memories or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '6px 8px' }}
          />
        </div>
      </div>

      {/* Memories Grid Stream */}
      {filteredMemories.length > 0 ? (
        <div className="memory-grid" style={{ gap: '16px' }}>
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onStatusChange={onStatusChange}
              onDelete={onDeleteMemory}
              onLocateOnMap={onLocateOnMap}
              onShare={onShareMemory}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '48px 24px', borderRadius: '20px' }}>
          <div className="empty-icon">🧠</div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No memories found
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {searchQuery
              ? `No memories matching "${searchQuery}".`
              : 'Speak or type what you left behind in the box above!'}
          </p>
        </div>
      )}
    </div>
  );
};
