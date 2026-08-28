import { v4 as uuidv4 } from 'uuid';
import { getAdminFirestore } from './firebaseAdmin';
import { config } from '../config';

export type MemoryType = 
  | 'belonging'
  | 'location'
  | 'task'
  | 'event'
  | 'person'
  | 'document'
  | 'idea'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type MemoryStatus = 
  | 'active'
  | 'potentially_forgotten'
  | 'retrieved'
  | 'completed'
  | 'archived';

export interface Memory {
  id: string;
  user_id: string;
  original_text: string;
  memory_type: MemoryType;
  object?: string | null;
  task?: string | null;
  event?: string | null;
  person?: string | null;
  location?: string | null;
  action?: string | null;
  date?: string | null;
  time?: string | null;
  deadline?: string | null;
  importance: RiskLevel;
  risk_level: RiskLevel;
  status: MemoryStatus;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
  image_url?: string | null;
  related_memory_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ProactiveAlert {
  id: string;
  user_id: string;
  memory_id: string;
  memory: Memory;
  trigger_type: 'location_departure' | 'geofence_departure' | 'time_reminder' | 'context_change';
  title: string;
  message: string;
  severity: RiskLevel;
  distance_meters?: number;
  created_at: string;
  is_dismissed: boolean;
}

export interface AppStats {
  total_memories: number;
  active_belongings: number;
  potentially_forgotten: number;
  pending_tasks: number;
  current_location: string;
  current_latitude?: number | null;
  current_longitude?: number | null;
}

export interface UserLocationState {
  current_location: string;
  previous_location: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updated_at: string;
}

// In-Memory fallback store
const localMemories = new Map<string, Memory>();
const localAlerts = new Map<string, ProactiveAlert>();
const localUserStates = new Map<string, UserLocationState>();

// Default San Francisco tech campus coordinates for Conference Room
localUserStates.set(config.defaultUserId, {
  current_location: 'Conference Room',
  previous_location: 'Office',
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10,
  updated_at: new Date().toISOString(),
});

export const firestoreRepo = {
  async create(memoryData: Partial<Memory> & { user_id: string; original_text: string; memory_type: MemoryType }): Promise<Memory> {
    const id = memoryData.id || uuidv4();
    const now = new Date().toISOString();

    const memoryDoc: Memory = {
      id,
      user_id: memoryData.user_id,
      original_text: memoryData.original_text,
      memory_type: memoryData.memory_type,
      object: memoryData.object || null,
      task: memoryData.task || null,
      event: memoryData.event || null,
      person: memoryData.person || null,
      location: memoryData.location || null,
      action: memoryData.action || null,
      date: memoryData.date || null,
      time: memoryData.time || null,
      deadline: memoryData.deadline || null,
      importance: memoryData.importance || 'medium',
      risk_level: memoryData.risk_level || 'medium',
      status: memoryData.status || 'active',
      latitude: memoryData.latitude !== undefined ? memoryData.latitude : null,
      longitude: memoryData.longitude !== undefined ? memoryData.longitude : null,
      radius: memoryData.radius || 75, // Default 75-meter geofence radius
      image_url: memoryData.image_url || null,
      related_memory_ids: memoryData.related_memory_ids || [],
      created_at: now,
      updated_at: now,
    };

    localMemories.set(id, memoryDoc);

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('memories').doc(id).set(memoryDoc);
      } catch (err: any) {
        console.warn('Firestore write warning:', err?.message || err);
      }
    }

