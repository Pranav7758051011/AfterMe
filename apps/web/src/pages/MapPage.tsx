import React from 'react';
import { LocationSimulator } from '../components/LocationSimulator';
import { BeaconScannerWidget } from '../components/BeaconScannerWidget';
import { HighlightedLocation } from '../components/LocationMap';
import { Memory } from '../types';
import { MapPin, Radio, Compass, Shield } from 'lucide-react';

interface MapPageProps {
  currentLocation: string;
  previousLocation: string;
  userLatitude: number;
  userLongitude: number;
  userAccuracy: number;
  isLiveTracking: boolean;
  memories: Memory[];
  highlightedLocation: HighlightedLocation | null;
  onSimulateDeparture: (newLocation: string) => Promise<void>;
  onGPSLocationChange: (lat: number, lng: number, accuracy?: number, placeName?: string) => Promise<void>;
  onToggleLiveTracking: () => void;
  onMarkRetrieved: (id: string) => Promise<void>;
  onClearHighlight: () => void;
  onRequestFreshGPS: () => Promise<any>;
  onAddMemoryAtLocation: (placeName: string, lat: number, lng: number) => void;
  isLoading: boolean;
}

export const MapPage: React.FC<MapPageProps> = ({
  currentLocation,
  previousLocation,
  userLatitude,
  userLongitude,
  userAccuracy,
  isLiveTracking,
  memories,
  highlightedLocation,
  onSimulateDeparture,
  onGPSLocationChange,
  onToggleLiveTracking,
  onMarkRetrieved,
  onClearHighlight,
  onRequestFreshGPS,
  onAddMemoryAtLocation,
  isLoading,
}) => {
  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Spatial Radar & Geofencing Map
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0' }}>
            Real-time GPS tracking, 3D radar beacon pins, and departure perimeter safety
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '6px 14px',
            borderRadius: '12px',
            fontSize: '0.78rem',
            color: '#34d399',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} className="animate-pulse" />
          <span>ACCURACY: ±{Math.round(userAccuracy)}m</span>
        </div>
      </div>

      {/* Indoor Bluetooth Low Energy (BLE) Beacon Radar Widget */}
      <BeaconScannerWidget />

      {/* Interactive Map & Geofenced Location Simulator */}
      <LocationSimulator
        currentLocation={currentLocation}
        previousLocation={previousLocation}
        userLatitude={userLatitude}
        userLongitude={userLongitude}
        userAccuracy={userAccuracy}
        isLiveTracking={isLiveTracking}
        memories={memories}
        highlightedLocation={highlightedLocation}
        onSimulateDeparture={onSimulateDeparture}
        onGPSLocationChange={onGPSLocationChange}
        onToggleLiveTracking={onToggleLiveTracking}
        onMarkRetrieved={onMarkRetrieved}
        onClearHighlight={onClearHighlight}
        onRequestFreshGPS={onRequestFreshGPS}
        onAddMemoryAtLocation={onAddMemoryAtLocation}
        isLoading={isLoading}
      />
    </div>
  );
};
