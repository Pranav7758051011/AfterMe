import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Navigation, Crosshair, Sparkles, Satellite, Compass, 
  Target, Car, AlertTriangle, ShieldCheck, Layers 
} from 'lucide-react';
import { Memory } from '../types';
import { KNOWN_PLACES } from './LocationSimulator';

// Fix Leaflet's default icon path in bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerRef = useRef<L.LayerGroup | null>(null);
  const distanceLinesLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Clean up any stale leaflet instance on the DOM node to prevent "already initialized" errors
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    try {
      (container as any)._leaflet_id = null;
    } catch {}

    const map = L.map(container, {
      center: [userLatitude, userLongitude],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 100% Free OpenStreetMap Tile Layer (Zero API Key required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Layer Groups
    geofencesLayerRef.current = L.layerGroup().addTo(map);
    distanceLinesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    highlightLayerRef.current = L.layerGroup().addTo(map);

    // Add click handler to select custom coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectLocation) {
        const { lat, lng } = e.latlng;
        onSelectLocation(`GPS Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng);
      }
    });

    mapInstanceRef.current = map;

    // Invalidate map size across multiple ticks to guarantee 100% tile rendering on tab switch
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);

    // ResizeObserver ensures map tiles resize immediately when tab becomes visible
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      try {
        map.remove();
      } catch {}
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Live GPS Pin Marker & Accuracy Radar Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userLatLng: L.LatLngExpression = [userLatitude, userLongitude];

    // Prominent High-Contrast GPS Pin HTML Icon
    const userPulseIcon = L.divIcon({
      className: 'custom-user-gps-pin',
      html: `
        <div style="position: relative; width: 44px; height: 54px; display: flex; flex-direction: column; align-items: center;">
          <!-- Glowing Animated Radar Ring -->
          <div style="
            position: absolute;
            width: 52px;
            height: 52px;
            top: -4px;
            background: rgba(99, 102, 241, 0.3);
            border: 2px solid rgba(99, 102, 241, 0.8);
            border-radius: 50%;
            animation: radarPulse 2s infinite;
            pointer-events: none;
          "></div>

          <!-- Top Pin Head with Satellite / MapPin Badge -->
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #6366f1, #4338ca);
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(99, 102, 241, 1), 0 4px 12px rgba(0,0,0,0.6);
            z-index: 10;
            color: #ffffff;
            font-size: 16px;
            animation: bounce 2s infinite ease-in-out;
          ">
            ${isLiveTracking ? '🛰️' : '📍'}
          </div>

          <!-- Pin Needle Pointer -->
          <div style="
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 10px solid #4338ca;
            margin-top: -2px;
            z-index: 9;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
          "></div>

          <!-- Ground Shadow / Base Dot -->
          <div style="
            width: 10px;
            height: 5px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 50%;
            margin-top: 1px;
          "></div>
        </div>
      `,
      iconSize: [44, 54],
      iconAnchor: [22, 46],
      popupAnchor: [0, -46],
    });

    // Create or Update User GPS Marker
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
        offset: [0, -46],
      });
    }

    // Build rich popup for user marker
    const userPopupDiv = document.createElement('div');
    userPopupDiv.style.padding = '6px';
    userPopupDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 14px; color: #4338ca; margin-bottom: 4px;">
        <span>${isLiveTracking ? '🛰️ Live GPS Active Pin' : '📍 Current Location Pin'}</span>
      </div>
      <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">
        ${currentLocationName}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">
        GPS: <strong>${userLatitude.toFixed(5)}, ${userLongitude.toFixed(5)}</strong>
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
        Accuracy Radius: ±${userAccuracy}m
      </div>
    `;

    const dropHandler = onAddMemoryAtLocation || onSelectLocation;
    if (dropHandler) {
      const dropMemBtn = document.createElement('button');
      dropMemBtn.innerText = '➕ Add Memory at This GPS Spot';
      dropMemBtn.style.cssText = 'background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(99,102,241,0.5); transition: transform 0.1s ease;';
      dropMemBtn.onclick = () => {
        dropHandler(currentLocationName, userLatitude, userLongitude);
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
        color: '#6366f1',
        weight: 1.5,
        fillColor: '#6366f1',
        fillOpacity: 0.12,
      }).addTo(map);
    }

    if (!highlightedLocation) {
      map.panTo(userLatLng, { animate: true });
    }
  }, [userLatitude, userLongitude, userAccuracy, currentLocationName, isLiveTracking, highlightedLocation, onSelectLocation]);

  // Update Highlighted Search Target Circle (When user asks "Where is my charger?")
  useEffect(() => {
    const map = mapInstanceRef.current;
    const highlightLayer = highlightLayerRef.current;
    if (!map || !highlightLayer) return;

    highlightLayer.clearLayers();

    if (highlightedLocation) {
      const targetLatLng: L.LatLngExpression = [highlightedLocation.lat, highlightedLocation.lng];

      // 1. Glowing Target Circle Ring
      const spotlightCircle = L.circle(targetLatLng, {
        radius: 65,
        color: '#10b981',
        weight: 3,
        dashArray: '8, 8',
        fillColor: '#10b981',
        fillOpacity: 0.25,
        className: 'pulsing-target-circle',
      }).addTo(highlightLayer);

      // 2. Center Target Crosshair Marker
      const targetIcon = L.divIcon({
        className: 'custom-target-icon',
        html: `
          <div style="position: relative; width: 44px; height: 44px;">
            <div style="
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: rgba(16, 185, 129, 0.4);
              border: 3px solid #10b981;
              box-shadow: 0 0 25px #10b981;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              color: #ffffff;
              animation: targetPulse 1.5s infinite;
            ">
              🎯
            </div>
            <div style="
              position: absolute;
              bottom: -24px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #34d399;
              padding: 2px 8px;
              border-radius: 4px;
              border: 1px solid #10b981;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.6);
            ">
              ${highlightedLocation.label || highlightedLocation.name}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const targetMarker = L.marker(targetLatLng, { icon: targetIcon, zIndexOffset: 2000 }).addTo(highlightLayer);

      targetMarker.bindPopup(`
        <div style="padding: 4px;">
          <div style="font-weight: 800; font-size: 13px; color: #059669; margin-bottom: 2px;">
            🎯 Target Location Identified
          </div>
          <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 4px;">
            ${highlightedLocation.name}
          </div>
          <div style="font-size: 11px; color: #475569;">
            ${highlightedLocation.label ? `"${highlightedLocation.label}"` : 'Area circled based on your query.'}
          </div>
        </div>
      `);

      // 3. Smoothly fly map to center the circled target area!
      map.flyTo(targetLatLng, 18, {
        animate: true,
        duration: 1.2,
      });

      setTimeout(() => {
        targetMarker.openPopup();
      }, 1300);
    }
  }, [highlightedLocation]);

  // Update Known Places Geofence Zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    const geofencesLayer = geofencesLayerRef.current;
    if (!map || !geofencesLayer) return;

    geofencesLayer.clearLayers();

    KNOWN_PLACES.forEach((place) => {
      const isCurrentPlace = currentLocationName.toLowerCase().includes(place.name.toLowerCase());

      const circle = L.circle([place.lat, place.lng], {
        radius: place.radius || 70,
        color: isCurrentPlace ? '#6366f1' : 'rgba(148, 163, 184, 0.4)',
        weight: isCurrentPlace ? 2 : 1,
        dashArray: isCurrentPlace ? undefined : '4, 4',
        fillColor: isCurrentPlace ? '#6366f1' : '#334155',
        fillOpacity: isCurrentPlace ? 0.12 : 0.04,
      }).addTo(geofencesLayer);

      const zoneIcon = L.divIcon({
        className: 'custom-zone-label',
        html: `
          <div style="
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid ${isCurrentPlace ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255,255,255,0.1)'};
            color: ${isCurrentPlace ? '#a5b4fc' : '#94a3b8'};
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ">
            <span>${place.name}</span>
          </div>
        `,
        iconSize: [80, 20],
        iconAnchor: [40, 10],
      });

      const zoneMarker = L.marker([place.lat, place.lng], { icon: zoneIcon }).addTo(geofencesLayer);

      zoneMarker.on('click', () => {
        if (onSelectLocation) {
          onSelectLocation(place.name, place.lat, place.lng);
        }
      });
    });
  }, [currentLocationName, onSelectLocation]);

  // Render Memories & Belonging Pins on Map
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

      if (itemLat !== null && itemLat !== undefined && itemLng !== null && itemLng !== undefined) {
        const isForgotten = memory.status === 'potentially_forgotten';
        const isCritical = memory.risk_level === 'critical' || memory.risk_level === 'high';
        const isVehicle = memory.object?.toLowerCase().includes('car') || memory.object?.toLowerCase().includes('park') || memory.location?.toLowerCase().includes('park');

        const markerHtml = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: ${isForgotten ? '#ef4444' : isVehicle ? '#38bdf8' : isCritical ? '#f59e0b' : '#6366f1'};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-size: 14px;
            color: #ffffff;
            animation: ${isForgotten ? 'bounce 1s infinite' : 'none'};
          ">
            ${isVehicle ? '🚗' : memory.memory_type === 'belonging' ? '🔌' : memory.memory_type === 'document' ? '📁' : '📝'}
          </div>
        `;

        const itemIcon = L.divIcon({
          className: 'custom-memory-pin',
          html: markerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const memMarker = L.marker([itemLat, itemLng], { icon: itemIcon }).addTo(markersLayer);

        const distMeters = Math.round(
          map.distance([userLatitude, userLongitude], [itemLat, itemLng])
        );

        const popupContent = document.createElement('div');
        popupContent.style.padding = '4px';
        popupContent.innerHTML = `
          <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
            ${memory.object || memory.task || memory.original_text.slice(0, 25)}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #4338ca; font-weight: 600; margin-bottom: 6px;">
            <span>📍 Location Name: <strong>${memory.location || 'Saved Place'}</strong></span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            Distance: <strong>${distMeters} meters away</strong>
          </div>
          <div style="font-size: 11px; color: #475569; font-style: italic; margin-bottom: 8px;">
            "${memory.original_text}"
          </div>
          ${isForgotten ? '<div style="color: #dc2626; font-weight: 700; font-size: 11px; margin-bottom: 8px;">⚠️ Left behind in ' + (memory.location || 'this place') + '!</div>' : ''}
        `;

        const retrieveBtn = document.createElement('button');
        retrieveBtn.innerText = '✓ Mark Retrieved';
        retrieveBtn.style.cssText = 'background: #10b981; color: #fff; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%;';
        retrieveBtn.onclick = () => {
          if (onMarkRetrieved) onMarkRetrieved(memory.id);
          memMarker.closePopup();
        };
        popupContent.appendChild(retrieveBtn);

        memMarker.bindPopup(popupContent);

        if (isForgotten || isCritical) {
          L.polyline([[userLatitude, userLongitude], [itemLat, itemLng]], {
            color: isForgotten ? '#ef4444' : '#f59e0b',
            weight: 2,
            dashArray: '5, 8',
            opacity: 0.8,
          }).addTo(distanceLinesLayer);
        }
      }
    });
  }, [memories, currentLocationName, userLatitude, userLongitude, onSelectLocation, onMarkRetrieved]);

  // Center On User action: forcefully refresh GPS, fly to user coordinates, zoom in to level 19, and open interactive GPS Pin popup!
  const handleCenterOnUser = async () => {
    let targetLat = userLatitude;
    let targetLng = userLongitude;

    if (onRequestFreshGPS) {
      try {
        const fresh = await onRequestFreshGPS();
        if (fresh) {
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
            mapInstanceRef.current.flyTo([targetLat, targetLng], 19, { animate: true, duration: 1.5 });
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([targetLat, targetLng]);
              setTimeout(() => userMarkerRef.current?.openPopup(), 1500);
            }
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.flyTo([targetLat, targetLng], 19, { animate: true, duration: 1.5 });
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([targetLat, targetLng]);
        setTimeout(() => {
          userMarkerRef.current?.openPopup();
        }, 1500);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '460px', minHeight: '460px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '460px' }} />

      {/* Floating Prominent Location Name Badge on Map (Top-Left) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        <MapPin size={16} color="var(--accent-primary)" />
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {isLiveTracking ? '🛰️ Live GPS Location' : 'Detected Location Name'}
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
            {currentLocationName}
          </div>
        </div>
      </div>

      {/* Active Target Highlight Badge (if asking "Where is my charger?") */}
      {highlightedLocation && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.6)',
            animation: 'slideDown 0.3s ease',
          }}
        >
          <Target size={15} />
          <span>🎯 Spotlight on: {highlightedLocation.name}</span>
          {onClearHighlight && (
            <button
              onClick={onClearHighlight}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '6px', fontWeight: 900 }}
              title="Clear Highlight"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Floating Map Overlay Controls (Top-Right) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <button
          className="btn btn-primary btn-sm"
          onClick={handleCenterOnUser}
          title="Center on my GPS Pin and open location card"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            borderColor: 'rgba(255,255,255,0.2)',
            padding: '7px 14px',
            fontSize: '0.8rem',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.5)',
          }}
        >
          <Navigation size={14} color="#ffffff" />
          <span>📍 Center Me & Show Pin</span>
        </button>
      </div>

      {/* Map Legend & Active GPS Indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#6366f1', border: '2px solid #ffffff', display: 'inline-block' }}></span>
          <span>📍 <strong>Your GPS Pin</strong> ({userLatitude.toFixed(4)}, {userLongitude.toFixed(4)})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span>{highlightedLocation ? '🎯 Circled Item Area' : 'Geofence Zone'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
          <span>Memory Pin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
          <span>🚗 Vehicle</span>
        </div>
      </div>
    </div>
  );
};
