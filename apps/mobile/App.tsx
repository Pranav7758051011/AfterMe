import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { api, setMobileUserId, getMobileUserId } from './src/services/api';
import { Memory, ProactiveAlert, AskResponse } from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'ask' | 'location'>('home');
  const [userId, setUserId] = useState(getMobileUserId());
  const [memories, setMemories] = useState<Memory[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [currentLocation, setCurrentLocation] = useState('Conference Room');
  const [userLat, setUserLat] = useState(37.7749);
  const [userLng, setUserLng] = useState(-122.4194);
  const [isGPSActive, setIsGPSActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Ask Screen State
  const [askQuery, setAskQuery] = useState('');
  const [askAnswer, setAskAnswer] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  // Quick Voice & User Switch Modals
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [customUserText, setCustomUserText] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [mems, loc, activeAlerts] = await Promise.all([
        api.getMemories(),
        api.getLocation(),
        api.getAlerts(),
      ]);
      setMemories(mems);
      setCurrentLocation(loc.current_location);
      if (loc.latitude) setUserLat(loc.latitude);
      if (loc.longitude) setUserLng(loc.longitude);
      setAlerts(activeAlerts);
    } catch (e) {
      console.warn('Failed to load mobile data from Firestore:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSwitchUser = (newId: string) => {
    setUserId(newId);
    setMobileUserId(newId);
    setUserModalVisible(false);
    loadData();
  };

  const handleCreateMemory = async (textToSave?: string) => {
    const text = textToSave || inputText;
    if (!text.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await api.createMemory(text.trim(), currentLocation);
      setInputText('');
      setVoiceModalVisible(false);
      await loadData();
      Alert.alert('Memory Created', `Saved to Firestore: "${text}"`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save memory to Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateDeparture = async (newLoc: string) => {
    try {
      const res = await api.changeLocation(newLoc);
      setCurrentLocation(res.current_location);
      setAlerts(res.alerts);
      await loadData();
      if (res.alerts.length > 0) {
        Alert.alert(
          '🚨 Departure Warning',
          res.alerts[0].message || 'You may have forgotten something!'
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to simulate departure.');
    }
  };

  const handleGPSMove = async (lat: number, lng: number, placeName: string) => {
    try {
      setUserLat(lat);
      setUserLng(lng);
      setCurrentLocation(placeName);
      const res = await api.sendGPSLocation(lat, lng, 10, placeName);
      if (res.alerts) setAlerts(res.alerts);
      await loadData();
      if (res.alerts && res.alerts.length > 0) {
        Alert.alert('🚨 Geofence Departure Detected', res.alerts[0].message);
      }
    } catch (e) {
      console.warn('GPS update error:', e);
    }
  };

  const handleMarkRetrieved = async (memId: string, alertId?: string) => {
    await api.updateStatus(memId, 'retrieved');
    if (alertId) await api.dismissAlert(alertId);
    await loadData();
  };

  const handleAsk = async (queryText?: string) => {
    const q = queryText || askQuery;
    if (!q.trim() || isAsking) return;

    try {
      setIsAsking(true);
      const res = await api.ask(q.trim());
      setAskAnswer(res);
    } catch (e) {
      Alert.alert('Error', 'Failed to query memories.');
    } finally {
      setIsAsking(false);
    }
  };

  const forgottenMemories = memories.filter((m) => m.status === 'potentially_forgotten');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0d14" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.logoIcon}>🧠</Text>
          <View>
            <Text style={styles.appName}>AfterMe</Text>
            <Text style={styles.appTagline}>Live GPS & Geofenced Reminders</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.userBadge}
            onPress={() => setUserModalVisible(true)}
          >
            <Text style={styles.userText}>👤 {userId}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.locationBadge}
            onPress={() => setActiveTab('location')}
          >
            <Text style={styles.locationText}>📍 {currentLocation.slice(0, 14)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {activeTab === 'home' && (
          <View>
            {/* Greeting */}
            <Text style={styles.greetingText}>Good day 👋</Text>
            <Text style={styles.subGreeting}>
              GPS Coordinates: {userLat.toFixed(4)}, {userLng.toFixed(4)}
            </Text>

            {/* Quick Capture Input */}
            <View style={styles.captureBox}>
              <TextInput
                style={styles.input}
                placeholder="What should I remember?"
                placeholderTextColor="#64748b"
                value={inputText}
                onChangeText={setInputText}
              />
              <View style={styles.captureActions}>
                <TouchableOpacity
                  style={styles.voiceBtn}
                  onPress={() => setVoiceModalVisible(true)}
                >
                  <Text style={{ fontSize: 18 }}>🎙️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, !inputText.trim() && { opacity: 0.5 }]}
                  onPress={() => handleCreateMemory()}
                  disabled={!inputText.trim() || isSubmitting}
                >
                  <Text style={styles.saveBtnText}>{isSubmitting ? '...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Proactive Alert Banner (if active) */}
            {alerts.length > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertIcon}>🚨</Text>
                  <Text style={styles.alertTitle}>You may have forgotten something</Text>
                </View>
                <Text style={styles.alertBody}>{alerts[0].message}</Text>
                <View style={styles.alertButtons}>
                  <TouchableOpacity
                    style={styles.retrievedBtn}
                    onPress={() => handleMarkRetrieved(alerts[0].memory_id, alerts[0].id)}
                  >
                    <Text style={styles.retrievedBtnText}>✓ Retrieved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => api.dismissAlert(alerts[0].id).then(loadData)}
                  >
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Potentially Forgotten Section */}
            {forgottenMemories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ Potentially Forgotten</Text>
                {forgottenMemories.map((m) => (
                  <View key={m.id} style={[styles.memoryCard, styles.forgottenCard]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardItemName}>🔌 {m.object || m.original_text}</Text>
                      <Text style={styles.riskBadge}>HIGH</Text>
                    </View>
                    <Text style={styles.cardLoc}>📍 {m.location || 'Unknown'}</Text>
                    <Text style={styles.cardText}>"{m.original_text}"</Text>
                    <TouchableOpacity
                      style={styles.actionBtnSmall}
                      onPress={() => handleMarkRetrieved(m.id)}
                    >
                      <Text style={styles.actionBtnTextSmall}>Mark Retrieved</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Memories Stream */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Memories in Firestore</Text>
              {memories.slice(0, 5).map((m) => (
                <View key={m.id} style={styles.memoryCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardItemName}>
                      {m.memory_type === 'belonging' ? '🔌' : m.memory_type === 'document' ? '📁' : '📝'} {m.object || m.task || m.original_text.slice(0, 25)}
                    </Text>
                    <Text style={[styles.riskBadge, { color: m.risk_level === 'critical' ? '#f87171' : '#fbbf24' }]}>
                      {m.risk_level.toUpperCase()}
                    </Text>
                  </View>
                  {m.location && <Text style={styles.cardLoc}>📍 {m.location}</Text>}
                  <Text style={styles.cardText}>"{m.original_text}"</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tab: Memories */}
        {activeTab === 'memories' && (
          <View>
            <Text style={styles.greetingText}>All Memories ({memories.length})</Text>
            {memories.map((m) => (
              <View key={m.id} style={styles.memoryCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardItemName}>
                    {m.memory_type === 'belonging' ? '🔌' : m.memory_type === 'document' ? '📁' : '📝'} {m.object || m.task || m.original_text.slice(0, 25)}
                  </Text>
                  <Text style={styles.riskBadge}>{m.status}</Text>
                </View>
                {m.location && <Text style={styles.cardLoc}>📍 {m.location}</Text>}
                <Text style={styles.cardText}>"{m.original_text}"</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tab: Ask AfterMe */}
        {activeTab === 'ask' && (
          <View>
            <Text style={styles.greetingText}>Ask AfterMe</Text>
            <Text style={styles.subGreeting}>Conversational retrieval &bull; Zero hallucinations</Text>

            <View style={styles.captureBox}>
              <TextInput
                style={styles.input}
                placeholder='Ask: "Where did I leave my charger?"'
                placeholderTextColor="#64748b"
                value={askQuery}
                onChangeText={setAskQuery}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => handleAsk()}
                disabled={isAsking || !askQuery.trim()}
              >
                <Text style={styles.saveBtnText}>{isAsking ? '...' : 'Ask'}</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Sample Questions */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 16 }}>
              {['Where is my charger?', 'Where is my passport?', 'Where are my keys?'].map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => {
                    setAskQuery(q);
                    handleAsk(q);
                  }}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Answer Display */}
            {isAsking && <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 20 }} />}

            {askAnswer && !isAsking && (
              <View style={styles.answerCard}>
                <Text style={styles.answerHeader}>
                  {askAnswer.has_match ? '✓ Verified Memory' : 'Strict Anti-Hallucination'}
                </Text>
                <Text style={styles.answerBody}>{askAnswer.answer}</Text>
                {askAnswer.relevant_memories?.length > 0 && (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 8 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>Source Memory:</Text>
                    <Text style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4 }}>
                      "{askAnswer.relevant_memories[0].original_text}"
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Tab: Location Simulator */}
        {activeTab === 'location' && (
          <View>
            <Text style={styles.greetingText}>Live GPS & Geofence</Text>
            <Text style={styles.subGreeting}>Radar & Geofence Departure Detection</Text>

            <View style={styles.locationDetailBox}>
              <Text style={styles.currentLocTitle}>Current Location:</Text>
              <Text style={styles.currentLocValue}>📍 {currentLocation}</Text>
              <Text style={{ color: '#818cf8', fontSize: 12, marginTop: 4 }}>
                Lat: {userLat.toFixed(4)} &bull; Lng: {userLng.toFixed(4)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={() => handleGPSMove(37.7762, -122.4178, 'Office Desk (180m away)')}
            >
              <Text style={styles.leaveBtnText}>🚨 Simulate Moving 180m Away</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Geofenced Places:</Text>
              {[
                { name: 'Conference Room', lat: 37.7749, lng: -122.4194 },
                { name: 'Office Desk', lat: 37.7762, lng: -122.4178 },
                { name: 'Cafeteria', lat: 37.7756, lng: -122.4208 },
                { name: 'Library', lat: 37.7732, lng: -122.4212 },
                { name: 'Home', lat: 37.7812, lng: -122.4085 },
              ].map((loc) => (
                <TouchableOpacity
                  key={loc.name}
                  style={styles.locationOption}
                  onPress={() => handleGPSMove(loc.lat, loc.lng, loc.name)}
                >
                  <Text style={styles.locationOptionText}>📍 {loc.name} ({loc.lat.toFixed(3)}, {loc.lng.toFixed(3)})</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('memories')}
        >
          <Text style={[styles.navIcon, activeTab === 'memories' && styles.navActive]}>📋</Text>
          <Text style={[styles.navLabel, activeTab === 'memories' && styles.navLabelActive]}>Memories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('ask')}
        >
          <Text style={[styles.navIcon, activeTab === 'ask' && styles.navActive]}>💬</Text>
          <Text style={[styles.navLabel, activeTab === 'ask' && styles.navLabelActive]}>Ask</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('location')}
        >
          <Text style={[styles.navIcon, activeTab === 'location' && styles.navActive]}>🗺️</Text>
          <Text style={[styles.navLabel, activeTab === 'location' && styles.navLabelActive]}>Map / GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Quick Capture Modal */}
      <Modal visible={voiceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🎙️ Voice Memory Capture</Text>
            <Text style={styles.modalSub}>Choose or speak a natural prompt:</Text>

            <TouchableOpacity
              style={styles.voicePromptBtn}
              onPress={() => handleCreateMemory('I left my black laptop charger in the conference room.')}
            >
              <Text style={styles.voicePromptText}>"I left my black laptop charger in the conference room."</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voicePromptBtn}
              onPress={() => handleCreateMemory('My passport is in the blue folder in the top drawer.')}
            >
              <Text style={styles.voicePromptText}>"My passport is in the blue folder in top drawer."</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voicePromptBtn}
              onPress={() => handleCreateMemory('I need to send project report to Professor Davis by Friday.')}
            >
              <Text style={styles.voicePromptText}>"I need to send project report to Professor by Friday."</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dismissBtn, { marginTop: 16 }]}
              onPress={() => setVoiceModalVisible(false)}
            >
              <Text style={styles.dismissBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Switcher Modal */}
      <Modal visible={userModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>👤 Firebase User Account</Text>
            <Text style={styles.modalSub}>Switch active user session:</Text>

            {['demo_user_001', 'alex_executive', 'judge_reviewer'].map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.voicePromptBtn, userId === u && { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)' }]}
                onPress={() => handleSwitchUser(u)}
              >
                <Text style={styles.voicePromptText}>{u} {userId === u ? '✓ (Active)' : ''}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10 }]}
                placeholder="Custom user ID..."
                placeholderTextColor="#64748b"
                value={customUserText}
                onChangeText={setCustomUserText}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => customUserText.trim() && handleSwitchUser(customUserText.trim())}
              >
                <Text style={styles.saveBtnText}>Set</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dismissBtn, { marginTop: 16 }]}
              onPress={() => setUserModalVisible(false)}
            >
              <Text style={styles.dismissBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    fontSize: 26,
  },
  appName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  appTagline: {
    color: '#94a3b8',
    fontSize: 11,
  },
  userBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  userText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  locationBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subGreeting: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  captureBox: {
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  input: {
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 6,
  },
  captureActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  voiceBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 6,
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  alertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertTitle: {
    color: '#fecaca',
    fontWeight: '700',
    fontSize: 15,
  },
  alertBody: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  retrievedBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  retrievedBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  dismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  memoryCard: {
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  forgottenCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardItemName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  riskBadge: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '800',
  },
  cardLoc: {
    color: '#818cf8',
    fontSize: 12,
    marginBottom: 6,
  },
  cardText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  actionBtnSmall: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionBtnTextSmall: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '600',
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  answerCard: {
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },
  answerHeader: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  answerBody: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  locationDetailBox: {
    backgroundColor: '#121826',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  currentLocTitle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  currentLocValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  leaveBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  locationOption: {
    backgroundColor: '#121826',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  locationOptionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0a0d14',
    paddingVertical: 10,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  navActive: {
    opacity: 1,
  },
  navLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  navLabelActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#0f1523',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
  },
  voicePromptBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voicePromptText: {
    color: '#e2e8f0',
    fontSize: 13,
  },
});
