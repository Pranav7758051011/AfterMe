import { Memory, ProactiveAlert, AskResponse } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

let mobileUserId = 'demo_user_001';

export const setMobileUserId = (id: string) => {
  mobileUserId = id;
};

export const getMobileUserId = () => mobileUserId;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-user-id': mobileUserId,
});

export const api = {
  async getMemories(filter?: string): Promise<Memory[]> {
    try {
      const url = filter
        ? `${API_BASE}/memories?status=${filter}&user_id=${mobileUserId}`
        : `${API_BASE}/memories?user_id=${mobileUserId}`;
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      return data.memories || [];
    } catch (e) {
      console.warn('API getMemories error:', e);
      return [];
    }
  },

  async createMemory(text: string, currentLocation?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/memories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, current_location: currentLocation, user_id: mobileUserId }),
    });
    return res.json();
  },

  async updateStatus(id: string, status: string): Promise<Memory> {
    const res = await fetch(`${API_BASE}/memories/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, user_id: mobileUserId }),
    });
    const data = await res.json();
    return data.memory;
  },

  async getAlerts(): Promise<ProactiveAlert[]> {
    try {
      const res = await fetch(`${API_BASE}/location/alerts?user_id=${mobileUserId}`, { headers: getHeaders() });
      const data = await res.json();
      return data.alerts || [];
    } catch (e) {
      return [];
    }
  },

  async dismissAlert(id: string): Promise<void> {
    await fetch(`${API_BASE}/location/alerts/${id}/dismiss`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: mobileUserId }),
    });
  },

  async getLocation(): Promise<{ current_location: string; previous_location: string; latitude?: number; longitude?: number }> {
    try {
      const res = await fetch(`${API_BASE}/location?user_id=${mobileUserId}`, { headers: getHeaders() });
      return res.json();
    } catch (e) {
      return { current_location: 'Conference Room', previous_location: 'Office', latitude: 37.7749, longitude: -122.4194 };
    }
  },

  async changeLocation(newLocation: string): Promise<any> {
    const res = await fetch(`${API_BASE}/location/change`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ current_location: newLocation, user_id: mobileUserId }),
    });
    return res.json();
  },

  async sendGPSLocation(latitude: number, longitude: number, accuracy?: number, placeName?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/location/gps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ latitude, longitude, accuracy, place_name: placeName, user_id: mobileUserId }),
    });
    return res.json();
  },

  async ask(question: string): Promise<AskResponse> {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ question, user_id: mobileUserId }),
    });
    return res.json();
  }
};
