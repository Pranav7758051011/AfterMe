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

export interface CreateMemoryRequest {
  text: string;
  user_id?: string;
  current_location?: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  image_base64?: string;
}

export interface MemoryExtractionResult {
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
  image_url?: string | null;
  summary: string;
  confidence: number;
  reasoning?: string;
}

export interface AskRequest {
  question: string;
  user_id?: string;
  current_location?: string;
  latitude?: number;
  longitude?: number;
}

export interface AskResponse {
  answer: string;
  relevant_memories: Memory[];
  has_match: boolean;
  confidence: number;
  follow_up_hint?: string;
}

export interface LocationChangeRequest {
  user_id?: string;
  previous_location: string;
  current_location: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationGPSRequest {
  user_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  place_name?: string;
}

export interface ItemGeofenceStatus {
  memory_id: string;
  object: string;
  location: string;
  distance_meters: number;
  is_outside_geofence: boolean;
  risk_level: RiskLevel;
}

export interface LocationGPSResponse {
  current_location: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  items_status: ItemGeofenceStatus[];
  alerts: ProactiveAlert[];
  message: string;
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

export interface LocationChangeResponse {
  previous_location: string;
  current_location: string;
  alerts: ProactiveAlert[];
  message: string;
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
