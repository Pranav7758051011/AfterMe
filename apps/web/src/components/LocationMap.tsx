import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Navigation, Crosshair, Sparkles, Satellite, Compass, 
  Target, Car, AlertTriangle, ShieldCheck, Layers, Eye, Moon, Sun, Globe,
  Search, Check, Plus, RefreshCw, ExternalLink
} from 'lucide-react';
import { Memory } from '../types';
import { KNOWN_PLACES } from './LocationSimulator';

// Fix Leaflet default icon paths in bundler environments
try {
  if (L?.Icon?.Default?.prototype) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
} catch (e) {
  console.warn('Leaflet icon override error:', e);
}

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

export type RealMapLayer = 'streets' | 'satellite' | 'dark';

// Ultra-Reliable Global Real-World Tile Providers
const TILE_URLS: Record<RealMapLayer, string> = {
  streets: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  satellite: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
};

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const distanceLinesLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<RealMapLayer>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const validLat = Number.isFinite(userLatitude) && userLatitude !== 0 ? userLatitude : 18.9309;
  const validLng = Number.isFinite(userLongitude) && userLongitude !== 0 ? userLongitude : 73.1631;

  // Bulletproof Dynamic DOM Mount — 100% immune to React 18 Strict Mode and container re-use
  useEffect(() => {
    const parentContainer = mapContainerRef.current;
    if (!parentContainer) return;

    let isCancelled = false;

    // 1. Clean up old instances cleanly
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {}
      mapInstanceRef.current = null;
    }

    // 2. Wipe DOM completely to remove any stale leaflet nodes or _leaflet_id
    parentContainer.innerHTML = '';
    (parentContainer as any)._leaflet_id = null;

    // 3. Create fresh inner div for leaflet
    const mapDiv = document.createElement('div');
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    mapDiv.style.minHeight = '520px';
    mapDiv.style.borderRadius = '16px';
    mapDiv.style.background = '#080c14';
    parentContainer.appendChild(mapDiv);

    try {
      const map = L.map(mapDiv, {
        center: [validLat, validLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add Real-World Tile Layer
      const initialLayer = L.tileLayer(TILE_URLS[activeLayer], {
        maxZoom: 20,
        crossOrigin: true,
      }).addTo(map);

      tileLayerRef.current = initialLayer;

      // Add Layer Groups
      distanceLinesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Click to select location
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onSelectLocation) {
          const { lat, lng } = e.latlng;
          onSelectLocation(`Real GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng);
        }
      });

      mapInstanceRef.current = map;

      // Initial user marker
      const userLatLng: L.LatLngExpression = [validLat, validLng];
      const userPulseIcon = L.divIcon({
        className: 'custom-user-gps-pin',
        html: `
          <div style="position: relative; width: 44px; height: 54px; display: flex; flex-direction: column; align-items: center;">
            <div style="
              position: absolute;
              width: 50px;
              height: 50px;
              top: -3px;
              background: rgba(79, 110, 247, 0.35);
              border: 2px solid rgba(79, 110, 247, 0.9);
              border-radius: 50%;
              animation: radarPulse 2s infinite;
              pointer-events: none;
            "></div>
            <div style="
              position: relative;
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #4F6EF7, #2563eb);
              border: 3px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 20px rgba(79, 110, 247, 1);
              color: #ffffff;
              font-size: 16px;
              font-weight: 800;
            ">
              ${isLiveTracking ? '🛰️' : '📍'}
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 9px solid #2563eb;
              margin-top: -2px;
            "></div>
          </div>
        `,
        iconSize: [44, 54],
        iconAnchor: [22, 45],
        popupAnchor: [0, -45],
      });

      userMarkerRef.current = L.marker(userLatLng, { icon: userPulseIcon, zIndexOffset: 1500 }).addTo(map);
      userMarkerRef.current.bindTooltip(`📍 ${currentLocationName}`, {
        permanent: true,
        direction: 'top',
        className: 'user-location-tooltip',
        offset: [0, -45],
      });

      userCircleRef.current = L.circle(userLatLng, {
        radius: Math.max(userAccuracy, 20),
        color: '#4F6EF7',
        weight: 1.5,
        fillColor: '#4F6EF7',
        fillOpacity: 0.12,
      }).addTo(map);

      // Force size invalidation across multiple frames to guarantee 100% tile loading
      map.whenReady(() => map.invalidateSize());
      setTimeout(() => { if (!isCancelled) map.invalidateSize(); }, 50);
      setTimeout(() => { if (!isCancelled) map.invalidateSize(); }, 200);
      setTimeout(() => { if (!isCancelled) map.invalidateSize(); }, 600);
      setTimeout(() => { if (!isCancelled) map.invalidateSize(); }, 1500);

    } catch (err) {
      console.error('Leaflet initialization error:', err);
    }

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Real-World Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      if (tileLayerRef.current) {
        try {
          map.removeLayer(tileLayerRef.current);
        } catch {}
      }

      const newLayer = L.tileLayer(TILE_URLS[activeLayer], {
        maxZoom: 20,
        crossOrigin: true,
      }).addTo(map);

      tileLayerRef.current = newLayer;
      setTimeout(() => map.invalidateSize(), 50);
    } catch (e) {
      console.error('Tile switch error:', e);
    }
  }, [activeLayer]);

  // Update GPS Pin Position & Pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const userLatLng: L.LatLngExpression = [validLat, validLng];

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLatLng);
        userMarkerRef.current.setTooltipContent(`📍 ${currentLocationName}`);
      }

      if (userCircleRef.current) {
        userCircleRef.current.setLatLng(userLatLng);
        userCircleRef.current.setRadius(Math.max(userAccuracy, 20));
      }

      if (!highlightedLocation) {
        const curCenter = map.getCenter();
        const distMeters = map.distance(curCenter, [validLat, validLng]);
        if (distMeters > 500) {
          map.setView(userLatLng, 17, { animate: false });
        } else {
          map.panTo(userLatLng, { animate: true });
        }
        setTimeout(() => map.invalidateSize(), 100);
      }
    } catch (e) {
      console.error('GPS marker update error:', e);
    }
  }, [userLatitude, userLongitude, userAccuracy, currentLocationName, isLiveTracking, highlightedLocation]);

  // Update Memory Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const distanceLinesLayer = distanceLinesLayerRef.current;
    if (!map || !markersLayer || !distanceLinesLayer) return;

    try {
      markersLayer.clearLayers();
      distanceLinesLayer.clearLayers();

      (memories || []).forEach((memory) => {
        let itemLat = memory.latitude;
        let itemLng = memory.longitude;

        if ((itemLat === null || itemLat === undefined) && memory.location) {
          const match = KNOWN_PLACES.find((p) => memory.location?.toLowerCase().includes(p.name.toLowerCase()));
          if (match) {
            itemLat = match.lat;
            itemLng = match.lng;
          }
        }

        if (itemLat !== null && itemLat !== undefined && itemLng !== null && itemLng !== undefined && Number.isFinite(itemLat) && Number.isFinite(itemLng)) {
          const isForgotten = memory.status === 'potentially_forgotten';
          const isVehicle = memory.object?.toLowerCase().includes('car') || memory.object?.toLowerCase().includes('park');

          const itemIcon = L.divIcon({
            className: 'custom-memory-pin',
            html: `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                background: ${isForgotten ? '#ef4444' : isVehicle ? '#0284c7' : '#4F6EF7'};
                border: 2px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                font-size: 14px;
                color: #ffffff;
              ">
                ${isVehicle ? '🚗' : memory.memory_type === 'belonging' ? '🔌' : '📝'}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const memMarker = L.marker([itemLat, itemLng], { icon: itemIcon }).addTo(markersLayer);
          const distMeters = Math.round(map.distance([validLat, validLng], [itemLat, itemLng]));

          const popup = document.createElement('div');
          popup.innerHTML = `
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${memory.object || memory.task || memory.original_text.slice(0, 25)}
            </div>
            <div style="font-size: 11px; color: #4F6EF7; font-weight: 600; margin-bottom: 4px;">
              📍 ${memory.location || 'Saved Spot'} (${distMeters}m away)
            </div>
            <button id="mark-retrieved-${memory.id}" style="background: #10b981; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer; width: 100%;">
              ✓ Mark Retrieved
            </button>
          `;
          memMarker.bindPopup(popup);

          memMarker.on('popupopen', () => {
            const btn = document.getElementById(`mark-retrieved-${memory.id}`);
            if (btn && onMarkRetrieved) {
              btn.onclick = () => onMarkRetrieved(memory.id);
            }
          });
        }
      });
    } catch (e) {
      console.error('Memory markers error:', e);
    }
  }, [memories, userLatitude, userLongitude, onMarkRetrieved]);

  // Center On User
  const handleCenterOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([validLat, validLng], 18, { animate: true });
    }
  };

  // Search Address
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    try {
      setIsSearching(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const searchLat = parseFloat(data[0].lat);
        const searchLng = parseFloat(data[0].lon);
        mapInstanceRef.current.flyTo([searchLat, searchLng], 18, { animate: true, duration: 1.5 });
        if (onSelectLocation) {
          onSelectLocation(data[0].display_name.split(',')[0], searchLat, searchLng);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', minHeight: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(79, 110, 247, 0.3)', background: '#080c14' }}>
      {/* Real-World Leaflet Dynamic Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '520px', background: '#080c14' }} />

      {/* Real-World Address & GPS Badge (Top-Left) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(12, 17, 29, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(79, 110, 247, 0.4)',
          borderRadius: '12px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} className="animate-pulse" />
        <div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            🌍 REAL-WORLD GLOBAL MAP
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
            {currentLocationName}
          </div>
        </div>
      </div>

      {/* Global Real Address Search Bar (Top-Center) */}
      <form
        onSubmit={handleSearchAddress}
        style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '4px 8px 4px 12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          maxWidth: '320px',
          width: '90%',
        }}
      >
        <Search size={14} color="#94a3b8" style={{ marginRight: '8px' }} />
        <input
          type="text"
          placeholder="Search street, city, landmark..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.8rem',
            width: '100%',
            fontFamily: 'var(--font-ui)',
          }}
        />
        <button
          type="submit"
          disabled={isSearching}
          className="btn btn-primary btn-sm"
          style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '8px' }}
        >
          {isSearching ? '...' : 'Go'}
        </button>
      </form>

      {/* Layer Switcher & Center Me FAB (Top-Right) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* 1-Click Layer Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: '10px',
            padding: '3px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeLayer === 'streets' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveLayer('streets')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            <Globe size={12} />
            <span>Streets</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeLayer === 'satellite' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveLayer('satellite')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            <Satellite size={12} />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeLayer === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveLayer('dark')}
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
          >
            <Moon size={12} />
            <span>Night</span>
          </button>
        </div>

        {/* Center On Me FAB */}
        <button
          className="btn btn-primary btn-sm"
          onClick={handleCenterOnUser}
          title="Center on my Real GPS Location"
          style={{
            background: 'linear-gradient(135deg, #4F6EF7, #2563eb)',
            borderColor: 'rgba(255,255,255,0.2)',
            padding: '7px 12px',
            fontSize: '0.78rem',
            boxShadow: '0 4px 14px rgba(79, 110, 247, 0.5)',
          }}
        >
          <Navigation size={13} color="#ffffff" />
          <span>📍 My GPS</span>
        </button>
      </div>

      {/* Map Legend & Active GPS Telemetry (Bottom-Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(12, 17, 29, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          padding: '8px 14px',
          fontSize: '0.75rem',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4F6EF7', border: '2px solid #ffffff', display: 'inline-block' }}></span>
          <span>📍 <strong>Real GPS</strong> ({validLat.toFixed(4)}, {validLng.toFixed(4)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
          <span>Item Pins</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', display: 'inline-block' }}></span>
          <span>🚗 Parked Car</span>
        </div>
      </div>
    </div>
  );
};
