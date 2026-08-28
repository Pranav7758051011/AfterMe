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
 * 
 * Mathematical Rationale:
 * Earth is an oblate spheroid, modeled here as a sphere with mean radius R = 6,371,000 meters.
 * Naive Euclidean distance (sqrt(dx^2 + dy^2)) assumes a flat 2D plane where 1 degree is constant.
 * However, on Earth:
 * - 1 degree of latitude is ~111 km everywhere.
 * - 1 degree of longitude scales by cos(latitude), shrinking from ~111 km at the equator to 0 at the poles.
 * At latitude 37.7° (San Francisco), 1° of longitude is only ~88 km.
 * Using Euclidean distance would distort circular geofences into squashed ellipses and cause severe false alarms.
 * 
 * Haversine Formula:
 * a = sin²(Δφ / 2) + cos(φ1) · cos(φ2) · sin²(Δλ / 2)
 * c = 2 · atan2(√a, √(1 − a))
 * d = R · c
 * 
 * @param lat1 Latitude of point 1 (in decimal degrees)
 * @param lon1 Longitude of point 1 (in decimal degrees)
 * @param lat2 Latitude of point 2 (in decimal degrees)
 * @param lon2 Longitude of point 2 (in decimal degrees)
 * @returns Geodesic distance in meters (rounded to nearest integer)
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

        const alreadyAlerted = existingAlerts.some(a => a.memory_id === memory.id && !a.is_dismissed);

        if (!alreadyAlerted) {
          const alert = await firestoreRepo.createAlert({
            user_id: userId,
            memory_id: memory.id,
            trigger_type: 'location_departure',
            title: '🚨 You may have forgotten something',
            message: `You mentioned leaving your ${memory.object || 'item'} in the ${prev}.`,
            severity: memory.risk_level as RiskLevel,
          });
          newAlerts.push(alert);
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
   * Handle Real-Time GPS Location Update with Strict Geofence Calculation,
   * GPS Accuracy Quality Filtering, and Coordinate Validation
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

    // ─── GPS Accuracy Filtering ─────────────────────────────────────
    // If accuracy is too degraded (e.g. > 150m), suppress geofence evaluation
    // to avoid false positive alarms while GPS acquires satellite lock.
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
          
          // Strict boundary evaluation: distance > radius triggers departure (radius itself is safe)
          const isOutside = distance > geofenceRadius;

          itemsStatus.push({
            memory_id: memory.id,
            object: memory.object || memory.original_text,
            location: memory.location || 'Unknown Location',
            distance_meters: distance,
            is_outside_geofence: isOutside,
            risk_level: memory.risk_level,
          });

          // If outside geofence and high/critical risk
          if (isOutside && (memory.risk_level === 'high' || memory.risk_level === 'critical' || memory.status === 'potentially_forgotten')) {
            await firestoreRepo.updateStatus(memory.id, 'potentially_forgotten');

            const alreadyAlerted = existingAlerts.some(a => a.memory_id === memory.id && !a.is_dismissed);
            if (!alreadyAlerted) {
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
