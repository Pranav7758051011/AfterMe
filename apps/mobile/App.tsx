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
  Platform,
} from 'react-native';
import { api, setMobileUserId, getMobileUserId } from './src/services/api';
import { Memory, ProactiveAlert, AskResponse } from './src/types';

// ─── Design Tokens ──────────────────────────────────────────
const C = {
  bgBase:      '#08101c',
  bgPrimary:   '#0c1526',
  bgSecondary: '#111e33',
  bgTertiary:  '#172240',
  bgElevated:  '#1c2a4d',
  bgInput:     '#0f1a2e',

  borderFaint:   'rgba(255,255,255,0.04)',
  borderSubtle:  'rgba(255,255,255,0.08)',
  borderDefault: 'rgba(255,255,255,0.12)',

  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary:  '#64748b',

  accent:        '#4F6EF7',
  accentSubtle:  'rgba(79,110,247,0.12)',
  accentBorder:  'rgba(79,110,247,0.3)',

  success:       '#059669',
  successText:   '#34d399',
  successSubtle: 'rgba(5,150,105,0.12)',
  successBorder: 'rgba(5,150,105,0.3)',

  danger:        '#dc2626',
  dangerText:    '#f87171',
  dangerSubtle:  'rgba(220,38,38,0.1)',
  dangerBorder:  'rgba(220,38,38,0.3)',

  warning:       '#d97706',
  warningText:   '#fbbf24',
  warningSubtle: 'rgba(217,119,6,0.12)',
  warningBorder: 'rgba(217,119,6,0.3)',

  info:          '#0891b2',
  infoText:      '#38bdf8',
  infoSubtle:    'rgba(8,145,178,0.12)',
  infoBorder:    'rgba(8,145,178,0.3)',
};

type TabKey = 'home' | 'memories' | 'ask' | 'location';

const TYPE_EMOJI: Record<string, string> = {
  belonging: '📦', document: '📄', task: '✅',
  event: '📅', person: '👤', idea: '💡', other: '🧠',
};

const RISK_COLOR: Record<string, string> = {
  critical: C.dangerText, high: C.warningText,
  medium: C.infoText,    low:  C.textTertiary,
};

