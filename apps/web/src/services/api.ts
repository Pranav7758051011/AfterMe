import { Memory, ProactiveAlert, AppStats, AskResponse } from '../types';
import { cloudFirestore } from './firestoreClient';
import { extractClientMemory } from './clientExtractor';

const API_BASE = '/api';

let currentUserId = localStorage.getItem('afterme_user_id') || 'demo_user_001';
let currentAuthToken: string | null = null;

export const setApiUser = (userId: string, token?: string | null) => {
  currentUserId = userId;
  currentAuthToken = token || null;
  localStorage.setItem('afterme_user_id', userId);
};

export const getApiUserId = () => currentUserId;

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId,
  };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return headers;
};

// ─── Local Storage Cache Helpers ─────────────────────────────────────
const LOCAL_STORAGE_KEY = (uid: string) => `afterme_memories_${uid}`;
const LOCAL_ALERTS_KEY = (uid: string) => `afterme_alerts_${uid}`;

function getLocalMemories(uid: string): Memory[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMemory(memory: Memory): void {
  try {
    const existing = getLocalMemories(memory.user_id || currentUserId);
    const updated = [memory, ...existing.filter(m => m.id !== memory.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY(memory.user_id || currentUserId), JSON.stringify(updated));
  } catch (e) {
    console.warn('Local storage write warning:', e);
  }
}

function getLocalAlerts(uid: string): ProactiveAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_KEY(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAlert(alert: ProactiveAlert, uid: string): void {
  try {
    const existing = getLocalAlerts(uid);
    const updated = [alert, ...existing.filter(a => a.id !== alert.id)];
    localStorage.setItem(LOCAL_ALERTS_KEY(uid), JSON.stringify(updated));
  } catch (e) {
    console.warn('Local alert write warning:', e);
  }
}

// ─── Unified Multi-Tier API Service ───────────────────────────────────
export const api = {
  async getMemories(filters?: { status?: string; memory_type?: string; search?: string }): Promise<Memory[]> {
    let memories: Memory[] = [];

    // 1. Try Backend REST API
    try {
      const params = new URLSearchParams();
      params.append('user_id', currentUserId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.memory_type) params.append('memory_type', filters.memory_type);
      if (filters?.search) params.append('search', filters.search);

      const res = await fetch(`${API_BASE}/memories?${params.toString()}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories)) {
          memories = data.memories;
        }
      }
    } catch (e) {
      console.warn('Backend fetch notice, checking Cloud Firestore directly:', e);
    }

    // 2. Direct Cloud Firestore Fallback if backend returned empty or was unreachable
    if (memories.length === 0) {
      try {
        const directMemories = await cloudFirestore.getMemories(currentUserId);
        if (Array.isArray(directMemories) && directMemories.length > 0) {
          memories = directMemories;
        }
      } catch (e) {
        console.warn('Cloud Firestore read error:', e);
      }
    }

    // 3. Local Storage Fallback
    const localMems = getLocalMemories(currentUserId);
    const map = new Map<string, Memory>();
    [...memories, ...localMems].forEach(m => map.set(m.id, m));
    let combined = Array.from(map.values());

    // Apply client-side filters if needed
    if (filters?.status) combined = combined.filter(m => m.status === filters.status);
    if (filters?.memory_type) combined = combined.filter(m => m.memory_type === filters.memory_type);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      combined = combined.filter(m => 
        m.original_text.toLowerCase().includes(s) ||
        (m.object && m.object.toLowerCase().includes(s)) ||
        (m.location && m.location.toLowerCase().includes(s))
      );
    }

    return combined;
  },

  async createMemory(
    text: string,
    currentLocation?: string,
    options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number }
  ): Promise<{ memory: Memory; extraction: any }> {
    // 1. Try Backend REST API
    try {
      const res = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          text,
          current_location: currentLocation,
          user_id: currentUserId,
          image_url: options?.imageUrl,
          image_base64: options?.imageBase64,
          latitude: options?.latitude,
          longitude: options?.longitude,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.memory) {
          saveLocalMemory(result.memory);
          cloudFirestore.saveMemory(result.memory).catch(() => {});
          return result;
        }
      }
    } catch (err) {
      console.warn('Backend API unavailable, using client-side extraction & Firestore sync:', err);
    }

    // 2. Client-Side Extraction & Local Storage Fallback
    const fallbackResult = extractClientMemory(text, currentLocation, {
      ...options,
      userId: currentUserId,
    });

    saveLocalMemory(fallbackResult.memory);
    cloudFirestore.saveMemory(fallbackResult.memory).catch(() => {});

    return fallbackResult;
  },

  async updateMemoryStatus(id: string, status: string): Promise<Memory | null> {
    // Update local cache
    const existing = getLocalMemories(currentUserId);
    const target = existing.find(m => m.id === id);
    if (target) {
      target.status = status as any;
      saveLocalMemory(target);
    }

    cloudFirestore.updateStatus(id, status).catch(() => {});

    try {
      const res = await fetch(`${API_BASE}/memories/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, user_id: currentUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.memory;
      }
    } catch (e) {
      console.warn('Backend status update notice:', e);
    }

    return target || null;
  },

  async deleteMemory(id: string): Promise<boolean> {
    try {
      const existing = getLocalMemories(currentUserId);
      const updated = existing.filter(m => m.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY(currentUserId), JSON.stringify(updated));
    } catch (e) {}

    cloudFirestore.deleteMemory(id).catch(() => {});

    try {
      await fetch(`${API_BASE}/memories/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    } catch (e) {
      console.warn('Backend delete notice:', e);
    }

    return true;
  },

  async getStats(): Promise<AppStats> {
    try {
      const res = await fetch(`${API_BASE}/memories/stats?user_id=${currentUserId}`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {}

    const mems = await api.getMemories();
    return {
      total_memories: mems.length,
      pending_tasks: mems.filter(m => m.memory_type === 'task' && m.status === 'active').length,
      potentially_forgotten: mems.filter(m => m.status === 'potentially_forgotten').length,
      active_belongings: mems.filter(m => m.memory_type === 'belonging' && m.status === 'active').length,
      current_location: localStorage.getItem('afterme_current_location') || 'Mumbai - Pune Expressway, Bhatan',
    };
  },

  async getLocation(): Promise<{ current_location: string; previous_location: string; latitude?: number; longitude?: number }> {
    try {
      const res = await fetch(`${API_BASE}/location?user_id=${currentUserId}`, { headers: getHeaders() });
      if (res.ok) return await res.json();
    } catch (e) {}

    return {
      current_location: localStorage.getItem('afterme_current_location') || 'Mumbai - Pune Expressway, Bhatan',
      previous_location: localStorage.getItem('afterme_prev_location') || 'Unknown',
    };
  },

  async changeLocation(newLocation: string, prevLocation?: string): Promise<{ alerts: ProactiveAlert[]; message: string; current_location: string }> {
    localStorage.setItem('afterme_current_location', newLocation);
    if (prevLocation) localStorage.setItem('afterme_prev_location', prevLocation);

    try {
      const res = await fetch(`${API_BASE}/location/change`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ current_location: newLocation, previous_location: prevLocation, user_id: currentUserId }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.alerts) {
          result.alerts.forEach((a: ProactiveAlert) => saveLocalAlert(a, currentUserId));
        }
        return result;
      }
    } catch (e) {}

    // Client-side departure simulation
    const mems = await api.getMemories();
    const leftBehind = mems.filter(m => m.memory_type === 'belonging' && m.status !== 'retrieved');
    const alerts: ProactiveAlert[] = [];

    if (leftBehind.length > 0) {
      const alert: ProactiveAlert = {
        id: `alert_${Date.now()}`,
        user_id: currentUserId,
        memory_id: leftBehind[0].id,
        memory: leftBehind[0],
        trigger_type: 'location_departure',
        title: '🚨 You may have forgotten something',
        message: `🚨 You left your ${leftBehind[0].object || 'item'} at ${prevLocation || 'previous spot'}!`,
        severity: leftBehind[0].risk_level,
        created_at: new Date().toISOString(),
        is_dismissed: false,
      };
      alerts.push(alert);
      saveLocalAlert(alert, currentUserId);
    }

    return {
      current_location: newLocation,
      message: alerts.length > 0 ? `🚨 Geofence Departure: ${alerts.length} item(s) potentially left behind!` : 'Location updated.',
      alerts,
    };
  },

  async sendGPSLocation(latitude: number, longitude: number, accuracy?: number, placeName?: string): Promise<any> {
    cloudFirestore.saveUserLocation(currentUserId, placeName || 'GPS Location', latitude, longitude, accuracy).catch(() => {});

    try {
      const res = await fetch(`${API_BASE}/location/gps`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ latitude, longitude, accuracy, place_name: placeName, user_id: currentUserId }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.alerts) {
          result.alerts.forEach((a: ProactiveAlert) => saveLocalAlert(a, currentUserId));
        }
        return result;
      }
    } catch (e) {}

    return {
      latitude,
      longitude,
      accuracy_quality: 'good',
      message: `GPS Updated (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      alerts: getLocalAlerts(currentUserId).filter(a => !a.is_dismissed),
    };
  },

  async getAlerts(): Promise<ProactiveAlert[]> {
    try {
      const res = await fetch(`${API_BASE}/location/alerts?user_id=${currentUserId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.alerts)) return data.alerts;
      }
    } catch (e) {}

    return getLocalAlerts(currentUserId).filter(a => !a.is_dismissed);
  },

  async dismissAlert(id: string): Promise<boolean> {
    try {
      const existing = getLocalAlerts(currentUserId);
      const updated = existing.map(a => a.id === id ? { ...a, is_dismissed: true } : a);
      localStorage.setItem(LOCAL_ALERTS_KEY(currentUserId), JSON.stringify(updated));
    } catch (e) {}

    cloudFirestore.dismissAlert(id).catch(() => {});

    try {
      await fetch(`${API_BASE}/location/alerts/${id}/dismiss`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: currentUserId }),
      });
    } catch (e) {}

    return true;
  },

  async askAfterMe(question: string, currentLocation?: string): Promise<AskResponse> {
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ question, current_location: currentLocation, user_id: currentUserId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const mems = await api.getMemories();
    const lowerQ = question.toLowerCase();
    const matching = mems.filter(m => {
      const text = `${m.original_text} ${m.object || ''} ${m.location || ''} ${m.task || ''}`.toLowerCase();
      const words = lowerQ.replace(/[?.,!]/g, '').split(/\s+/).filter(w => w.length > 2 && !['where', 'what', 'did', 'leave', 'have', 'the', 'my', 'is', 'are'].includes(w));
      return words.some(w => text.includes(w)) || (lowerQ.includes('park') && text.includes('park')) || (lowerQ.includes('charger') && text.includes('charger'));
    });

    if (matching.length === 0) {
      return {
        answer: `I don't have a memory matching "${question}".`,
        has_match: false,
        confidence: 0.8,
        relevant_memories: [],
      };
    }

    return {
      answer: `Based on your memory: "${matching[0].original_text}".`,
      has_match: true,
      confidence: 0.9,
      relevant_memories: matching,
      follow_up_hint: matching[0].location ? `Located at: ${matching[0].location}` : undefined,
    };
  },

  async seedGoldenDemo(): Promise<void> {
    try {
      await fetch(`${API_BASE}/demo/seed-golden`, { method: 'POST', headers: getHeaders() });
    } catch (e) {}

    await api.createMemory('I left my black laptop charger in the conference room.', 'Conference Room');
  },

  async seedFullDemo(): Promise<void> {
    try {
      await fetch(`${API_BASE}/demo/seed-full`, { method: 'POST', headers: getHeaders() });
    } catch (e) {}

    await api.createMemory('I left my black laptop charger in the conference room.', 'Conference Room');
    await api.createMemory('Passport is in the blue folder, top desk drawer.', 'Home Office');
    await api.createMemory('Parked vehicle on Floor 2, Bay B-14.', 'Campus Parking Garage');
    await api.createMemory('Submit CSE project report by Friday 5 PM.', 'University');
  },

  async resetDemo(): Promise<void> {
    localStorage.removeItem(LOCAL_STORAGE_KEY(currentUserId));
    localStorage.removeItem(LOCAL_ALERTS_KEY(currentUserId));
    try {
      await fetch(`${API_BASE}/demo/reset`, { method: 'POST', headers: getHeaders() });
    } catch (e) {}
  },
};
