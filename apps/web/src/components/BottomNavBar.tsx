import React from 'react';
import { LayoutDashboard, Compass, Mic, BarChart3 } from 'lucide-react';

export type ActivePageTab = 'dashboard' | 'map' | 'voice' | 'insights';

interface BottomNavBarProps {
  activeTab: ActivePageTab;
  onTabChange: (tab: ActivePageTab) => void;
}

const TABS: { tab: ActivePageTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { tab: 'map',       label: 'Spatial',   icon: <Compass size={20} /> },
  { tab: 'voice',     label: 'Voice',     icon: <Mic size={20} /> },
  { tab: 'insights',  label: 'Insights',  icon: <BarChart3 size={20} /> },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bottom-navbar">
      <div className="bottom-navbar-dock">
        {TABS.map(({ tab, label, icon }) => (
          <button
            key={tab}
            type="button"
            className={`dock-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => onTabChange(tab)}
            aria-label={label}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
