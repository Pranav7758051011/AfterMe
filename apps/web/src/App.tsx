import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNavBar, ActivePageTab } from './components/BottomNavBar';
import { DashboardPage } from './pages/DashboardPage';
import { MapPage } from './pages/MapPage';
import { VoicePage } from './pages/VoicePage';
import { InsightsPage } from './pages/InsightsPage';
import { AskAfterMeDrawer } from './components/AskAfterMeDrawer';
import { AuthModal } from './components/AuthModal';
import { ShareMemoryModal } from './components/ShareMemoryModal';
import { MemoryInsightsModal } from './components/MemoryInsightsModal';
import { LiveVoiceCallModal } from './components/LiveVoiceCallModal';
import { ShaderBackground } from './components/ShaderBackground';
import { HighlightedLocation } from './components/LocationMap';
import { api, getApiUserId, setApiUser } from './services/api';
import { Memory, ProactiveAlert, AppStats } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { usePushNotifications } from './hooks/usePushNotifications';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActivePageTab>('dashboard');
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
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
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
    setActiveTab('dashboard');

    setTimeout(() => {
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
      }, 300);
    }, 150);
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

  const handleCreateMemory = async (
    text: string,
    options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number }
  ) => {
    const res = await api.createMemory(text, currentLocation, options);
    setPrefilledMemoryText(undefined);
    await refreshData();
    return res;
  };

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
    // Optimistic instant UI update
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await api.deleteMemory(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
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
    setActiveTab('map');
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

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      {/* WebGL Obsidian Shader Background */}
      <ShaderBackground />

      {/* Top Navbar with Multi-Page Navigation Links */}
      <Navbar
        stats={stats}
        userId={userId}
        activeTab={activeTab}
        onNavigateToTab={setActiveTab}
        onOpenAsk={() => setIsAskOpen(true)}
        onOpenLiveCall={() => setActiveTab('voice')}
        onOpenInsights={() => setActiveTab('insights')}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSeedGolden={handleSeedGolden}
        onSeedFull={handleSeedFull}
        onResetDemo={handleResetDemo}
        onInstallPWA={handleInstallPWA}
        canInstallPWA={Boolean(deferredPrompt)}
        isLoading={isLoading}
      />

      {/* Multi-Page Views */}
      <main>
        {activeTab === 'dashboard' && (
          <DashboardPage
            memories={memories}
            alerts={alerts}
            stats={stats}
            currentLocation={currentLocation}
            userLatitude={userLatitude}
            userLongitude={userLongitude}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            prefilledMemoryText={prefilledMemoryText}
            onSaveMemory={handleCreateMemory}
            onStatusChange={handleStatusChange}
            onDeleteMemory={handleDeleteMemory}
            onDismissAlert={handleDismissAlert}
            onMarkRetrieved={handleMarkRetrieved}
            onLocateOnMap={handleLocateOnMap}
            onShareMemory={(mem) => setSharingMemory(mem)}
            onSeedGolden={handleSeedGolden}
            onSimulateDeparture={handleLocationDeparture}
            onOpenAsk={() => setIsAskOpen(true)}
            onNavigateToTab={setActiveTab}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'map' && (
          <MapPage
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
            onMarkRetrieved={handleMarkRetrieved}
            onClearHighlight={() => setHighlightedLocation(null)}
            onRequestFreshGPS={geo.requestFreshLocation}
            onAddMemoryAtLocation={handleAddMemoryAtLocation}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'voice' && (
          <VoicePage currentLocation={currentLocation} />
        )}

        {activeTab === 'insights' && (
          <InsightsPage
            memories={memories}
            stats={stats}
            onNavigateToTab={setActiveTab}
          />
        )}
      </main>

      {/* Stitch AI Mobile/Tablet Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Ask AfterMe Conversational Drawer */}
      <AskAfterMeDrawer
        isOpen={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        onAsk={handleAsk}
        currentLocation={currentLocation}
        onLocateOnMap={handleLocateOnMap}
      />

      {/* 1-Click Item Handover & QR Code Share Modal */}
      <ShareMemoryModal
        isOpen={Boolean(sharingMemory)}
        memory={sharingMemory}
        onClose={() => setSharingMemory(null)}
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
