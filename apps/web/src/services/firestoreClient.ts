import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Memory, ProactiveAlert } from '../types';

export const cloudFirestore = {
  // Save or sync user profile directly into Cloud Firestore 'users' collection
  async syncUser(user: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    provider?: string;
  }): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userData = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        provider: user.provider || 'password',
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        role: 'user',
        status: 'active',
      };
      await setDoc(userRef, userData, { merge: true });
      console.log('🔥 [Cloud Firestore] User profile saved to Cloud Firestore users collection:', user.uid);
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore User Sync Warning]', err?.message || err);
    }
  },

  // Save memory directly into Cloud Firestore in project afterme-ai-app
  async saveMemory(memory: Memory): Promise<void> {
    try {
      const memoryRef = doc(firestore, 'memories', memory.id);
      // Clean undefined fields for Firestore compatibility
      const cleanData = JSON.parse(JSON.stringify(memory));
      await setDoc(memoryRef, cleanData, { merge: true });
      console.log('🔥 [Cloud Firestore] Memory saved to Cloud Firestore:', memory.id);
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore Write Warning]', err?.message || err);
    }
  },

  // Fetch memories directly from Cloud Firestore
  async getMemories(userId: string): Promise<Memory[]> {
    try {
      const memoriesRef = collection(firestore, 'memories');
      const q = query(memoriesRef, where('user_id', '==', userId));
      const snapshot = await getDocs(q);
      const memories: Memory[] = [];
      snapshot.forEach((docSnap) => {
        memories.push(docSnap.data() as Memory);
      });
      console.log(`🔥 [Cloud Firestore] Fetched ${memories.length} memories directly from Cloud Firestore.`);
      return memories;
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore Read Warning]', err?.message || err);
      return [];
    }
  },

  // Update memory status directly in Cloud Firestore
  async updateStatus(memoryId: string, status: string): Promise<void> {
    try {
      const memoryRef = doc(firestore, 'memories', memoryId);
      await updateDoc(memoryRef, { 
        status, 
        updated_at: new Date().toISOString() 
      });
      console.log(`🔥 [Cloud Firestore] Updated memory ${memoryId} status to ${status}`);
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore Update Warning]', err?.message || err);
    }
  },

  // Delete memory directly from Cloud Firestore
  async deleteMemory(memoryId: string): Promise<void> {
    try {
      const memoryRef = doc(firestore, 'memories', memoryId);
      await deleteDoc(memoryRef);
      console.log(`🔥 [Cloud Firestore] Deleted memory ${memoryId}`);
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore Delete Warning]', err?.message || err);
    }
  },

  // Save proactive alert directly into Cloud Firestore
  async saveAlert(alert: ProactiveAlert): Promise<void> {
    try {
      const alertRef = doc(firestore, 'alerts', alert.id);
      const cleanData = JSON.parse(JSON.stringify(alert));
      await setDoc(alertRef, cleanData, { merge: true });
      console.log('🔥 [Cloud Firestore] Proactive alert saved to Cloud Firestore:', alert.id);
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore Alert Write Warning]', err?.message || err);
    }
  },

  // Dismiss alert in Cloud Firestore
  async dismissAlert(alertId: string): Promise<void> {
    try {
      const alertRef = doc(firestore, 'alerts', alertId);
      await updateDoc(alertRef, { is_dismissed: true });
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore Alert Dismiss Warning]', err?.message || err);
    }
  },

  // Save live user GPS location state to Cloud Firestore
  async saveUserLocation(userId: string, location: string, lat: number, lng: number, accuracy = 10): Promise<void> {
    try {
      const userStateRef = doc(firestore, 'user_state', userId);
      await setDoc(userStateRef, {
        user_id: userId,
        current_location: location,
        latitude: lat,
        longitude: lng,
        accuracy,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      console.log(`🔥 [Cloud Firestore] User GPS state updated in Cloud Firestore for ${userId}`);
    } catch (err: any) {
      console.warn('⚠️ [Cloud Firestore User State Warning]', err?.message || err);
    }
  }
};
