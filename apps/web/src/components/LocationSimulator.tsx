import React, { useState } from 'react';
import { MapPin, Navigation, ArrowRight, Radio, AlertTriangle, Map, Satellite, Sparkles, Footprints, Car, RotateCcw } from 'lucide-react';
import { LocationMap } from './LocationMap';
import { Memory } from '../types';

export interface KnownPlace {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  radius: number;
}

export const KNOWN_PLACES: KnownPlace[] = [
  { id: 'conf_room', name: 'Conference Room', icon: '🏢', lat: 37.7749, lng: -122.4194, radius: 60 },
  { id: 'office_desk', name: 'Office Desk', icon: '💻', lat: 37.7762, lng: -122.4178, radius: 60 },
  { id: 'cafeteria', name: 'Cafeteria', icon: '☕', lat: 37.7756, lng: -122.4208, radius: 60 },
  { id: 'library', name: 'Library', icon: '📚', lat: 37.7732, lng: -122.4212, radius: 75 },
  { id: 'home', name: 'Home', icon: '🏠', lat: 37.7812, lng: -122.4085, radius: 100 },
];

// Distance helper
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

interface LocationSimulatorProps {
  currentLocation: string;
  previousLocation: string;
  userLatitude?: number;
  userLongitude?: number;
  userAccuracy?: number;
  isLiveTracking?: boolean;
  memories?: Memory[];
  highlightedLocation?: { lat: number; lng: number; name: string; label?: string; memoryId?: string } | null;
  onSimulateDeparture: (newLocation: string) => void;
  onGPSLocationChange?: (lat: number, lng: number, accuracy?: number, placeName?: string) => void;
  onToggleLiveTracking?: () => void;
  onMarkRetrieved?: (memoryId: string) => void;
  onClearHighlight?: () => void;
  isLoading: boolean;
}