    return memoryDoc;
  },

  async getById(id: string): Promise<Memory | null> {
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        const doc = await firestore.collection('memories').doc(id).get();
        if (doc.exists) {
          return doc.data() as Memory;
        }
      } catch (err) {}
    }
    return localMemories.get(id) || null;
  },

  async getAll(userId: string, filters?: { status?: string; memory_type?: string; location?: string; search?: string }): Promise<Memory[]> {
    const firestore = getAdminFirestore();
    let results: Memory[] = [];

    if (firestore) {
      try {
        let query: any = firestore.collection('memories').where('user_id', '==', userId);

        if (filters?.status) {
          query = query.where('status', '==', filters.status);
        }
        if (filters?.memory_type) {
          query = query.where('memory_type', '==', filters.memory_type);
        }

        const snapshot = await query.orderBy('created_at', 'desc').get();
        snapshot.forEach((doc: any) => {
          results.push(doc.data() as Memory);
        });
      } catch (err) {
        results = Array.from(localMemories.values()).filter(m => m.user_id === userId);
      }
    } else {
      results = Array.from(localMemories.values()).filter(m => m.user_id === userId);
    }

    return results.filter(m => {
      if (filters?.status && m.status !== filters.status) return false;
      if (filters?.memory_type && m.memory_type !== filters.memory_type) return false;
      if (filters?.location && (!m.location || !m.location.toLowerCase().includes(filters.location.toLowerCase()))) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const text = `${m.original_text} ${m.object || ''} ${m.location || ''} ${m.task || ''} ${m.person || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateStatus(id: string, status: MemoryStatus): Promise<Memory | null> {
    const now = new Date().toISOString();
    const existing = await firestoreRepo.getById(id);
    if (!existing) return null;

    existing.status = status;
    existing.updated_at = now;
    localMemories.set(id, existing);

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('memories').doc(id).update({ status, updated_at: now });
      } catch (err) {}
    }

    return existing;
  },

  async update(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const existing = await firestoreRepo.getById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    localMemories.set(id, merged);

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('memories').doc(id).update(updates);
      } catch (err) {}
    }

    return merged;
  },

  async delete(id: string): Promise<boolean> {
    localMemories.delete(id);
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('memories').doc(id).delete();
      } catch (err) {}
    }
    return true;
  },

  async getActiveBelongingsAtLocation(userId: string, location: string): Promise<Memory[]> {
    const all = await firestoreRepo.getAll(userId);
    const locLower = location.trim().toLowerCase();

    return all.filter(m => {
      if (m.memory_type !== 'belonging') return false;
      if (m.status === 'retrieved' || m.status === 'completed' || m.status === 'archived') return false;
      return m.location && m.location.toLowerCase().includes(locLower);
    }).sort((a, b) => {
      const riskRank: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
      return (riskRank[a.risk_level] || 4) - (riskRank[b.risk_level] || 4);
    });
  },

  async getAllActiveBelongings(userId: string): Promise<Memory[]> {
    const all = await firestoreRepo.getAll(userId);
    return all.filter(m => {
      if (m.memory_type !== 'belonging' && m.memory_type !== 'document') return false;
      if (m.status === 'retrieved' || m.status === 'completed' || m.status === 'archived') return false;
      return true;
    });
  },

  async createAlert(alertData: {
    user_id: string;
    memory_id: string;
    trigger_type: 'location_departure' | 'geofence_departure' | 'time_reminder' | 'context_change';
    title: string;
    message: string;
    severity: RiskLevel;
    distance_meters?: number;
  }): Promise<ProactiveAlert> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const memory = (await firestoreRepo.getById(alertData.memory_id))!;

    const alertDoc: ProactiveAlert = {
      id,
      user_id: alertData.user_id,
      memory_id: alertData.memory_id,
      memory,
      trigger_type: alertData.trigger_type,
      title: alertData.title,
      message: alertData.message,
      severity: alertData.severity,
      distance_meters: alertData.distance_meters,
      created_at: now,
      is_dismissed: false,
    };

    localAlerts.set(id, alertDoc);

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('alerts').doc(id).set(alertDoc);
      } catch (err) {}
    }

    return alertDoc;
  },

  async getActiveAlerts(userId: string): Promise<ProactiveAlert[]> {
    const firestore = getAdminFirestore();
    let alerts: ProactiveAlert[] = [];

    if (firestore) {
      try {
        const snapshot = await firestore.collection('alerts')
          .where('user_id', '==', userId)
          .where('is_dismissed', '==', false)
          .orderBy('created_at', 'desc')
          .get();

        snapshot.forEach((doc: any) => {
          alerts.push(doc.data() as ProactiveAlert);
        });
      } catch (err) {
        alerts = Array.from(localAlerts.values()).filter(a => a.user_id === userId && !a.is_dismissed);
      }
    } else {
      alerts = Array.from(localAlerts.values()).filter(a => a.user_id === userId && !a.is_dismissed);
    }

    return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getAlertById(id: string): Promise<ProactiveAlert | null> {
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        const doc = await firestore.collection('alerts').doc(id).get();
        if (doc.exists) {
          return doc.data() as ProactiveAlert;
        }
      } catch (err) {}
    }
    return localAlerts.get(id) || null;
  },

  async dismissAlert(id: string): Promise<boolean> {
    const alert = localAlerts.get(id);
    if (alert) {
      alert.is_dismissed = true;
      localAlerts.set(id, alert);
    }

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('alerts').doc(id).update({ is_dismissed: true });
      } catch (err) {}
    }
    return true;
  },

  async getUserLocation(userId: string): Promise<UserLocationState> {
    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        const doc = await firestore.collection('user_state').doc(userId).get();
        if (doc.exists) {
          const data = doc.data();
          return {
            current_location: data?.current_location || 'Conference Room',
            previous_location: data?.previous_location || 'Office',
            latitude: data?.latitude || 37.7749,
            longitude: data?.longitude || -122.4194,
            accuracy: data?.accuracy || 10,
            updated_at: data?.updated_at || new Date().toISOString(),
          };
        }
      } catch (err) {}
    }

    const state = localUserStates.get(userId);
    return state || {
      current_location: 'Conference Room',
      previous_location: 'Office',
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      updated_at: new Date().toISOString(),
    };
  },

  async updateUserLocation(userId: string, current: string, previous?: string, lat?: number, lon?: number, accuracy?: number): Promise<void> {
    const existing = await firestoreRepo.getUserLocation(userId);
    const prev = previous || existing.current_location;
    const latitude = lat !== undefined ? lat : existing.latitude;
    const longitude = lon !== undefined ? lon : existing.longitude;
    const now = new Date().toISOString();

    const stateData: UserLocationState = {
      current_location: current,
      previous_location: prev,
      latitude,
      longitude,
      accuracy: accuracy !== undefined ? accuracy : existing.accuracy,
      updated_at: now,
    };

    localUserStates.set(userId, stateData);

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection('user_state').doc(userId).set(stateData, { merge: true });
      } catch (err) {}
    }
  },

  async getStats(userId: string): Promise<AppStats> {
    const [memories, alerts, loc] = await Promise.all([
      firestoreRepo.getAll(userId),
      firestoreRepo.getActiveAlerts(userId),
      firestoreRepo.getUserLocation(userId),
    ]);

    const belongings = memories.filter(m => m.memory_type === 'belonging' && m.status === 'active').length;
    const forgotten = memories.filter(m => m.status === 'potentially_forgotten').length;
    const tasks = memories.filter(m => m.memory_type === 'task' && m.status !== 'completed').length;

    return {
      total_memories: memories.length,
      active_belongings: belongings,
      potentially_forgotten: forgotten,
      pending_tasks: tasks,
      current_location: loc.current_location,
      current_latitude: loc.latitude,
      current_longitude: loc.longitude,
    };
  },

  async clearUserData(userId: string): Promise<void> {
    for (const [id, m] of localMemories.entries()) {
      if (m.user_id === userId) localMemories.delete(id);
    }
    for (const [id, a] of localAlerts.entries()) {
      if (a.user_id === userId) localAlerts.delete(id);
    }
    localUserStates.set(userId, {
      current_location: 'Conference Room',
      previous_location: 'Office',
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      updated_at: new Date().toISOString(),
    });

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        const batch = firestore.batch();
        const memDocs = await firestore.collection('memories').where('user_id', '==', userId).get();
        memDocs.forEach((d: any) => batch.delete(d.ref));

        const alertDocs = await firestore.collection('alerts').where('user_id', '==', userId).get();
        alertDocs.forEach((d: any) => batch.delete(d.ref));

        await batch.commit();
      } catch (err) {}
    }
  }
};

export const memoryRepo = firestoreRepo;
