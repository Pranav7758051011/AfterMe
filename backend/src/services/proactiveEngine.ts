import { firestoreRepo, Memory, ProactiveAlert, RiskLevel } from '../database/firestoreRepo';
import { getAdminMessaging, getAdminFirestore } from '../database/firebaseAdmin';

// Standard campus coordinates for instant offline/map visualization
export const KNOWN_PLACE_COORDINATES: Record<string, { lat: number; lng: number; radius: number }> = {
  'conference room': { lat: 37.7749, lng: -122.4194, radius: 60 },
  'office desk': { lat: 37.7762, lng: -122.4178, radius: 60 },
  'office': { lat: 37.7762, lng: -122.4178, radius: 60 },
  'library': { lat: 37.7732, lng: -122.4212, radius: 75 },
  'cafeteria': { lat: 37.7756, lng: -122.4208, radius: 60 },
  'home': { lat: 37.7812, lng: -122.4085, radius: 100 },
  'airport': { lat: 37.6213, lng: -122.3790, radius: 250 },
};

/**
 * In-Memory Geofence State & Deduplication Tracker
 * Tracks whether the user is currently 'inside' or 'outside' each item's safety geofence
 * to prevent duplicate spam alerts while outside, and gracefully re-arm upon re-entry.
 */
interface GeofenceTrackingRecord {
  state: 'inside' | 'outside';
  last_alerted_at?: number;
  alerted_for_current_departure: boolean;
}

const geofenceStateTracker = new Map<string, GeofenceTrackingRecord>();

function getTrackingKey(userId: string, memoryId: string): string {
  return `${userId}::${memoryId}`;
}

export function resetGeofenceTrackerForUser(userId: string): void {
  for (const key of geofenceStateTracker.keys()) {
    if (key.startsWith(`${userId}::`)) {
      geofenceStateTracker.delete(key);
    }
  }
}

/**
 * Coordinate Validation Helper
 * Ensures coordinates are valid finite numbers within WGS-84 ranges:
 * Latitude: [-90, +90]
 * Longitude: [-180, +180]
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Great-Circle Distance Calculation using the Haversine Formula
 * R = 6,371,000 meters
 */
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error(`Invalid geographic coordinate input: (${lat1}, ${lon1}) to (${lat2}, ${lon2})`);
  }

  const R = 6371e3; // Mean Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function getCoordinatesForPlace(placeName: string): { lat: number; lng: number; radius: number } {
  const lower = (placeName || '').trim().toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_PLACE_COORDINATES)) {
    if (lower.includes(key)) return coords;
  }
  // Default to central campus location
  return { lat: 37.7749, lng: -122.4194, radius: 75 };
}

export interface ItemGeofenceStatus {
  memory_id: string;
  object: string;
  location: string;
  distance_meters: number;
  is_outside_geofence: boolean;
  risk_level: RiskLevel;
}

export interface LocationEvaluationResult {
  previous_location: string;
  current_location: string;
  latitude?: number;
  longitude?: number;
  items_status?: ItemGeofenceStatus[];
  alerts: ProactiveAlert[];
  items_at_risk: Memory[];
  message: string;
  fcm_dispatched?: boolean;
  accuracy_quality?: 'high' | 'medium' | 'degraded_suppressed';
}

