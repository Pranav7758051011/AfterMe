import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Navigation, Crosshair, Sparkles, Satellite, Compass, 
  Target, Car, AlertTriangle, ShieldCheck, Layers, Eye, Moon, Sun, Globe,
  Search, Check, Plus, RefreshCw
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

// Ultra-Reliable Global Real-World Tile Providers (Zero API Key, 100% Uptime worldwide)
const REAL_WORLD_TILE_LAYERS: Record<RealMapLayer, { url: string; subdomains?: string | string[]; maxZoom: number; attribution: string }> = {
  streets: {
    // Crisp Real-World Road & Street Map with Street Names and Building Footprints
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a> &copy; OpenStreetMap',
  },
  satellite: {
    // Photorealistic Satellite Imagery with Street & Highway Overlays
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Satellite & Imagery',
  },
  dark: {
    // High-Contrast Cyber Dark Matter Map
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a> &copy; OpenStreetMap',
  },
};

export const LocationMap: React.FC<LocationMapProps> = ({
  userLatitude,
  userLongitude,
  userAccuracy = 15,
  currentLocationName,
  memories,
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
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);
  const distanceLinesLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<RealMapLayer>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(17);

  const validLat = Number.isFinite(userLatitude) && userLatitude !== 0 ? userLatitude : 18.9309;
  const validLng = Number.isFinite(userLongitude) && userLongitude !== 0 ? userLongitude : 73.1631;

  // Initialize Real-World Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Clean up stale instances
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {}
      mapInstanceRef.current = null;
    }
    try {
      (container as any)._leaflet_id = null;
    } catch {}

    const map = L.map(container, {
      center: [validLat, validLng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add Real-World Tile Layer
    const layerConfig = REAL_WORLD_TILE_LAYERS[activeLayer];
    const initialLayer = L.tileLayer(layerConfig.url, {
      subdomains: layerConfig.subdomains || 'abc',
      maxZoom: layerConfig.maxZoom,
      crossOrigin: true,
      attribution: layerConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = initialLayer;

    // Layer Groups
    geofencesLayerRef.current = L.layerGroup().addTo(map);
    distanceLinesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    highlightLayerRef.current = L.layerGroup().addTo(map);

    // Click handler to select real GPS coordinate on street map
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectLocation) {
        const { lat, lng } = e.latlng;
        onSelectLocation(`Real GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng);
      }
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    mapInstanceRef.current = map;

    // Invalidate map size across multiple frames to guarantee 100% tile loading
    map.whenReady(() => {
      map.invalidateSize();
    });

    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 600);
    const t4 = setTimeout(() => map.invalidateSize(), 1200);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch {}
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      try {
        map.remove();
      } catch {}
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Real-World Tile Layer when user switches Streets / Satellite / Dark
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch {}
    }

    const layerConfig = REAL_WORLD_TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(layerConfig.url, {
      subdomains: layerConfig.subdomains || 'abc',
      maxZoom: layerConfig.maxZoom,
      crossOrigin: true,
      attribution: layerConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = newLayer;
    setTimeout(() => map.invalidateSize(), 50);
  }, [activeLayer]);

  // Update User Live GPS Marker on Real World Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userLatLng: L.LatLngExpression = [validLat, validLng];

    // High-Contrast High-Accuracy GPS Pin
    const userPulseIcon = L.divIcon({
      className: 'custom-user-gps-pin',
      html: `
        <div style="position: relative; width: 46px; height: 56px; display: flex; flex-direction: column; align-items: center;">
          <!-- Glowing Animated Radar Pulse -->
          <div style="
            position: absolute;
            width: 54px;
            height: 54px;
            top: -4px;
            background: rgba(79, 110, 247, 0.35);
            border: 2px solid rgba(79, 110, 247, 0.9);
            border-radius: 50%;
            animation: radarPulse 2s infinite;
            pointer-events: none;
          "></div>

          <!-- Pin Head with Live Icon -->
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #4F6EF7, #2563eb);
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(79, 110, 247, 1), 0 4px 14px rgba(0,0,0,0.6);
            z-index: 10;
            color: #ffffff;
            font-size: 16px;
          ">
            ${isLiveTracking ? '🛰️' : '📍'}
          </div>

          <!-- Pin Needle -->
          <div style="
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 10px solid #2563eb;
            margin-top: -2px;
            z-index: 9;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
          "></div>

          <!-- Shadow -->
          <div style="
            width: 12px;
            height: 6px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 50%;
            margin-top: 1px;
          "></div>
        </div>
      `,
      iconSize: [46, 56],
      iconAnchor: [23, 48],
      popupAnchor: [0, -48],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
      userMarkerRef.current.setIcon(userPulseIcon);
      userMarkerRef.current.setTooltipContent(`📍 ${isLiveTracking ? 'Live GPS: ' : 'You are at: '} ${currentLocationName}`);
    } else {
      userMarkerRef.current = L.marker(userLatLng, { icon: userPulseIcon, zIndexOffset: 1500 }).addTo(map);
      userMarkerRef.current.bindTooltip(`📍 ${isLiveTracking ? 'Live GPS: ' : 'You are at: '} ${currentLocationName}`, {
        permanent: true,
        direction: 'top',
        className: 'user-location-tooltip',
        offset: [0, -48],
      });
    }

    // Rich Real-World Location Popup
    const userPopupDiv = document.createElement('div');
    userPopupDiv.style.padding = '6px';
    userPopupDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 14px; color: #4F6EF7; margin-bottom: 4px;">
        <span>${isLiveTracking ? '🛰️ Real-Time GPS Signal' : '📍 Current Pinpoint Location'}</span>
      </div>
      <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
        ${currentLocationName}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">
        Real GPS: <strong>${validLat.toFixed(5)}, ${validLng.toFixed(5)}</strong>
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
        Accuracy Radius: ±${userAccuracy}m
      </div>
    `;

    const dropHandler = onAddMemoryAtLocation || onSelectLocation;
    if (dropHandler) {
      const dropMemBtn = document.createElement('button');
      dropMemBtn.innerText = '➕ Save Memory at This Real Spot';
      dropMemBtn.style.cssText = 'background: linear-gradient(135deg, #4F6EF7, #2563eb); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(79,110,247,0.5);';
      dropMemBtn.onclick = () => {
        dropHandler(currentLocationName, validLat, validLng);
        userMarkerRef.current?.closePopup();
      };
      userPopupDiv.appendChild(dropMemBtn);
    }

    userMarkerRef.current.bindPopup(userPopupDiv);

    // Accuracy Circle
    if (userCircleRef.current) {
      userCircleRef.current.setLatLng(userLatLng);
      userCircleRef.current.setRadius(Math.max(userAccuracy, 20));
    } else {
      userCircleRef.current = L.circle(userLatLng, {
        radius: Math.max(userAccuracy, 20),
        color: '#4F6EF7',
        weight: 1.5,
        fillColor: '#4F6EF7',
        fillOpacity: 0.12,
      }).addTo(map);
    }

    if (!highlightedLocation) {
      try {
        const curCenter = map.getCenter();
        const distMeters = map.distance(curCenter, [validLat, validLng]);
        if (distMeters > 500) {
          map.setView(userLatLng, 17, { animate: false });
        } else {
          map.panTo(userLatLng, { animate: true });
        }
      } catch {
        map.setView(userLatLng, 17, { animate: false });
      }
      setTimeout(() => map.invalidateSize(), 100);
    }
  }, [userLatitude, userLongitude, userAccuracy, currentLocationName, isLiveTracking, highlightedLocation, onSelectLocation]);

  // Render Real World Memory Pins & Belongings on Street Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const distanceLinesLayer = distanceLinesLayerRef.current;
    if (!map || !markersLayer || !distanceLinesLayer) return;

    markersLayer.clearLayers();
    distanceLinesLayer.clearLayers();

    memories.forEach((memory) => {
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
        const isCritical = memory.risk_level === 'critical' || memory.risk_level === 'high';
        const isVehicle = memory.object?.toLowerCase().includes('car') || memory.object?.toLowerCase().includes('park') || memory.location?.toLowerCase().includes('park');

        const markerHtml = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            background: ${isForgotten ? '#ef4444' : isVehicle ? '#0284c7' : isCritical ? '#f59e0b' : '#4F6EF7'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            font-size: 15px;
            color: #ffffff;
            animation: ${isForgotten ? 'bounce 1s infinite' : 'none'};
          ">
            ${isVehicle ? '🚗' : memory.memory_type === 'belonging' ? '🔌' : memory.memory_type === 'document' ? '📁' : '📝'}
          </div>
        `;

        const itemIcon = L.divIcon({
          className: 'custom-memory-pin',
          html: markerHtml,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const memMarker = L.marker([itemLat, itemLng], { icon: itemIcon }).addTo(markersLayer);

        const distMeters = Math.round(
          map.distance([validLat, validLng], [itemLat, itemLng])
        );

        const popupContent = document.createElement('div');
        popupContent.style.padding = '4px';
        popupContent.innerHTML = `
          <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
            ${memory.object || memory.task || memory.original_text.slice(0, 25)}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #4F6EF7; font-weight: 600; margin-bottom: 6px;">
            <span>📍 Real Spot: <strong>${memory.location || 'Saved Location'}</strong></span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            Distance: <strong>${distMeters} meters from you</strong>
          </div>
          <div style="font-size: 11px; color: #475569; font-style: italic; margin-bottom: 8px;">
            "${memory.original_text}"
          </div>
          ${isForgotten ? '<div style="color: #dc2626; font-weight: 700; font-size: 11px; margin-bottom: 8px;">⚠️ Left behind at this location!</div>' : ''}
        `;

        const retrieveBtn = document.createElement('button');
        retrieveBtn.innerText = '✓ Mark Retrieved';
        retrieveBtn.style.cssText = 'background: #10b981; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%;';
        retrieveBtn.onclick = () => {
          if (onMarkRetrieved) onMarkRetrieved(memory.id);
          memMarker.closePopup();
        };
        popupContent.appendChild(retrieveBtn);

        memMarker.bindPopup(popupContent);

        if (isForgotten || isCritical) {
          L.polyline([[validLat, validLng], [itemLat, itemLng]], {
            color: isForgotten ? '#ef4444' : '#f59e0b',
            weight: 2.5,
            dashArray: '6, 8',
            opacity: 0.85,
          }).addTo(distanceLinesLayer);
        }
      }
    });
  }, [memories, currentLocationName, userLatitude, userLongitude, onSelectLocation, onMarkRetrieved]);

  // Center On User action: forcefully refresh GPS, zoom to street level 18
  const handleCenterOnUser = async () => {
    let targetLat = validLat;
    let targetLng = validLng;

    if (onRequestFreshGPS) {
      try {
        const fresh = await onRequestFreshGPS();
        if (fresh && Number.isFinite(fresh.lat) && Number.isFinite(fresh.lng)) {
          targetLat = fresh.lat;
          targetLng = fresh.lng;
        }
      } catch {}
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          targetLat = pos.coords.latitude;
          targetLng = pos.coords.longitude;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([targetLat, targetLng], 18);
            mapInstanceRef.current.invalidateSize();
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([targetLat, targetLng]);
              setTimeout(() => userMarkerRef.current?.openPopup(), 300);
            }
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([targetLat, targetLng], 18);
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([targetLat, targetLng]);
        setTimeout(() => {
          userMarkerRef.current?.openPopup();
        }, 300);
      }
    }
  };

  // Real-World Address Search Geocoder
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    try {
      setIsSearching(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const searchLat = parseFloat(first.lat);
        const searchLng = parseFloat(first.lon);
        const searchName = first.display_name.split(',')[0];

        mapInstanceRef.current.flyTo([searchLat, searchLng], 18, { animate: true, duration: 1.5 });
        if (onSelectLocation) {
          onSelectLocation(searchName, searchLat, searchLng);
        }
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', minHeight: '520px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(79, 110, 247, 0.3)', background: '#080c14' }}>
      {/* Real-World Leaflet Map Canvas */}
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
          placeholder="Search any real street or city..."
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
          <span>📍 <strong>Real Device GPS</strong> ({validLat.toFixed(4)}, {validLng.toFixed(4)})</span>
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
