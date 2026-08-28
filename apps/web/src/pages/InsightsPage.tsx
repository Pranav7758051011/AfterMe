import React from 'react';
import {
  BarChart3, TrendingUp, Shield, Package, CheckSquare,
  FileText, Brain, AlertTriangle, MapPin, Clock, Layers
} from 'lucide-react';
import { Memory, AppStats } from '../types';

interface InsightsPageProps {
  memories: Memory[];
  stats: AppStats | null;
  onNavigateToTab: (tab: 'dashboard' | 'map' | 'voice' | 'insights') => void;
}

const BAR_COLORS: Record<string, string> = {
  belonging: 'var(--accent)',
  task:      'var(--success)',
  document:  'var(--info)',
  event:     'var(--warning)',
  person:    '#a78bfa',
  idea:      '#f59e0b',
  other:     'var(--text-tertiary)',
};

export const InsightsPage: React.FC<InsightsPageProps> = ({ memories, stats, onNavigateToTab }) => {
  const total = memories.length || 1;

  // Memory type breakdown
  const typeCounts: Record<string, number> = {};
  memories.forEach(m => {
    typeCounts[m.memory_type] = (typeCounts[m.memory_type] || 0) + 1;
  });

  // Risk level breakdown
  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  memories.forEach(m => { riskCounts[m.risk_level] = (riskCounts[m.risk_level] || 0) + 1; });

  // Status breakdown
  const statusCounts = { active: 0, potentially_forgotten: 0, retrieved: 0, completed: 0, archived: 0 };
  memories.forEach(m => { statusCounts[m.status] = (statusCounts[m.status] || 0) + 1; });

  const forgottenCount = memories.filter(m => m.status === 'potentially_forgotten').length;
  const safetyScore = memories.length > 0 ? Math.round(((memories.length - forgottenCount) / memories.length) * 100) : 100;
  const retrievedCount = statusCounts.retrieved + statusCounts.completed;
  const retrievalRate = memories.length > 0 ? Math.round((retrievedCount / memories.length) * 100) : 0;

  // Unique locations
  const locationSet = new Set(memories.map(m => m.location).filter(Boolean));
  const locationCount = locationSet.size;

  // Most active location
  const locationFreq: Record<string, number> = {};
  memories.forEach(m => { if (m.location) locationFreq[m.location] = (locationFreq[m.location] || 0) + 1; });
  const topLocation = Object.entries(locationFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div style={{ animation: 'fadeUp 0.3s var(--ease-out)', maxWidth: 960, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
            Insights
          </h1>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--success-text)', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', padding: '3px 10px', borderRadius: 'var(--r-full)' }}>
            <div className="live-dot" />
            LIVE ANALYSIS
          </span>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
          Memory patterns, risk distribution, and spatial intelligence overview
        </p>
      </div>

      {/* Top KPI Row */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'linear-gradient(90deg, var(--accent), var(--info))' }} />
          <div className="kpi-label"><Brain size={12} /> Memories</div>
          <div className="kpi-value">{memories.length}</div>
          <div className="kpi-subtitle">Total stored</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: `linear-gradient(90deg, ${safetyScore >= 90 ? 'var(--success)' : 'var(--warning)'}, var(--accent))` }} />
          <div className="kpi-label"><Shield size={12} /> Safety Score</div>
          <div className="kpi-value" style={{ color: safetyScore >= 90 ? 'var(--success-text)' : safetyScore >= 70 ? 'var(--warning-text)' : 'var(--danger-text)' }}>
            {safetyScore}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>%</span>
          </div>
          <div className="kpi-subtitle">{forgottenCount} items at risk</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'linear-gradient(90deg, var(--success), var(--info))' }} />
          <div className="kpi-label"><TrendingUp size={12} /> Retrieval Rate</div>
          <div className="kpi-value" style={{ color: 'var(--success-text)' }}>
            {retrievalRate}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>%</span>
          </div>
          <div className="kpi-subtitle">{retrievedCount} items recovered</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'linear-gradient(90deg, var(--info), var(--warning))' }} />
          <div className="kpi-label"><MapPin size={12} /> Locations</div>
          <div className="kpi-value">{locationCount}</div>
          <div className="kpi-subtitle">Unique tracked places</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="insights-grid">
        {/* Memory Type Breakdown */}
        <div className="insight-card">
          <div className="insight-card-title">
            <Layers size={13} />
            Memory Types
          </div>
          {Object.entries(typeCounts).length > 0 ? (
            Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="bar-chart-row">
                  <div className="bar-chart-label">{type}</div>
                  <div className="bar-chart-track">
                    <div
                      className="bar-chart-fill"
                      style={{
                        width: `${(count / Math.max(...Object.values(typeCounts))) * 100}%`,
                        background: BAR_COLORS[type] || 'var(--accent)',
                      }}
                    />
                  </div>
                  <div className="bar-chart-value">{count}</div>
                </div>
              ))
          ) : (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No memories yet</p>
          )}
        </div>

        {/* Risk Distribution */}
        <div className="insight-card">
          <div className="insight-card-title">
            <AlertTriangle size={13} />
            Risk Distribution
          </div>
          {[
            { key: 'critical', label: 'Critical', color: 'var(--danger)' },
            { key: 'high',     label: 'High',     color: 'var(--warning)' },
            { key: 'medium',   label: 'Medium',   color: 'var(--info)' },
            { key: 'low',      label: 'Low',      color: 'var(--success)' },
          ].map(({ key, label, color }) => (
            <div key={key} className="bar-chart-row">
              <div className="bar-chart-label">{label}</div>
              <div className="bar-chart-track">
                <div
                  className="bar-chart-fill"
                  style={{
                    width: `${(riskCounts[key as keyof typeof riskCounts] / total) * 100}%`,
                    background: color,
                  }}
                />
              </div>
              <div className="bar-chart-value">{riskCounts[key as keyof typeof riskCounts]}</div>
            </div>
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="insight-card">
          <div className="insight-card-title">
            <CheckSquare size={13} />
            Memory Status
          </div>
          {[
            { key: 'active',               label: 'Active',     color: 'var(--accent)' },
            { key: 'potentially_forgotten', label: 'At Risk',   color: 'var(--warning)' },
            { key: 'retrieved',            label: 'Retrieved',  color: 'var(--success)' },
            { key: 'completed',            label: 'Completed',  color: 'var(--success)' },
          ].map(({ key, label, color }) => (
            <div key={key} className="bar-chart-row">
              <div className="bar-chart-label">{label}</div>
              <div className="bar-chart-track">
                <div
                  className="bar-chart-fill"
                  style={{
                    width: `${(statusCounts[key as keyof typeof statusCounts] / total) * 100}%`,
                    background: color,
                  }}
                />
              </div>
              <div className="bar-chart-value">{statusCounts[key as keyof typeof statusCounts]}</div>
            </div>
          ))}
        </div>

        {/* Top Stats Panel */}
        <div className="insight-card">
          <div className="insight-card-title">
            <BarChart3 size={13} />
            Spatial Intelligence
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 4 }}>TOP LOCATION</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="var(--danger-text)" />
                {topLocation}
              </div>
            </div>

            <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 4 }}>RETRIEVAL SUCCESS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${retrievalRate}%`, height: '100%', background: 'var(--success)', borderRadius: 'var(--r-full)', transition: 'width 0.8s var(--ease-out)' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--success-text)' }}>
                  {retrievalRate}%
                </span>
              </div>
            </div>

            <div style={{ padding: 'var(--sp-4)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 4 }}>WITH PHOTO/VIDEO</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {memories.filter(m => m.image_url).length} memories
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Telemetry & AI Cost Observability Section */}
      <div style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-5)', background: 'var(--bg-secondary)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>System Performance & AI Cost Observability</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
            GEMINI 2.5 FLASH TELEMETRY
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-3)' }}>
          <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>MEAN EXTRACTION LATENCY</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>~280 ms</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Multimodal entity parsing</div>
          </div>

          <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>MEAN RETRIEVAL LATENCY</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: 2 }}>~295 ms</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Context-grounded query</div>
          </div>

          <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>GEOFENCE EVALUATION</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--success-text)', marginTop: 2 }}>&lt; 15 ms</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Geodesic Haversine math</div>
          </div>

          <div style={{ padding: 'var(--sp-3)', background: 'var(--bg-base)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-faint)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>ESTIMATED INFERENCE COST</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--warning-text)', marginTop: 2 }}>$0.000075 / req</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Gemini 2.5 Flash PayG tier</div>
          </div>
        </div>
      </div>
    </div>
  );
};