export const LocationSimulator: React.FC<LocationSimulatorProps> = ({
  currentLocation,
  previousLocation,
  userLatitude = 37.7749,
  userLongitude = -122.4194,
  userAccuracy = 10,
  isLiveTracking = false,
  memories = [],
  highlightedLocation,
  onSimulateDeparture,
  onGPSLocationChange,
  onToggleLiveTracking,
  onMarkRetrieved,
  onClearHighlight,
  isLoading,
}) => {
  const [showMap, setShowMap] = useState(true);

  // Clean location name for display in button
  const cleanCurrentPlace = currentLocation.split('(')[0].trim() || 'Current Place';

  // 1. Move to a preset known place
  const handlePlaceSelect = (place: KnownPlace) => {
    if (onGPSLocationChange) {
      onGPSLocationChange(place.lat, place.lng, place.radius, place.name);
    }
    onSimulateDeparture(place.name);
  };

  // 2. Custom map click location
  const handleCustomMapSelect = (placeName: string, lat: number, lng: number) => {
    if (onGPSLocationChange) {
      onGPSLocationChange(lat, lng, 50, placeName);
    }
    onSimulateDeparture(placeName);
  };

  // 3. Dynamic GPS Departure: Steps N meters away from the current GPS location
  const handleGPSStepAway = (distanceMeters: number, modeLabel: string) => {
    // 1 deg latitude ≈ 111,000 meters
    const latOffset = (distanceMeters / 111000) * 0.707;
    const lngOffset = ((distanceMeters / 111000) / Math.cos((userLatitude * Math.PI) / 180)) * 0.707;

    const newLat = userLatitude + latOffset;
    const newLng = userLongitude + lngOffset;
    const newPlaceName = `Departed ${cleanCurrentPlace} (${distanceMeters}m away)`;

    if (onGPSLocationChange) {
      onGPSLocationChange(newLat, newLng, 10, newPlaceName);
    }
    onSimulateDeparture(newPlaceName);
  };

  // 4. Return to center of current/closest known place
  const handleReturnToCenter = () => {
    const matched = KNOWN_PLACES.find(p => cleanCurrentPlace.toLowerCase().includes(p.name.toLowerCase())) || KNOWN_PLACES[0];
    handlePlaceSelect(matched);
  };

  return (
    <div className="location-bar">
      <div className="location-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="location-pulse" style={{ background: isLiveTracking ? '#10b981' : 'var(--accent-primary)' }}>
            {isLiveTracking ? <Satellite size={16} color="#ffffff" className="animate-spin" /> : <MapPin size={16} color="#ffffff" />}
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isLiveTracking ? '🛰️ Live GPS Auto-Tracking Active' : '📍 Current GPS & Geofence Location'}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>{currentLocation}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                GPS: {userLatitude.toFixed(4)}, {userLongitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Live GPS & Map Toggle Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onToggleLiveTracking && (
            <button
              className={`btn btn-sm ${isLiveTracking ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onToggleLiveTracking}
              title="Automatically detect your real-time physical GPS location"
              style={{
                borderColor: isLiveTracking ? '#10b981' : 'var(--border-subtle)',
                background: isLiveTracking ? 'rgba(16, 185, 129, 0.2)' : undefined,
                color: isLiveTracking ? '#34d399' : undefined,
              }}
            >
              <Satellite size={14} />
              <span>{isLiveTracking ? 'GPS Tracking ON' : 'Auto-Detect GPS'}</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowMap(!showMap)}
            title="Toggle Interactive Google Map & Radar View"
          >
            <Map size={14} />
            <span>{showMap ? 'Hide Map' : 'Show Map & Radar'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Map & Radar View */}
      {showMap && (
        <div style={{ marginTop: '14px', marginBottom: '8px', animation: 'fadeIn 0.25s ease' }}>
          <LocationMap
            userLatitude={userLatitude}
            userLongitude={userLongitude}
            userAccuracy={userAccuracy}
            currentLocationName={currentLocation}
            memories={memories}
            isLiveTracking={isLiveTracking}
            highlightedLocation={highlightedLocation}
            onSelectLocation={handleCustomMapSelect}
            onMarkRetrieved={onMarkRetrieved}
            onClearHighlight={onClearHighlight}
          />
        </div>
      )}

      {/* Dynamic Departure Simulator Controls (Adapts to current GPS position) */}
      <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Footprints size={15} color="var(--accent-primary)" />
            <span>Simulate Departure from {cleanCurrentPlace}:</span>
          </span>

          {/* Primary Dynamic Departure Button */}
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleGPSStepAway(150, 'Departed')}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              fontWeight: 700,
              fontSize: '0.82rem',
              boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
              border: 'none',
              padding: '8px 16px',
            }}
          >
            🚨 [ Leave {cleanCurrentPlace} (Move 150m Away) ]
          </button>
        </div>

        {/* GPS Movement Steppers */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleGPSStepAway(100, 'Walked 100m')}
            disabled={isLoading}
            title="Step 100 meters away in GPS coordinates (triggers geofence alert)"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Footprints size={13} color="#fbbf24" />
            <span>Walk 100m Away</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleGPSStepAway(500, 'Drove 500m')}
            disabled={isLoading}
            title="Move 500 meters away (driving/transit)"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Car size={13} color="#38bdf8" />
            <span>Drive 500m Away</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleReturnToCenter}
            disabled={isLoading}
            title="Return back inside the geofence"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <RotateCcw size={13} color="#34d399" />
            <span>Return Inside Geofence</span>
          </button>
        </div>

        {/* Preset Geofenced Places with Live Distances */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
          Or Teleport GPS to Specific Geofenced Place:
        </div>
        <div className="location-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {KNOWN_PLACES.map((place) => {
            const distFromUser = calculateDistanceInMeters(userLatitude, userLongitude, place.lat, place.lng);
            const isCurrent = distFromUser <= (place.radius || 60);

            return (
              <button
                key={place.id}
                className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePlaceSelect(place)}
                disabled={isLoading || isCurrent}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  opacity: isCurrent ? 1 : 0.85,
                  borderColor: isCurrent ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <span>{place.icon} {place.name}</span>
                <span style={{ fontSize: '0.7rem', color: isCurrent ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {isCurrent ? ' (Here)' : ` (${distFromUser}m)`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
