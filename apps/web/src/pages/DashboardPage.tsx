import React from 'react';
import { MemoryInput } from '../components/MemoryInput';
import { MemoryCard } from '../components/MemoryCard';
import { ProactiveAlertBanner } from '../components/ProactiveAlertBanner';
import { DemoScenarioSelector } from '../components/DemoScenarioSelector';
import { Memory, ProactiveAlert, AppStats } from '../types';
import { Search, ShieldCheck, Sparkles, Filter } from 'lucide-react';

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

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Demo Scenario Guide */}
      <DemoScenarioSelector
        onRunGoldenStep1={onSeedGolden}
        onRunGoldenStep2={() => onSimulateDeparture('Office Desk')}
        onOpenAskWithQuery={() => onOpenAsk()}
        isLoading={isLoading}
      />

      {/* Proactive Departure Alert Banner */}
      <ProactiveAlertBanner
        alerts={alerts}
        onDismiss={onDismissAlert}
        onMarkRetrieved={onMarkRetrieved}
      />

      {/* Stitch AI Proactive Status Gauge & Live Safety Banner */}
      <div
        style={{
          background: 'rgba(18, 24, 38, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginBottom: '24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ position: 'relative', display: 'flex', width: '10px', height: '10px' }}>
            <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#4edea3', opacity: 0.75 }} className="animate-ping" />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4edea3' }} />
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#4edea3', fontFamily: 'JetBrains Mono' }}>
            AI ACTIVE
          </span>
        </div>

        {/* Decorative SVG Gauge Ring */}
        <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', position: 'absolute' }} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#4edea3"
              strokeWidth="7"
              strokeDasharray="276"
              strokeDashoffset="5.5"
              style={{ filter: 'drop-shadow(0 0 8px rgba(78,222,163,0.6))' }}
            />
          </svg>
          <div style={{ textAlign: 'center', zIndex: 10 }}>
            <span style={{ display: 'block', fontSize: '2.4rem', fontWeight: 800, color: '#4edea3', fontFamily: 'Plus Jakarta Sans', letterSpacing: '-0.02em' }}>
              98%
            </span>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              RETRIEVAL SAFETY
            </span>
          </div>
        </div>

        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.84rem', color: '#cbd5e1', margin: '0 0 8px' }}>
            📍 Monitoring current zone: <strong style={{ color: '#c0c1ff' }}>{currentLocation}</strong>
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('map')}
            style={{ fontSize: '0.78rem', padding: '4px 12px', borderColor: 'rgba(99, 102, 241, 0.4)', color: '#c0c1ff' }}
          >
            🗺️ View Full Spatial Radar Map &rarr;
          </button>
        </div>
      </div>

      {/* Multimodal Memory Capture Input */}
      <MemoryInput
        onSave={onSaveMemory}
        currentLocation={currentLocation}
        userLatitude={userLatitude}
        userLongitude={userLongitude}
        prefilledText={prefilledMemoryText}
      />

      {/* Memory Stream Header & Filter Tabs */}
      <div className="stream-header" style={{ marginTop: '24px' }}>
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Memories ({memories.length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'potentially_forgotten' ? 'active' : ''}`}
            onClick={() => setActiveFilter('potentially_forgotten')}
            style={memories.some((m) => m.status === 'potentially_forgotten') ? { color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.5)' } : {}}
          >
            ⚠️ Potentially Forgotten ({memories.filter((m) => m.status === 'potentially_forgotten').length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'belonging' ? 'active' : ''}`}
            onClick={() => setActiveFilter('belonging')}
          >
            🔌 Belongings ({memories.filter((m) => m.memory_type === 'belonging').length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'task' ? 'active' : ''}`}
            onClick={() => setActiveFilter('task')}
          >
            📝 Tasks ({memories.filter((m) => m.memory_type === 'task').length})
          </button>
          <button
            className={`filter-tab ${activeFilter === 'document' ? 'active' : ''}`}
            onClick={() => setActiveFilter('document')}
          >
            📁 Documents ({memories.filter((m) => m.memory_type === 'document').length})
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="search-bar">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search memories, places, or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Memories Grid Stream */}
      {filteredMemories.length > 0 ? (
        <div className="memory-grid">
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
        <div className="empty-state">
          <div className="empty-icon">🧠</div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No memories found
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {searchQuery
              ? `No memories matching "${searchQuery}".`
              : 'Tell AfterMe anything you want to remember above!'}
          </p>
        </div>
      )}
    </div>
  );
};
