import React, { useState, useEffect } from 'react';
import { 
  MapPin, Navigation, Crosshair, Sparkles, Satellite, Compass, 
  Target, Car, AlertTriangle, ShieldCheck, Layers, Eye, Moon, Sun, Globe,
  Search, Check, Plus, RefreshCw, ExternalLink, Zap
} from 'lucide-react';
import { Memory } from '../types';
import { KNOWN_PLACES } from './LocationSimulator';

export interface HighlightedLocation {
  lat: number;
  lng: number;
  name: string;
  label?: string;
  memoryId?: string;
}

interface LocationMapProps {
  userLatitude: number;
  userLongitude: number;
  userAccuracy?: number;
  currentLocationName: string;
  memories: Memory[];
  isLiveTracking: boolean;
  highlightedLocation?: HighlightedLocation | null;
  onSelectLocation?: (placeName: string, lat: number, lng: number) => void;
  onAddMemoryAtLocation?: (placeName: string, lat: number, lng: number) => void;
  onMarkRetrieved?: (memoryId: string) => void;
  onClearHighlight?: () => void;
  onRequestFreshGPS?: () => Promise<{ lat: number; lng: number; name: string } | null>;
}

export type RealMapEngineMode = 'satellite' | 'google_streets' | 'osm';

export const LocationMap: React.FC<LocationMapProps> = ({
  userLatitude,
  userLongitude,
  userAccuracy = 15,
  currentLocationName,
  memories = [],
  isLiveTracking,
  highlightedLocation,
  onSelectLocation,
  onAddMemoryAtLocation,
  onMarkRetrieved,
  onClearHighlight,
  onRequestFreshGPS,
}) => {
  const [mapMode, setMapMode] = useState<RealMapEngineMode>('satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeLat, setActiveLat] = useState(userLatitude || 18.9317);
  const [activeLng, setActiveLng] = useState(userLongitude || 73.1624);
  const [activeName, setActiveName] = useState(currentLocationName || 'Mumbai - Pune Expressway, Bhatan');
  const [zoomLevel, setZoomLevel] = useState(17);

  useEffect(() => {
    if (Number.isFinite(userLatitude) && userLatitude !== 0 && Number.isFinite(userLongitude) && userLongitude !== 0) {
      setActiveLat(userLatitude);
      setActiveLng(userLongitude);
      setActiveName(currentLocationName);
    }
  }, [userLatitude, userLongitude, currentLocationName]);

  // Center on real device GPS
  const handleCenterOnGPS = async () => {
    if (onRequestFreshGPS) {
      try {
        const fresh = await onRequestFreshGPS();
        if (fresh && Number.isFinite(fresh.lat) && Number.isFinite(fresh.lng)) {
          setActiveLat(fresh.lat);
          setActiveLng(fresh.lng);
          setActiveName(fresh.name);
          return;
        }
      } catch {}
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setActiveLat(pos.coords.latitude);
          setActiveLng(pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  };

  // Real Address Search Geocoding
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        const newName = first.display_name.split(',')[0];
        setActiveLat(newLat);
        setActiveLng(newLng);
        setActiveName(newName);
        if (onSelectLocation) {
          onSelectLocation(newName, newLat, newLng);
        }
      }
    } catch (err) {
      console.error('Search geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Calculate distance in meters to items
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Construct High-Definition Real-World Map Embed URLs
  // 1. Google Satellite Hybrid Real-World Map (Real Earth satellite imagery with street labels)
  const googleSatelliteUrl = `https://maps.google.com/maps?q=${activeLat},${activeLng}&t=k&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
  
  // 2. Google Streets Real-World Map (Real roads, highways, expressway networks)
  const googleStreetsUrl = `https://maps.google.com/maps?q=${activeLat},${activeLng}&t=m&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;

  // 3. OpenStreetMap Global Street Map
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${activeLng - 0.006}%2C${activeLat - 0.004}%2C${activeLng + 0.006}%2C${activeLat + 0.004}&layer=mapnik&marker=${activeLat}%2C${activeLng}`;

  const currentEmbedUrl = mapMode === 'satellite' 
    ? googleSatelliteUrl 
    : mapMode === 'google_streets' 
    ? googleStreetsUrl 
    : osmUrl;

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(79, 110, 247, 0.4)', background: '#080c14', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}>
      {/* Top Map Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(12, 17, 29, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Real-World Address & GPS Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4F6EF7, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(79, 110, 247, 0.6)',
            }}
          >
            <Satellite size={18} color="#ffffff" className={isLiveTracking ? 'animate-spin' : ''} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              🌍 REAL-WORLD SATELLITE & STREET MAP
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{activeName}</span>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                GPS: {activeLat.toFixed(4)}, {activeLng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Global Search & Layer Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Address Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '3px 6px 3px 10px' }}>
            <Search size={13} color="#94a3b8" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Search real street/city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.78rem', width: '160px' }}
            />
            <button type="submit" disabled={isSearching} className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
              {isSearching ? '...' : 'Go'}
            </button>
          </form>

          {/* 1-Click Layer Switcher */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              className={`btn btn-sm ${mapMode === 'satellite' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('satellite')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <Satellite size={12} />
              <span>🛰️ Satellite</span>
            </button>
            <button
              className={`btn btn-sm ${mapMode === 'google_streets' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('google_streets')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <Globe size={12} />
              <span>🌍 Streets</span>
            </button>
            <button
              className={`btn btn-sm ${mapMode === 'osm' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('osm')}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              <Layers size={12} />
              <span>🗺️ OSM</span>
            </button>
          </div>

          {/* Center on GPS FAB */}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCenterOnGPS}
            title="Center on Real Device GPS"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Navigation size={13} />
            <span>📍 My GPS</span>
          </button>
        </div>
      </div>

      {/* Real-World Interactive Map Viewport */}
      <div style={{ position: 'relative', width: '100%', height: '540px', background: '#0a0f1d' }}>
        <iframe
          key={`${mapMode}-${activeLat}-${activeLng}-${zoomLevel}`}
          title="Real World Map"
          src={currentEmbedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          loading="lazy"
        />

        {/* Live GPS Telemetry Overlay HUD (Bottom-Left) */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            zIndex: 10,
            background: 'rgba(12, 17, 29, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(79, 110, 247, 0.4)',
            borderRadius: '12px',
            padding: '10px 14px',
            maxWidth: '320px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} className="animate-pulse" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc' }}>
              📍 Real GPS Pinpoint ({activeLat.toFixed(5)}, {activeLng.toFixed(5)})
            </span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
            Showing real satellite terrain, roads, and buildings around <strong>{activeName}</strong>.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (onAddMemoryAtLocation) {
                  onAddMemoryAtLocation(activeName, activeLat, activeLng);
                }
              }}
              style={{ fontSize: '0.72rem', padding: '4px 10px', gap: '4px' }}
            >
              <Plus size={11} />
              <span>Save Item Here</span>
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem', padding: '4px 8px', gap: '4px', color: '#93c5fd' }}
            >
              <ExternalLink size={11} />
              <span>Full Maps</span>
            </a>
          </div>
        </div>

        {/* Nearby Saved Memory Items Floating Widget (Bottom-Right) */}
        {memories.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              zIndex: 10,
              background: 'rgba(12, 17, 29, 0.94)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '10px 14px',
              maxWidth: '280px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📦 Nearby Items ({memories.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
              {memories.slice(0, 3).map((m) => {
                const itemLat = m.latitude ?? activeLat;
                const itemLng = m.longitude ?? activeLng;
                const dist = calculateDistance(activeLat, activeLng, itemLat, itemLng);
                const isForgotten = m.status === 'potentially_forgotten';
                return (
                  <div
                    key={m.id}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: isForgotten ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc' }}>
                        {m.object || m.original_text.slice(0, 20)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: isForgotten ? '#f87171' : '#38bdf8' }}>
                        📍 {m.location || 'Current Spot'} · {dist}m away
                      </div>
                    </div>
                    {onMarkRetrieved && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onMarkRetrieved(m.id)}
                        style={{ padding: '2px 6px', fontSize: '0.65rem', color: '#34d399' }}
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
