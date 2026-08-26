import { Memory, ProactiveAlert, AppStats, AskResponse } from '../types';

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

export const api = {
  async getMemories(filters?: { status?: string; memory_type?: string; search?: string }): Promise<Memory[]> {
    const params = new URLSearchParams();
    params.append('user_id', currentUserId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.memory_type) params.append('memory_type', filters.memory_type);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/memories?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch memories');
    const data = await res.json();
    return data.memories || [];
  },

  async createMemory(
    text: string,
    currentLocation?: string,
    options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number }
  ): Promise<{ memory: Memory; extraction: any }> {
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
    if (!res.ok) throw new Error('Failed to create memory');
    return res.json();
  },

  async updateMemoryStatus(id: string, status: string): Promise<Memory> {
    const res = await fetch(`${API_BASE}/memories/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, user_id: currentUserId }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    const data = await res.json();
    return data.memory;
  },

  async deleteMemory(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/memories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete memory');
    return true;
  },

  async getStats(): Promise<AppStats> {
    const res = await fetch(`${API_BASE}/memories/stats?user_id=${currentUserId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getLocation(): Promise<{ current_location: string; previous_location: string }> {
    const res = await fetch(`${API_BASE}/location?user_id=${currentUserId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch location');
    return res.json();
  },

  async changeLocation(newLocation: string, prevLocation?: string): Promise<{ alerts: ProactiveAlert[]; message: string; current_location: string }> {
    const res = await fetch(`${API_BASE}/location/change`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ current_location: newLocation, previous_location: prevLocation, user_id: currentUserId }),
    });
    if (!res.ok) throw new Error('Failed to change location');
    return res.json();
  },

  async sendGPSLocation(latitude: number, longitude: number, accuracy?: number, placeName?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/location/gps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ latitude, longitude, accuracy, place_name: placeName, user_id: currentUserId }),
    });
    if (!res.ok) throw new Error('Failed to send GPS location');
    return res.json();
  },

  async getAlerts(): Promise<ProactiveAlert[]> {
    const res = await fetch(`${API_BASE}/location/alerts?user_id=${currentUserId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch alerts');
    const data = await res.json();
    return data.alerts || [];
  },

  async dismissAlert(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/location/alerts/${id}/dismiss`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to dismiss alert');
    return true;
  },

  async askAfterMe(question: string, currentLocation?: string): Promise<AskResponse> {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ question, current_location: currentLocation, user_id: currentUserId }),
    });
    if (!res.ok) throw new Error('Failed to query memories');
    return res.json();
  },

  // Auth info
  async getAuthProfile(): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch auth info');
    return res.json();
  },

  // Demo helpers
  async seedGoldenDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/seed-golden`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: currentUserId }),
    });
    return res.json();
  },

  async seedFullDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/seed-full`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: currentUserId }),
    });
    return res.json();
  },

  async resetDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/reset`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ user_id: currentUserId }),
    });
    return res.json();
  },
};
