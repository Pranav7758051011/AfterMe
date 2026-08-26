import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LocationSimulator } from './components/LocationSimulator';
import { ProactiveAlertBanner } from './components/ProactiveAlertBanner';
import { MemoryInput } from './components/MemoryInput';
import { MemoryCard } from './components/MemoryCard';
import { AskAfterMeDrawer } from './components/AskAfterMeDrawer';
import { DemoScenarioSelector } from './components/DemoScenarioSelector';
import { AuthModal } from './components/AuthModal';
import { HighlightedLocation } from './components/LocationMap';
import { api, getApiUserId, setApiUser } from './services/api';
import { Memory, ProactiveAlert, AppStats, AskResponse } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { Brain, Filter, Search, Inbox, Satellite } from 'lucide-react';

export const App: React.FC = () => {
  const [userId, setUserId] = useState(getApiUserId());
  const [memories, setMemories] = useState<Memory[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [currentLocation, setCurrentLocation] = useState('Conference Room');
  const [previousLocation, setPreviousLocation] = useState('Office');
  const [userLatitude, setUserLatitude] = useState(37.7749);
  const [userLongitude, setUserLongitude] = useState(-122.4194);
  const [userAccuracy, setUserAccuracy] = useState(10);
  const [highlightedLocation, setHighlightedLocation] = useState<HighlightedLocation | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'potentially_forgotten' | 'belonging' | 'task' | 'document' | 'event'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live GPS Geolocation Hook
  const geo = useGeolocation(true);

  // Sync real-time browser GPS when tracking is enabled
  useEffect(() => {
    if (geo.isTracking && geo.latitude !== null && geo.longitude !== null) {
      setUserLatitude(geo.latitude);
      setUserLongitude(geo.longitude);
      if (geo.accuracy !== null) setUserAccuracy(geo.accuracy);
      const name = geo.locationName || `GPS (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})`;
      setCurrentLocation(name);
    }
  }, [geo.isTracking, geo.latitude, geo.longitude, geo.accuracy, geo.locationName]);

  // Load all data from Firebase Firestore
  const refreshData = useCallback(async () => {
    try {
      const [mems, loc, activeAlerts, st] = await Promise.all([
        api.getMemories(),
        api.getLocation(),
        api.getAlerts(),
        api.getStats(),
      ]);

      setMemories(mems);
      if (!geo.isTracking) {
        setCurrentLocation(loc.current_location);
        setPreviousLocation(loc.previous_location);
        if (st.current_latitude) setUserLatitude(st.current_latitude);
        if (st.current_longitude) setUserLongitude(st.current_longitude);
      }
      setAlerts(activeAlerts);
      setStats(st);
    } catch (err) {
      console.error('Error fetching Firestore data:', err);
    }
  }, [geo.isTracking]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 6000);
    return () => clearInterval(interval);
  }, [refreshData, userId]);

  const handleUserChanged = (newId: string) => {
    setUserId(newId);
    setApiUser(newId);
    refreshData();
  };

  // Create new memory in Firestore
  const handleCreateMemory = async (
    text: string,
    options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number }
  ) => {
    const res = await api.createMemory(text, currentLocation, options);
    await refreshData();
    return res;
  };

  // Location departure simulation
  const handleLocationDeparture = async (newLocation: string) => {
    try {
      setIsLoading(true);
      const res = await api.changeLocation(newLocation, currentLocation);
      setCurrentLocation(res.current_location);
      setAlerts(res.alerts);
      await refreshData();
    } catch (err) {
      console.error('Error changing location:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // GPS Location update
  const handleGPSLocationChange = async (lat: number, lng: number, accuracy = 10, placeName?: string) => {
    try {
      setUserLatitude(lat);
      setUserLongitude(lng);
      setUserAccuracy(accuracy);
      if (placeName) setCurrentLocation(placeName);

      const res = await api.sendGPSLocation(lat, lng, accuracy, placeName);
      if (res.alerts) setAlerts(res.alerts);
      await refreshData();
    } catch (err) {
      console.error('Error sending GPS location:', err);
    }
  };

  // Locate & circle on map
  const handleLocateOnMap = (loc: HighlightedLocation) => {
    setHighlightedLocation(loc);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dismiss alert
  const handleDismissAlert = async (alertId: string) => {
    await api.dismissAlert(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await refreshData();
  };

  // Mark retrieved from alert
  const handleMarkRetrieved = async (memoryId: string, alertId?: string) => {
    await api.updateMemoryStatus(memoryId, 'retrieved');
    if (alertId) await api.dismissAlert(alertId);
    if (highlightedLocation?.memoryId === memoryId) {
      setHighlightedLocation(null);
    }
    await refreshData();
  };

  // Status toggle from card
  const handleStatusChange = async (id: string, status: string) => {
    await api.updateMemoryStatus(id, status);
    await refreshData();
  };

  // Delete memory
  const handleDeleteMemory = async (id: string) => {
    await api.deleteMemory(id);
    if (highlightedLocation?.memoryId === id) {
      setHighlightedLocation(null);
    }
    await refreshData();
  };

  // Ask AfterMe
  const handleAsk = async (question: string): Promise<AskResponse> => {
    return api.askAfterMe(question, currentLocation);
  };

  // Demo triggers
  const handleSeedGolden = async () => {
    setIsLoading(true);
    await api.seedGoldenDemo();
    await refreshData();
    setIsLoading(false);
  };

  const handleSeedFull = async () => {
    setIsLoading(true);
    await api.seedFullDemo();
    await refreshData();
    setIsLoading(false);
  };

  const handleResetDemo = async () => {
    setIsLoading(true);
    await api.resetDemo();
    setHighlightedLocation(null);
    await refreshData();
    setIsLoading(false);
  };

  // Filter memories
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
    <div className="app-container">
      {/* Header & Logo */}
      <Navbar
        stats={stats}
        userId={userId}
        onOpenAsk={() => setIsAskOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSeedGolden={handleSeedGolden}
        onSeedFull={handleSeedFull}
        onResetDemo={handleResetDemo}
        isLoading={isLoading}
      />

      {/* Demo Scenario Guide */}
      <DemoScenarioSelector
        onRunGoldenStep1={handleSeedGolden}
        onRunGoldenStep2={() => handleLocationDeparture('Office Desk')}
        onOpenAskWithQuery={(q) => {
          setIsAskOpen(true);
        }}
        isLoading={isLoading}
      />

      {/* Interactive Map & Geofenced Location Simulator */}
      <LocationSimulator
        currentLocation={currentLocation}
        previousLocation={previousLocation}
        userLatitude={userLatitude}
        userLongitude={userLongitude}
        userAccuracy={userAccuracy}
        isLiveTracking={geo.isTracking}
        memories={memories}
        highlightedLocation={highlightedLocation}
        onSimulateDeparture={handleLocationDeparture}
        onGPSLocationChange={handleGPSLocationChange}
        onToggleLiveTracking={geo.toggleTracking}
        onMarkRetrieved={(id) => handleMarkRetrieved(id)}
        onClearHighlight={() => setHighlightedLocation(null)}
        isLoading={isLoading}
      />

      {/* Proactive Departure Alert Banner */}
      <ProactiveAlertBanner
        alerts={alerts}
        onDismiss={handleDismissAlert}
        onMarkRetrieved={handleMarkRetrieved}
      />

      {/* Natural Language Memory Input */}
      <MemoryInput
        onSave={handleCreateMemory}
        currentLocation={currentLocation}
        userLatitude={userLatitude}
        userLongitude={userLongitude}
      />

      {/* Memory Stream Header & Filter Tabs */}
      <div className="stream-header">
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
          <button
            className={`filter-tab ${activeFilter === 'event' ? 'active' : ''}`}
            onClick={() => setActiveFilter('event')}
          >
            📅 Events ({memories.filter((m) => m.memory_type === 'event').length})
          </button>
        </div>

        {/* Quick Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="capture-input"
            style={{ padding: '8px 12px 8px 34px', fontSize: '0.85rem' }}
          />
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Memory Cards Grid */}
      {filteredMemories.length > 0 ? (
        <div className="memory-grid">
          {filteredMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteMemory}
              onLocateOnMap={handleLocateOnMap}
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

      {/* Ask AfterMe Conversational Drawer */}
      <AskAfterMeDrawer
        isOpen={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        onAsk={handleAsk}
        currentLocation={currentLocation}
        onLocateOnMap={handleLocateOnMap}
      />

      {/* Firebase Auth Switcher Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserChanged={handleUserChanged}
      />
    </div>
  );
};

export default App;
