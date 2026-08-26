import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { KNOWN_PLACES } from '../components/LocationSimulator';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  locationName: string | null;
  timestamp: number | null;
  error: string | null;
  isTracking: boolean;
  isSupported: boolean;
}

// Distance helper in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function useGeolocation(autoSyncWithBackend = true) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    locationName: null,
    timestamp: null,
    error: null,
    isTracking: false,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);
  const lastGeocodeRef = useRef<number>(0);

  // Reverse geocoding to resolve coordinates into human-readable place name
  const resolveLocationName = async (lat: number, lng: number): Promise<string> => {
    // 1. Check proximity to preset places (< 70m)
    for (const place of KNOWN_PLACES) {
      if (getDistance(lat, lng, place.lat, place.lng) <= (place.radius || 70)) {
        return place.name;
      }
    }

    // 2. Query reverse geocoding API
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        if (addr) {
          const building = addr.building || addr.amenity || addr.office;
          const road = addr.road || addr.street;
          const suburb = addr.suburb || addr.neighbourhood || addr.city || addr.town;

          if (building && road) return `${building}, ${road}`;
          if (road && suburb) return `${road}, ${suburb}`;
          if (data.display_name) {
            const parts = data.display_name.split(',');
            return parts.slice(0, 2).join(', ').trim();
          }
        }
      }
    } catch (e) {
      // Fallback
    }

    return `GPS Area (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  const syncCoordinatesToBackend = useCallback(async (lat: number, lng: number, acc?: number, placeName?: string) => {
    const now = Date.now();
    if (now - lastSyncRef.current < 2500) return;
    lastSyncRef.current = now;

    try {
      await api.sendGPSLocation(lat, lng, acc, placeName);
    } catch (e) {
      console.warn('Failed to sync GPS to backend:', e);
    }
  }, []);

  const handleSuccess = useCallback(
    async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;
      let placeName = state.locationName;

      // Geocode periodically or on first point
      const now = Date.now();
      if (!placeName || now - lastGeocodeRef.current > 10000) {
        lastGeocodeRef.current = now;
        placeName = await resolveLocationName(latitude, longitude);
      }

      setState((prev) => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        locationName: placeName,
        timestamp: position.timestamp,
        error: null,
      }));

      if (autoSyncWithBackend) {
        syncCoordinatesToBackend(latitude, longitude, accuracy, placeName || undefined);
      }
    },
    [autoSyncWithBackend, syncCoordinatesToBackend, state.locationName]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    let msg = 'Unable to retrieve location';
    if (error.code === error.PERMISSION_DENIED) msg = 'Location permission denied by user';
    else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location information is unavailable';
    else if (error.code === error.TIMEOUT) msg = 'Location request timed out';

    setState((prev) => ({
      ...prev,
      error: msg,
      isTracking: false,
    }));
  }, []);

  const startTracking = useCallback(() => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, error: 'Geolocation is not supported in this browser' }));
      return;
    }

    if (watchIdRef.current !== null) return;

    setState((prev) => ({ ...prev, isTracking: true, error: null }));

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1500,
    });
  }, [state.isSupported, handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    toggleTracking: () => (state.isTracking ? stopTracking() : startTracking()),
  };
}
