import React from 'react';
import { MemoryInput } from '../components/MemoryInput';
import { MemoryCard } from '../components/MemoryCard';
import { ProactiveAlertBanner } from '../components/ProactiveAlertBanner';
import { Memory, ProactiveAlert, AppStats } from '../types';
import {
  Search, Package, AlertTriangle, CheckSquare, FileText, Layers,
  Compass, Mic, Brain, TrendingUp, Shield
} from 'lucide-react';

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

  const forgottenCount  = memories.filter(m => m.status === 'potentially_forgotten').length;
  const belongingCount  = memories.filter(m => m.memory_type === 'belonging').length;
  const taskCount       = memories.filter(m => m.memory_type === 'task').length;
  const documentCount   = memories.filter(m => m.memory_type === 'document').length;
  const safetyScore     = memories.length > 0
    ? Math.round(((memories.length - forgottenCount) / memories.length) * 100)
    : 100;

  const FILTERS: { key: string; label: string; count: number; icon: React.ReactNode; variant?: string }[] = [
    { key: 'all',                  label: 'All',        count: memories.length,  icon: <Layers size={12} /> },
    { key: 'potentially_forgotten', label: 'At Risk',   count: forgottenCount,   icon: <AlertTriangle size={12} />, variant: 'warning' },
    { key: 'belonging',            label: 'Belongings', count: belongingCount,   icon: <Package size={12} /> },
    { key: 'task',                 label: 'Tasks',      count: taskCount,        icon: <CheckSquare size={12} /> },
    { key: 'document',             label: 'Documents',  count: documentCount,    icon: <FileText size={12} /> },
  ];

  return (
    <div style={{ animation: 'fadeUp 0.3s var(--ease-out)' }}>
      {/* Proactive Alert Toasts */}
      <ProactiveAlertBanner
        alerts={alerts}
        onDismiss={onDismissAlert}
        onMarkRetrieved={onMarkRetrieved}
      />

      {/* ── KPI Strip ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'linear-gradient(90deg, var(--accent), var(--info))' }} />
          <div className="kpi-label">
            <Brain size={12} />
            Total Memories
          </div>
          <div className="kpi-value">{stats?.total_memories ?? memories.length}</div>
          <div className="kpi-subtitle">Across all categories</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'linear-gradient(90deg, var(--success), #059669)' }} />
          <div className="kpi-label">
            <Shield size={12} />
            Safety Score
          </div>
          <div className="kpi-value" style={{ color: safetyScore >= 90 ? 'var(--success-text)' : safetyScore >= 70 ? 'var(--warning-text)' : 'var(--danger-text)' }}>
            {safetyScore}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>%</span>
          </div>
          <div className="kpi-subtitle">Belongings secured</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: forgottenCount > 0 ? 'linear-gradient(90deg, var(--warning), var(--danger))' : 'linear-gradient(90deg, var(--success), var(--info))' }} />
          <div className="kpi-label">
            <AlertTriangle size={12} />
            At Risk
          </div>
          <div className="kpi-value" style={{ color: forgottenCount > 0 ? 'var(--warning-text)' : 'var(--success-text)' }}>
            {forgottenCount}
          </div>
          <div className="kpi-subtitle">{forgottenCount > 0 ? 'Items potentially left behind' : 'All items accounted for'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'linear-gradient(90deg, var(--info), var(--accent))' }} />
          <div className="kpi-label">
            <TrendingUp size={12} />
            Active Tasks
          </div>
          <div className="kpi-value">{stats?.pending_tasks ?? taskCount}</div>
          <div className="kpi-subtitle">Pending completion</div>
        </div>
      </div>

      {/* ── Top Capture + Safety Widget ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 'var(--sp-5)',
          marginBottom: 'var(--sp-6)',
          alignItems: 'start',
        }}
      >
        <MemoryInput
          onSave={onSaveMemory}
          currentLocation={currentLocation}
          userLatitude={userLatitude}
          userLongitude={userLongitude}
          prefilledText={prefilledMemoryText}
        />

        {/* Safety + Location Widget */}
        <div className="safety-widget">
          {/* Ring Gauge */}
          <div className="safety-ring">
            <svg
              style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-subtle)" strokeWidth="7" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={safetyScore >= 90 ? '#34d399' : safetyScore >= 70 ? '#fbbf24' : '#f87171'}
                strokeWidth="7"
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * safetyScore) / 100}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${safetyScore >= 90 ? 'rgba(52,211,153,0.5)' : 'rgba(251,191,36,0.5)'})` }}
              />
            </svg>
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.04em', color: safetyScore >= 90 ? 'var(--success-text)' : 'var(--warning-text)', lineHeight: 1 }}>
                {safetyScore}%
              </span>
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginTop: 2 }}>
                SAFE
              </span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div className="live-dot" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--success-text)', letterSpacing: '0.08em' }}>
                AI ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.8rem' }}>📍</span>
              <span className="truncate">{currentLocation}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 'var(--sp-3)' }}>
              {forgottenCount > 0 ? `⚠ ${forgottenCount} item(s) flagged at risk` : 'All belongings secure'}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigateToTab('map')} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                <Compass size={12} />
                Map
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigateToTab('voice')} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                <Mic size={12} />
                Voice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Strip + Search ── */}
      <div className="filter-strip">
        <div className="filter-tabs">
          {FILTERS.map(({ key, label, count, icon, variant }) => (
            <button
              key={key}
              type="button"
              className={`filter-tab${activeFilter === key ? ` active${variant ? ` ${variant}` : ''}` : ''}`}
              onClick={() => setActiveFilter(key as any)}
            >
              {icon}
              <span>{label}</span>
              <span className="filter-count">{count}</span>
            </button>
          ))}
        </div>

        <div className="search-bar">
          <Search size={14} color="var(--text-tertiary)" />
          <input
            type="text"
            className="search-input"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Memory Grid ── */}
      {filteredMemories.length > 0 ? (
        <div className="memory-grid">
          {filteredMemories.map(memory => (
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
          <span className="empty-state-icon">🧠</span>
          <p className="empty-state-title">No memories found</p>
          <p className="empty-state-body">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different term.`
              : 'Speak or type what you left behind in the capture box above.'}
          </p>
        </div>
      )}
    </div>
  );
};