export const proactiveEngine = {
  resetUserTracker(userId: string) {
    resetGeofenceTrackerForUser(userId);
  },

  /**
   * Handle Location Departure by Place Name
   */
  async handleLocationChange(userId: string, previousLocation: string, currentLocation: string): Promise<LocationEvaluationResult> {
    const prev = (previousLocation || '').trim();
    const curr = (currentLocation || '').trim();
    const coords = getCoordinatesForPlace(curr);

    // Update location state in Firestore
    await firestoreRepo.updateUserLocation(userId, curr, prev, coords.lat, coords.lng);

    if (prev.toLowerCase() === curr.toLowerCase()) {
      const currentAlerts = await firestoreRepo.getActiveAlerts(userId);
      return {
        previous_location: prev,
        current_location: curr,
        latitude: coords.lat,
        longitude: coords.lng,
        alerts: currentAlerts,
        items_at_risk: [],
        message: 'Location unchanged. No new alerts.',
      };
    }

    const belongingsLeftBehind = await firestoreRepo.getActiveBelongingsAtLocation(userId, prev);
    const newAlerts: ProactiveAlert[] = [];
    const existingAlerts = await firestoreRepo.getActiveAlerts(userId);

    for (const memory of belongingsLeftBehind) {
      if (memory.status !== 'retrieved' && memory.status !== 'completed' && memory.status !== 'archived') {
        await firestoreRepo.updateStatus(memory.id, 'potentially_forgotten');

        const trackKey = getTrackingKey(userId, memory.id);
        const tracker = geofenceStateTracker.get(trackKey);
        const alreadyAlerted = existingAlerts.some(a => a.memory_id === memory.id && !a.is_dismissed);

        if (!alreadyAlerted && (!tracker || !tracker.alerted_for_current_departure)) {
          const alert = await firestoreRepo.createAlert({
            user_id: userId,
            memory_id: memory.id,
            trigger_type: 'location_departure',
            title: '🚨 You may have forgotten something',
            message: `You mentioned leaving your ${memory.object || 'item'} in the ${prev}.`,
            severity: memory.risk_level as RiskLevel,
          });
          newAlerts.push(alert);

          geofenceStateTracker.set(trackKey, {
            state: 'outside',
            last_alerted_at: Date.now(),
            alerted_for_current_departure: true,
          });
        }
      }
    }

    // FCM push notification dispatch
    let fcmDispatched = false;
    const messaging = getAdminMessaging();
    if (messaging && newAlerts.length > 0) {
      try {
        const firestore = getAdminFirestore();
        if (firestore) {
          const userDoc = await firestore.collection('users').doc(userId).get();
          const fcmToken = userDoc.data()?.fcm_token;
          if (fcmToken) {
            await messaging.send({
              token: fcmToken,
              notification: {
                title: newAlerts[0].title,
                body: newAlerts[0].message,
              },
              data: {
                memoryId: newAlerts[0].memory_id,
                severity: newAlerts[0].severity,
                type: 'location_departure',
              }
            });
            fcmDispatched = true;
          }
        }
      } catch (err: any) {
        console.warn('FCM dispatch notice:', err?.message || err);
      }
    }

    const allActiveAlerts = await firestoreRepo.getActiveAlerts(userId);

    return {
      previous_location: prev,
      current_location: curr,
      latitude: coords.lat,
      longitude: coords.lng,
      alerts: allActiveAlerts,
      items_at_risk: belongingsLeftBehind,
      message: newAlerts.length > 0
        ? `🚨 Departure detected: Left ${prev}. Identified ${newAlerts.length} item(s) potentially left behind!`
        : `Location changed to ${curr}. No unattended high-risk items detected in ${prev}.`,
      fcm_dispatched: fcmDispatched,
    };
  },

  /**
   * Handle Real-Time GPS Location Update with State-Tracking Geofence Protection,
   * Re-entry/Re-exit Handling, and Notification Cooldown Deduplication.
   */
  async handleGPSLocationUpdate(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy: number = 10,
    placeName?: string
  ): Promise<LocationEvaluationResult> {
    if (!isValidCoordinate(latitude, longitude)) {
      throw new Error(`Invalid GPS coordinates provided: lat=${latitude}, lng=${longitude}`);
    }

    const existingState = await firestoreRepo.getUserLocation(userId);
    const resolvedPlace = placeName || existingState.current_location;

    // GPS Accuracy Filtering
    const isAccuracyDegraded = accuracy > 150;
    const accuracyQuality = isAccuracyDegraded ? 'degraded_suppressed' : (accuracy > 50 ? 'medium' : 'high');

    // Save GPS coords to Firestore
    await firestoreRepo.updateUserLocation(userId, resolvedPlace, existingState.previous_location, latitude, longitude, accuracy);

    const existingAlerts = await firestoreRepo.getActiveAlerts(userId);

    if (isAccuracyDegraded) {
      return {
        previous_location: existingState.previous_location,
        current_location: resolvedPlace,
        latitude,
        longitude,
        alerts: existingAlerts,
        items_at_risk: [],
        message: `GPS accuracy degraded (±${accuracy}m > 150m threshold). Suppressing geofence evaluation until satellite lock improves.`,
        accuracy_quality: 'degraded_suppressed',
      };
    }

    // Fetch all active belongings
    const activeBelongings = await firestoreRepo.getAllActiveBelongings(userId);
    const itemsStatus: ItemGeofenceStatus[] = [];
    const newAlerts: ProactiveAlert[] = [];

    for (const memory of activeBelongings) {
      // Ignored if user already marked it as retrieved or completed
      if (memory.status === 'retrieved' || memory.status === 'completed' || memory.status === 'archived') {
        continue;
      }

      // Determine coordinates of where the item was left
      let itemLat = memory.latitude;
      let itemLng = memory.longitude;
      let geofenceRadius = memory.radius || 60; // 60m standard campus safety zone

      if ((itemLat === null || itemLat === undefined) && memory.location) {
        const coords = getCoordinatesForPlace(memory.location);
        itemLat = coords.lat;
        itemLng = coords.lng;
        geofenceRadius = coords.radius;
      }

      if (itemLat !== null && itemLat !== undefined && itemLng !== null && itemLng !== undefined) {
        if (isValidCoordinate(itemLat, itemLng)) {
          const distance = getDistanceInMeters(latitude, longitude, itemLat, itemLng);
          
          // Boundary evaluation: distance > radius is outside; distance <= radius is safe inside
          const isOutside = distance > geofenceRadius;
          const trackKey = getTrackingKey(userId, memory.id);
          const currentTracker = geofenceStateTracker.get(trackKey);

          itemsStatus.push({
            memory_id: memory.id,
            object: memory.object || memory.original_text,
            location: memory.location || 'Unknown Location',
            distance_meters: distance,
            is_outside_geofence: isOutside,
            risk_level: memory.risk_level,
          });

          if (!isOutside) {
            // ─── RE-ENTRY DETECTED: User returned inside geofence ─────
            // Reset the departure alert trigger so future exits can notify again!
            geofenceStateTracker.set(trackKey, {
              state: 'inside',
              alerted_for_current_departure: false,
            });
          } else {
            // ─── DEPARTURE DETECTED: User is outside geofence ─────────
            const isHighRisk = memory.risk_level === 'high' || memory.risk_level === 'critical' || memory.status === 'potentially_forgotten';
            
            if (isHighRisk) {
              await firestoreRepo.updateStatus(memory.id, 'potentially_forgotten');

              const hasActiveAlertInDb = existingAlerts.some(a => a.memory_id === memory.id && !a.is_dismissed);
              const alreadyAlertedForExit = currentTracker?.alerted_for_current_departure === true;
              const cooldownExpired = currentTracker?.last_alerted_at
                ? (Date.now() - currentTracker.last_alerted_at > 15 * 60 * 1000)
                : true;

              // Trigger alert ONLY IF we have not already alerted for this departure session,
              // or cooldown has expired and no duplicate active alert is pending.
              if (!hasActiveAlertInDb && (!alreadyAlertedForExit || cooldownExpired)) {
                const alert = await firestoreRepo.createAlert({
                  user_id: userId,
                  memory_id: memory.id,
                  trigger_type: 'geofence_departure',
                  title: '🚨 Geofence Departure Detected',
                  message: `You are ${distance}m away from ${memory.location || 'your last location'}. You mentioned leaving your ${memory.object || 'item'} behind.`,
                  severity: memory.risk_level,
                  distance_meters: distance,
                });
                newAlerts.push(alert);

                geofenceStateTracker.set(trackKey, {
                  state: 'outside',
                  last_alerted_at: Date.now(),
                  alerted_for_current_departure: true,
                });
              } else {
                // Ensure tracker state remains marked as outside
                if (!currentTracker) {
                  geofenceStateTracker.set(trackKey, {
                    state: 'outside',
                    last_alerted_at: Date.now(),
                    alerted_for_current_departure: true,
                  });
                }
              }
            }
          }
        }
      }
    }

    const allActiveAlerts = await firestoreRepo.getActiveAlerts(userId);

    const message = newAlerts.length > 0
      ? `🚨 Geofence Departure: ${newAlerts.length} item(s) are outside your current GPS safety radius!`
      : `GPS Updated (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). All belongings within safety distance.`;

    return {
      previous_location: existingState.previous_location,
      current_location: resolvedPlace,
      latitude,
      longitude,
      items_status: itemsStatus,
      alerts: allActiveAlerts,
      items_at_risk: activeBelongings.filter(b => itemsStatus.find(s => s.memory_id === b.id)?.is_outside_geofence),
      message,
      accuracy_quality: accuracyQuality,
    };
  }
};