const LOCATION_PRESETS = [
  { name: 'Conference Room', lat: 37.7752, lng: -122.4183 },
  { name: 'Office Lobby',    lat: 37.7760, lng: -122.4190 },
  { name: 'Library',         lat: 37.7800, lng: -122.4100 },
  { name: 'Home',            lat: 37.7700, lng: -122.4250 },
  { name: 'Cafe',            lat: 37.7748, lng: -122.4175 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [userId] = useState(getMobileUserId());
  const [memories, setMemories] = useState<Memory[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [currentLocation, setCurrentLocation] = useState('Conference Room');
  const [userLat, setUserLat] = useState(37.7752);
  const [userLng, setUserLng] = useState(-122.4183);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [askQuery, setAskQuery] = useState('');
  const [askAnswer, setAskAnswer] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
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
      console.warn('Failed to load data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSwitchUser = (newId: string) => {
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
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to save memory.');
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
        Alert.alert('⚠ Departure Alert', res.alerts[0].message || 'You may have forgotten something!');
      }
    } catch {
      Alert.alert('Error', 'Failed to simulate departure.');
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
      setAskAnswer(null);
      const res = await api.ask(q.trim());
      setAskAnswer(res);
    } catch {
      Alert.alert('Error', 'Failed to query memories.');
    } finally {
      setIsAsking(false);
    }
  };

  const forgottenCount = memories.filter(m => m.status === 'potentially_forgotten').length;
  const safetyScore = memories.length > 0 ? Math.round(((memories.length - forgottenCount) / memories.length) * 100) : 100;

  // ─── Render Tab Content ──────────────────────────────────
  const renderHome = () => (
    <View>
      {/* Alert Card */}
      {alerts.filter(a => !a.is_dismissed).slice(0, 1).map(alert => (
        <View key={alert.id} style={styles.alertCard}>
          <View style={styles.alertAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertBody}>{alert.message}</Text>
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.btnSm, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}
                onPress={() => handleMarkRetrieved(alert.memory_id, alert.id)}
              >
                <Text style={[styles.btnSmText, { color: C.successText }]}>✓ Retrieved</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSm, { backgroundColor: C.bgTertiary, borderColor: C.borderDefault }]}
                onPress={() => api.dismissAlert(alert.id).then(loadData)}
              >
                <Text style={[styles.btnSmText, { color: C.textSecondary }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderTopColor: C.accent }]}>
          <Text style={styles.kpiLabel}>MEMORIES</Text>
          <Text style={styles.kpiValue}>{memories.length}</Text>
        </View>
        <View style={[styles.kpiCard, { borderTopColor: safetyScore >= 90 ? C.success : C.warning }]}>
          <Text style={styles.kpiLabel}>SAFETY</Text>
          <Text style={[styles.kpiValue, { color: safetyScore >= 90 ? C.successText : C.warningText }]}>
            {safetyScore}%
          </Text>
        </View>
        <View style={[styles.kpiCard, { borderTopColor: forgottenCount > 0 ? C.warning : C.success }]}>
          <Text style={styles.kpiLabel}>AT RISK</Text>
          <Text style={[styles.kpiValue, { color: forgottenCount > 0 ? C.warningText : C.successText }]}>
            {forgottenCount}
          </Text>
        </View>
      </View>

      {/* Capture Input */}
      <View style={styles.captureCard}>
        <Text style={styles.captureLabel}>WHAT SHOULD I REMEMBER?</Text>
        <TextInput
          style={styles.captureInput}
          placeholder={'e.g. "I left my charger in the conference room"'}
          placeholderTextColor={C.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          numberOfLines={2}
        />
        <View style={styles.captureActions}>
          <TouchableOpacity
            style={[styles.btnSm, { backgroundColor: C.infoSubtle, borderColor: C.infoBorder }]}
            onPress={() => {
              const text = `Parked my car at ${currentLocation}`;
              setInputText(text);
            }}
          >
            <Text style={[styles.btnSmText, { color: C.infoText }]}>🚗 Parked Here</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, !inputText.trim() && { opacity: 0.4 }]}
            onPress={() => handleCreateMemory()}
            disabled={!inputText.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>Remember →</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* At-Risk Section */}
      {forgottenCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠ AT RISK  ·  {forgottenCount}</Text>
          {memories.filter(m => m.status === 'potentially_forgotten').map(m => (
            <View key={m.id} style={[styles.memCard, { borderLeftColor: C.warning, borderLeftWidth: 3 }]}>
              <View style={styles.memCardHeader}>
                <Text style={styles.memCardTitle}>
                  {TYPE_EMOJI[m.memory_type] || '🧠'} {m.object || m.task || m.original_text.slice(0, 30)}
                </Text>
                <View style={[styles.riskBadge, { backgroundColor: C.warningSubtle, borderColor: C.warningBorder }]}>
                  <Text style={[styles.riskBadgeText, { color: C.warningText }]}>HIGH</Text>
                </View>
              </View>
              {m.location && <Text style={styles.memCardMeta}>📍 {m.location}</Text>}
              <Text style={styles.memCardBody} numberOfLines={2}>"{m.original_text}"</Text>
              <TouchableOpacity style={[styles.btnSm, { marginTop: 8, backgroundColor: C.successSubtle, borderColor: C.successBorder, alignSelf: 'flex-start' }]} onPress={() => handleMarkRetrieved(m.id)}>
                <Text style={[styles.btnSmText, { color: C.successText }]}>✓ Mark Retrieved</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Recent Memories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECENT  ·  {memories.length}</Text>
        {memories.slice(0, 6).map(m => (
          <View key={m.id} style={[styles.memCard, { borderLeftColor: C.accent, borderLeftWidth: 3 }]}>
            <View style={styles.memCardHeader}>
              <Text style={styles.memCardTitle} numberOfLines={1}>
                {TYPE_EMOJI[m.memory_type] || '🧠'} {m.object || m.task || m.original_text.slice(0, 28)}
              </Text>
              <View style={[styles.riskBadge, { backgroundColor: `${RISK_COLOR[m.risk_level]}20`, borderColor: `${RISK_COLOR[m.risk_level]}40` }]}>
                <Text style={[styles.riskBadgeText, { color: RISK_COLOR[m.risk_level] }]}>
                  {m.risk_level.toUpperCase()}
                </Text>
              </View>
            </View>
            {m.location && <Text style={styles.memCardMeta}>📍 {m.location}</Text>}
            <Text style={styles.memCardBody} numberOfLines={2}>"{m.original_text}"</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMemories = () => (
    <View>
      <Text style={styles.pageTitle}>All Memories</Text>
      <Text style={styles.pageSubtitle}>{memories.length} items stored in Firestore</Text>

      {memories.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🧠</Text>
          <Text style={styles.emptyStateTitle}>No memories yet</Text>
          <Text style={styles.emptyStateBody}>Capture your first memory from the Home tab</Text>
        </View>
      )}

      {memories.map(m => (
        <View key={m.id} style={[
          styles.memCard,
          { borderLeftWidth: 3, borderLeftColor: m.status === 'potentially_forgotten' ? C.warning : C.accent },
          (m.status === 'retrieved' || m.status === 'completed') && { opacity: 0.55 },
        ]}>
          <View style={styles.memCardHeader}>
            <Text style={styles.memCardTitle} numberOfLines={1}>
              {TYPE_EMOJI[m.memory_type] || '🧠'} {m.object || m.task || m.original_text.slice(0, 28)}
            </Text>
            <View style={[styles.riskBadge, { backgroundColor: `${RISK_COLOR[m.risk_level]}20`, borderColor: `${RISK_COLOR[m.risk_level]}40` }]}>
              <Text style={[styles.riskBadgeText, { color: RISK_COLOR[m.risk_level] }]}>
                {m.risk_level}
              </Text>
            </View>
          </View>

          {m.location && <Text style={styles.memCardMeta}>📍 {m.location}</Text>}
          {m.deadline && <Text style={[styles.memCardMeta, { color: C.warningText }]}>⏰ Due: {m.deadline}</Text>}
          <Text style={styles.memCardBody} numberOfLines={2}>"{m.original_text}"</Text>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {m.memory_type === 'belonging' && m.status !== 'retrieved' && (
              <TouchableOpacity
                style={[styles.btnSm, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}
                onPress={() => handleMarkRetrieved(m.id)}
              >
                <Text style={[styles.btnSmText, { color: C.successText }]}>✓ Retrieved</Text>
              </TouchableOpacity>
            )}
            {m.status === 'retrieved' && (
              <View style={[styles.riskBadge, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
                <Text style={[styles.riskBadgeText, { color: C.successText }]}>✓ Retrieved</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderAsk = () => (
    <View>
      <Text style={styles.pageTitle}>Ask AfterMe</Text>
      <Text style={styles.pageSubtitle}>Grounded retrieval · Zero hallucinations</Text>

      {/* Sample questions */}
      <View style={styles.sampleQuestions}>
        {[
          'Where did I leave my charger?',
          'Where is my passport?',
          'Where is my car parked?',
          'What tasks do I have due?',
        ].map((q, i) => (
          <TouchableOpacity key={i} style={styles.sampleQ} onPress={() => { setAskQuery(q); handleAsk(q); }}>
            <Text style={styles.sampleQText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={styles.askInputRow}>
        <TextInput
          style={[styles.captureInput, { flex: 1, marginBottom: 0 }]}
          placeholder="Where did I leave my…"
          placeholderTextColor={C.textTertiary}
          value={askQuery}
          onChangeText={setAskQuery}
          onSubmitEditing={() => handleAsk()}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.btnPrimary, { marginLeft: 8, paddingHorizontal: 18 }, (!askQuery.trim() || isAsking) && { opacity: 0.4 }]}
          onPress={() => handleAsk()}
          disabled={!askQuery.trim() || isAsking}
        >
          {isAsking ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Ask</Text>}
        </TouchableOpacity>
      </View>

      {/* Answer */}
      {askAnswer && (
        <View style={[styles.answerCard, askAnswer.has_match && { borderColor: C.successBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: C.accent, letterSpacing: 1 }}>
              AfterMe AI
            </Text>
            {askAnswer.has_match ? (
              <View style={[styles.riskBadge, { backgroundColor: C.successSubtle, borderColor: C.successBorder }]}>
                <Text style={[styles.riskBadgeText, { color: C.successText }]}>✓ Verified</Text>
              </View>
            ) : (
              <View style={[styles.riskBadge, { backgroundColor: C.bgTertiary, borderColor: C.borderSubtle }]}>
                <Text style={[styles.riskBadgeText, { color: C.textTertiary }]}>No match</Text>
              </View>
            )}
          </View>
          <Text style={styles.answerText}>{askAnswer.answer}</Text>

          {askAnswer.relevant_memories?.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: C.textTertiary, letterSpacing: 1, marginBottom: 6 }}>
                SOURCE MEMORIES
              </Text>
              {askAnswer.relevant_memories.map(mem => (
                <View key={mem.id} style={styles.citationCard}>
                  <Text style={styles.citationTitle} numberOfLines={1}>
                    {TYPE_EMOJI[mem.memory_type] || '🧠'} {mem.object || mem.task || mem.original_text.slice(0, 35)}
                  </Text>
                  {mem.location && (
                    <Text style={styles.memCardMeta}>📍 {mem.location}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderLocation = () => (
    <View>
      <Text style={styles.pageTitle}>Spatial Map</Text>
      <Text style={styles.pageSubtitle}>GPS tracking & departure simulation</Text>

      {/* GPS Status Card */}
      <View style={styles.gpsCard}>
        <View style={styles.gpsDot} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.kpiLabel, { marginBottom: 4 }]}>CURRENT LOCATION</Text>
          <Text style={styles.gpsLocation}>{currentLocation}</Text>
          <Text style={[styles.memCardMeta, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
            {userLat.toFixed(5)}, {userLng.toFixed(5)}
          </Text>
        </View>
      </View>

      {/* Departure Simulator */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SIMULATE DEPARTURE</Text>
        <Text style={[styles.pageSubtitle, { marginBottom: 12 }]}>Tap a destination to trigger geofence alerts</Text>

        {LOCATION_PRESETS.map(loc => (
          <TouchableOpacity
            key={loc.name}
            style={[styles.locationPreset, loc.name === currentLocation && { borderColor: C.accentBorder, backgroundColor: C.accentSubtle }]}
            onPress={() => handleSimulateDeparture(loc.name)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationPresetName, loc.name === currentLocation && { color: C.accent }]}>
                {loc.name === currentLocation ? '📍 ' : '🏁 '}{loc.name}
              </Text>
              <Text style={styles.locationPresetCoords}>
                {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </Text>
            </View>
            {loc.name !== currentLocation && (
              <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Leave →</Text>
            )}
            {loc.name === currentLocation && (
              <View style={[styles.riskBadge, { backgroundColor: C.accentSubtle, borderColor: C.accentBorder }]}>
                <Text style={[styles.riskBadgeText, { color: C.accent }]}>HERE</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE ALERTS  ·  {alerts.filter(a => !a.is_dismissed).length}</Text>
          {alerts.filter(a => !a.is_dismissed).map(alert => (
            <View key={alert.id} style={[styles.alertCard, { marginBottom: 10 }]}>
              <View style={styles.alertAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertBody}>{alert.message}</Text>
                <TouchableOpacity
                  style={[styles.btnSm, { marginTop: 8, alignSelf: 'flex-start', backgroundColor: C.successSubtle, borderColor: C.successBorder }]}
                  onPress={() => handleMarkRetrieved(alert.memory_id, alert.id)}
                >
                  <Text style={[styles.btnSmText, { color: C.successText }]}>✓ Retrieved</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // ─── Bottom Tab Bar ──────────────────────────────────────
  const TABS: { key: TabKey; label: string; emoji: string }[] = [
    { key: 'home',      label: 'Home',      emoji: '⊞' },
    { key: 'memories',  label: 'Memories',  emoji: '🧠' },
    { key: 'ask',       label: 'Ask AI',    emoji: '✦' },
    { key: 'location',  label: 'Spatial',   emoji: '◎' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgBase} />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Text style={{ fontSize: 16 }}>🧠</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AfterMe</Text>
            <Text style={styles.headerTagline}>PROACTIVE SPATIAL AI</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={styles.liveDot} />
          <TouchableOpacity
            style={styles.locationBadge}
            onPress={() => setActiveTab('location')}
          >
            <Text style={styles.locationBadgeText} numberOfLines={1}>
              📍 {currentLocation.slice(0, 16)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userBadge}
            onPress={() => setUserModalVisible(true)}
          >
            <Text style={styles.userBadgeText}>{userId.slice(0, 8)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {activeTab === 'home'     && renderHome()}
        {activeTab === 'memories' && renderMemories()}
        {activeTab === 'ask'      && renderAsk()}
        {activeTab === 'location' && renderLocation()}
      </ScrollView>

      {/* Bottom Tab Dock */}
      <View style={styles.tabBar}>
        <View style={styles.tabDock}>
          {TABS.map(({ key, label, emoji }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabItem, activeTab === key && styles.tabItemActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabEmoji, activeTab === key && { opacity: 1 }]}>{emoji}</Text>
              <Text style={[styles.tabLabel, activeTab === key && { color: C.textPrimary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* User Switch Modal */}
      <Modal visible={userModalVisible} transparent animationType="fade" onRequestClose={() => setUserModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Switch User</Text>
            <Text style={styles.modalSubtitle}>Current: {userId}</Text>
            <TextInput
              style={[styles.captureInput, { marginVertical: 12 }]}
              placeholder="Enter user ID (e.g. user_001)"
              placeholderTextColor={C.textTertiary}
              value={customUserText}
              onChangeText={setCustomUserText}
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['user_001', 'user_002', 'user_003'].map(u => (
                <TouchableOpacity key={u} style={[styles.btnSm, { flex: 1, backgroundColor: C.accentSubtle, borderColor: C.accentBorder }]} onPress={() => handleSwitchUser(u)}>
                  <Text style={[styles.btnSmText, { color: C.accent }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {customUserText.trim() && (
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 12 }]} onPress={() => handleSwitchUser(customUserText.trim())}>
                <Text style={styles.btnPrimaryText}>Switch to {customUserText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btnSm, { marginTop: 8, alignSelf: 'center', borderColor: C.borderDefault }]} onPress={() => setUserModalVisible(false)}>
              <Text style={[styles.btnSmText, { color: C.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── StyleSheet ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgBase },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.accentSubtle,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.5 },
  headerTagline: {
    fontSize: 9,
    color: C.textTertiary,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.successText,
  },
  locationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.accentSubtle,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderRadius: 20,
    maxWidth: 120,
  },
  locationBadgeText: { fontSize: 11, color: C.accent, fontWeight: '600' },
  userBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.bgTertiary,
    borderWidth: 1,
    borderColor: C.borderDefault,
    borderRadius: 20,
  },
  userBadgeText: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  // Content
  content: { flex: 1 },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderTopWidth: 2,
    borderRadius: 10,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: C.textTertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -1,
  },

  // Capture
  captureCard: {
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  captureLabel: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: C.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  captureInput: {
    backgroundColor: C.bgInput,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 10,
    padding: 12,
    color: C.textPrimary,
    fontSize: 14,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  captureActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },

  // Buttons
  btnPrimary: {
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSm: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderDefault,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  btnSmText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },

  // Alert Card
  alertCard: {
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
  },
  alertAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.danger,
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 4, paddingLeft: 6 },
  alertBody: { fontSize: 13, color: C.textSecondary, lineHeight: 18, paddingLeft: 6 },
  alertActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingLeft: 6 },

  // Memory Cards
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: C.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  memCard: {
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  memCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  memCardTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary, flex: 1, marginRight: 8 },
  memCardMeta: { fontSize: 12, color: C.textTertiary, marginBottom: 4 },
  memCardBody: { fontSize: 13, color: C.textSecondary, lineHeight: 18, fontStyle: 'italic' },

  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  riskBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Ask
  askInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sampleQuestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sampleQ: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.bgTertiary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 20,
  },
  sampleQText: { fontSize: 12, color: C.textSecondary },
  answerCard: {
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderDefault,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  answerText: { fontSize: 14, color: C.textPrimary, lineHeight: 22 },
  citationCard: {
    backgroundColor: C.bgBase,
    borderWidth: 1,
    borderColor: C.borderFaint,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  citationTitle: { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },

  // Location
  gpsCard: {
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  gpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.successText,
  },
  gpsLocation: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  locationPreset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  locationPresetName: { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
  locationPresetCoords: {
    fontSize: 11,
    color: C.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    backgroundColor: 'rgba(8, 16, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  tabDock: {
    flexDirection: 'row',
    backgroundColor: C.bgPrimary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 20,
    padding: 5,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 15,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: C.bgElevated,
  },
  tabEmoji: { fontSize: 18, opacity: 0.5 },
  tabLabel: { fontSize: 10, fontWeight: '500', color: C.textTertiary },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderDefault,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: C.textTertiary, marginBottom: 8 },

  // Page headers
  pageTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: C.textTertiary, marginBottom: 20 },

  // Empty state
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: C.bgSecondary,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: 16,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyStateIcon: { fontSize: 36, marginBottom: 12 },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', color: C.textSecondary, marginBottom: 6 },
  emptyStateBody: { fontSize: 13, color: C.textTertiary, textAlign: 'center' },
});
