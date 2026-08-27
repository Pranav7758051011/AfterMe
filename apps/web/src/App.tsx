import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LocationSimulator } from './components/LocationSimulator';
import { ProactiveAlertBanner } from './components/ProactiveAlertBanner';
import { MemoryInput } from './components/MemoryInput';
import { MemoryCard } from './components/MemoryCard';
import { AskAfterMeDrawer } from './components/AskAfterMeDrawer';
import { DemoScenarioSelector } from './components/DemoScenarioSelector';
import { AuthModal } from './components/AuthModal';
import { BeaconScannerWidget } from './components/BeaconScannerWidget';
import { LiveVoiceCallModal } from './components/LiveVoiceCallModal';
import { ShareMemoryModal } from './components/ShareMemoryModal';
import { MemoryInsightsModal } from './components/MemoryInsightsModal';
import { ShaderBackground } from './components/ShaderBackground';
import { HighlightedLocation } from './components/LocationMap';
import { api, getApiUserId, setApiUser } from './services/api';
import { Memory, ProactiveAlert, AppStats, AskResponse } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { usePushNotifications } from './hooks/usePushNotifications';
import { Brain, Filter, Search, Inbox, Satellite, Bell } from 'lucide-react';

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
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [sharingMemory, setSharingMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prefilledMemoryText, setPrefilledMemoryText] = useState<string | undefined>(undefined);
  
  // PWA Installation prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Live GPS Geolocation Hook
  const geo = useGeolocation(true);

  // Browser Native Push Notifications Hook
  const { sendNotification } = usePushNotifications();

  // PWA Install Event Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleAddMemoryAtLocation = (placeName: string, lat: number, lng: number) => {
    setCurrentLocation(placeName);
    setUserLatitude(lat);
    setUserLongitude(lng);
    setPrefilledMemoryText('I left ');

    const inputSection = document.getElementById('memory-input-section');
    if (inputSection) {
      inputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      const txtInput = document.querySelector<HTMLInputElement>('#memory-input-section input');
      if (txtInput) {
        txtInput.focus();
        txtInput.setSelectionRange(txtInput.value.length, txtInput.value.length);
      }
    }, 350);
  };

  // Sync real-time browser GPS when coordinates arrive
  useEffect(() => {
    if (geo.latitude !== null && geo.longitude !== null) {
      setUserLatitude(geo.latitude);
      setUserLongitude(geo.longitude);
      if (geo.accuracy !== null) setUserAccuracy(geo.accuracy);
      const name = geo.locationName || `GPS (${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)})`;
      setCurrentLocation(name);
    }
  }, [geo.latitude, geo.longitude, geo.accuracy, geo.locationName]);

  // Trigger system desktop/mobile push notification on new alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      sendNotification('🚨 AfterMe: You may have left something behind!', {
        body: latest.message,
      });
    }
  }, [alerts, sendNotification]);

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
      if (!geo.isTracking && geo.latitude === null) {
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
  }, [geo.isTracking, geo.latitude]);

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
    setPrefilledMemoryText(undefined);
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

  const handleGPSLocationChange = async (lat: number, lng: number, accuracy?: number, placeName?: string) => {
    setUserLatitude(lat);
    setUserLongitude(lng);
    if (accuracy) setUserAccuracy(accuracy);
    if (placeName) setCurrentLocation(placeName);
    try {
      const res = await api.sendGPSLocation(lat, lng, accuracy, placeName);
      if (res.alerts) setAlerts(res.alerts);
      await refreshData();
    } catch (e) {
      console.error('GPS update failed:', e);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.updateMemoryStatus(id, status);
    await refreshData();
  };

  const handleDeleteMemory = async (id: string) => {
    await api.deleteMemory(id);
    await refreshData();
  };

  const handleDismissAlert = async (id: string) => {
    await api.dismissAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMarkRetrieved = async (id: string, alertId?: string) => {
    await api.updateMemoryStatus(id, 'retrieved');
    if (alertId) {
      await api.dismissAlert(alertId);
    }
    await refreshData();
  };

  const handleAsk = async (question: string) => {
    return api.askAfterMe(question, currentLocation);
  };

  const handleLocateOnMap = (loc: { lat: number; lng: number; name: string; label?: string; memoryId?: string }) => {
    setHighlightedLocation(loc);
  };

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
    <div className="app-container" style={{ position: 'relative' }}>
      {/* WebGL Obsidian Shader Background */}
      <ShaderBackground />

      {/* Header & Logo */}
      <Navbar
        stats={stats}
        userId={userId}
        onOpenAsk={() => setIsAskOpen(true)}
        onOpenLiveCall={() => setIsLiveCallOpen(true)}
        onOpenInsights={() => setIsInsightsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSeedGolden={handleSeedGolden}
        onSeedFull={handleSeedFull}
        onResetDemo={handleResetDemo}
        onInstallPWA={handleInstallPWA}
        canInstallPWA={Boolean(deferredPrompt)}
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

      {/* Bluetooth Low Energy Indoor Beacon Radar Widget */}
      <BeaconScannerWidget />

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
        onRequestFreshGPS={geo.requestFreshLocation}
        onAddMemoryAtLocation={handleAddMemoryAtLocation}
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
        prefilledText={prefilledMemoryText}
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
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteMemory}
              onLocateOnMap={handleLocateOnMap}
              onShare={(mem) => setSharingMemory(mem)}
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

      {/* Gemini 2.0 Live Bidirectional Voice Call Modal */}
      <LiveVoiceCallModal
        isOpen={isLiveCallOpen}
        onClose={() => setIsLiveCallOpen(false)}
        currentLocation={currentLocation}
      />

      {/* 1-Click Item Handover & QR Code Share Modal */}
      <ShareMemoryModal
        isOpen={Boolean(sharingMemory)}
        memory={sharingMemory}
        onClose={() => setSharingMemory(null)}
      />

      {/* AI Spatial Memory Intelligence & Safety Analytics Modal */}
      <MemoryInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        memories={memories}
        stats={stats}
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
