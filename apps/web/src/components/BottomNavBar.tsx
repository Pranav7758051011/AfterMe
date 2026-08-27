import React from 'react';
import { LayoutDashboard, Compass, Mic, BarChart3 } from 'lucide-react';

export type ActivePageTab = 'dashboard' | 'map' | 'voice' | 'insights';

interface BottomNavBarProps {
  activeTab: ActivePageTab;
  onTabChange: (tab: ActivePageTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 2500,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 16px 20px',
        background: 'rgba(18, 24, 38, 0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Tab: Dashboard */}
      <button
        type="button"
        onClick={() => onTabChange('dashboard')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTab === 'dashboard' ? 'rgba(128, 131, 255, 0.2)' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 14px',
          color: activeTab === 'dashboard' ? '#c0c1ff' : '#94a3b8',
          fontWeight: activeTab === 'dashboard' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: activeTab === 'dashboard' ? 'translateY(-2px)' : 'none',
        }}
      >
        <LayoutDashboard size={20} style={{ marginBottom: '3px' }} />
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.05em', fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase' }}>
          Dashboard
        </span>
      </button>

      {/* Tab: Map */}
      <button
        type="button"
        onClick={() => onTabChange('map')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTab === 'map' ? 'rgba(128, 131, 255, 0.2)' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 14px',
          color: activeTab === 'map' ? '#c0c1ff' : '#94a3b8',
          fontWeight: activeTab === 'map' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: activeTab === 'map' ? 'translateY(-2px)' : 'none',
        }}
      >
        <Compass size={20} style={{ marginBottom: '3px' }} />
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.05em', fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase' }}>
          Spatial Map
        </span>
      </button>

      {/* Tab: Voice */}
      <button
        type="button"
        onClick={() => onTabChange('voice')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTab === 'voice' ? 'rgba(128, 131, 255, 0.2)' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 14px',
          color: activeTab === 'voice' ? '#c0c1ff' : '#94a3b8',
          fontWeight: activeTab === 'voice' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: activeTab === 'voice' ? 'translateY(-2px)' : 'none',
        }}
      >
        <Mic size={20} style={{ marginBottom: '3px' }} />
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.05em', fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase' }}>
          Live Voice
        </span>
      </button>

      {/* Tab: Insights */}
      <button
        type="button"
        onClick={() => onTabChange('insights')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTab === 'insights' ? 'rgba(128, 131, 255, 0.2)' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          padding: '6px 14px',
          color: activeTab === 'insights' ? '#c0c1ff' : '#94a3b8',
          fontWeight: activeTab === 'insights' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: activeTab === 'insights' ? 'translateY(-2px)' : 'none',
        }}
      >
        <BarChart3 size={20} style={{ marginBottom: '3px' }} />
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.05em', fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase' }}>
          Insights
        </span>
      </button>
    </nav>
  );
};
