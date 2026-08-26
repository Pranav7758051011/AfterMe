import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Memory } from '../types';
import { KNOWN_PLACES } from './LocationSimulator';
import { MapPin, Navigation, Compass, ShieldAlert, Sparkles, Check, Building2, Crosshair, Target, Satellite, Radio } from 'lucide-react';

// Fix Leaflet default icon paths in bundler
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
  onMarkRetrieved?: (memoryId: string) => void;
  onClearHighlight?: () => void;
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
  onMarkRetrieved,
  onClearHighlight,
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
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLatitude, userLongitude],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    });

    // Sleek Dark Matter Tiles (CartoDB)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    geofencesLayerRef.current = L.layerGroup().addTo(map);
    distanceLinesLayerRef.current = L.layerGroup().addTo(map);
    highlightLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Handle map click to drop custom location pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onSelectLocation) {
        onSelectLocation(`Custom Pin (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`, e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
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
        <div style="position: relative; width: 40px; height: 50px; display: flex; flex-direction: column; align-items: center;">
          <!-- Glowing Animated Radar Ring -->
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            top: -4px;
            background: rgba(99, 102, 241, 0.25);
            border: 2px solid rgba(99, 102, 241, 0.6);
            border-radius: 50%;
            animation: radarPulse 2s infinite;
            pointer-events: none;
          "></div>

          <!-- Top Pin Head with Satellite / MapPin Badge -->
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.9), 0 4px 10px rgba(0,0,0,0.5);
            z-index: 10;
            color: #ffffff;
            font-size: 14px;
            animation: bounce 2s infinite ease-in-out;
          ">
            ${isLiveTracking ? '🛰️' : '📍'}
          </div>

          <!-- Pin Needle Pointer -->
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid #4f46e5;
            margin-top: -2px;
            z-index: 9;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          "></div>

          <!-- Ground Shadow / Base Dot -->
          <div style="
            width: 8px;
            height: 4px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 50%;
            margin-top: 1px;
          "></div>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 42],
      popupAnchor: [0, -42],
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
        offset: [0, -42],
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

    if (onSelectLocation) {
      const dropMemBtn = document.createElement('button');
      dropMemBtn.innerText = '📍 Drop Memory at This GPS Spot';
      dropMemBtn.style.cssText = 'background: #6366f1; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%;';
      dropMemBtn.onclick = () => {
        onSelectLocation(currentLocationName, userLatitude, userLongitude);
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

    if (isLiveTracking && !highlightedLocation) {
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
              border: 3px solid #10b981;
              background: rgba(16, 185, 129, 0.4);
              border-radius: 50%;
              animation: targetPulse 1.5s infinite;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              box-shadow: 0 0 25px #10b981;
            ">
              🎯
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const targetMarker = L.marker(targetLatLng, { icon: targetIcon, zIndexOffset: 2000 }).addTo(highlightLayer);

      // Distance from user
      const distMeters = Math.round(
        map.distance([userLatitude, userLongitude], targetLatLng)
      );

      // Target popup content
      const popupDiv = document.createElement('div');
      popupDiv.style.padding = '6px';
      popupDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 15px; color: #047857; margin-bottom: 4px;">
          <span>🎯 Found Requested Item Area!</span>
        </div>
        <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
          ${highlightedLocation.label || 'Item'}
        </div>
        <div style="font-size: 12px; color: #4338ca; font-weight: 600; margin-bottom: 4px;">
          📍 ${highlightedLocation.name} &bull; <strong>${distMeters}m away from you</strong>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">
          Circled location area on map based on your query.
        </div>
      `;

      if (highlightedLocation.memoryId && onMarkRetrieved) {
        const btn = document.createElement('button');
        btn.innerText = '✓ Mark Retrieved';
        btn.style.cssText = 'background: #10b981; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; width: 100%; margin-bottom: 4px;';
        btn.onclick = () => {
          onMarkRetrieved(highlightedLocation.memoryId!);
          targetMarker.closePopup();
        };
        popupDiv.appendChild(btn);
      }

      if (onClearHighlight) {
        const clearBtn = document.createElement('button');
        clearBtn.innerText = 'Dismiss Circle';
        clearBtn.style.cssText = 'background: rgba(0,0,0,0.06); color: #475569; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; width: 100%;';
        clearBtn.onclick = () => onClearHighlight();
        popupDiv.appendChild(clearBtn);
      }

      targetMarker.bindPopup(popupDiv).openPopup();

      // Smoothly fly map to the circled area
      map.flyTo(targetLatLng, 18, { duration: 1.2 });
    }
  }, [highlightedLocation, userLatitude, userLongitude, onMarkRetrieved, onClearHighlight]);

  // Update Geofence Circles & Memory Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    const geofencesLayer = geofencesLayerRef.current;
    const markersLayer = markersLayerRef.current;
    const distanceLinesLayer = distanceLinesLayerRef.current;

    if (!map || !geofencesLayer || !markersLayer || !distanceLinesLayer) return;

    geofencesLayer.clearLayers();
    markersLayer.clearLayers();
    distanceLinesLayer.clearLayers();

    // Render Preset Geofence Boundaries
    KNOWN_PLACES.forEach((place) => {
      const isCurrent = place.name.toLowerCase() === currentLocationName.toLowerCase();
      const circle = L.circle([place.lat, place.lng], {
        radius: place.radius || 60,
        color: isCurrent ? '#10b981' : '#f59e0b',
        dashArray: isCurrent ? undefined : '6, 6',
        weight: isCurrent ? 2 : 1.5,
        fillColor: isCurrent ? '#10b981' : '#f59e0b',
        fillOpacity: isCurrent ? 0.12 : 0.05,
      });

      circle.bindTooltip(`<b>📍 ${place.name}</b><br/><span style="font-size:11px;color:#94a3b8;">${place.radius}m Geofence</span>`, {
        direction: 'center',
        permanent: false,
      });

      circle.on('click', () => {
        if (onSelectLocation) onSelectLocation(place.name, place.lat, place.lng);
      });

      circle.addTo(geofencesLayer);
    });

    // Render Memory Pins
    memories.forEach((memory) => {
      if (memory.status === 'retrieved' || memory.status === 'completed' || memory.status === 'archived') {
        return;
      }

      // Determine item coordinate
      let itemLat = memory.latitude;
      let itemLng = memory.longitude;

      if ((itemLat === null || itemLat === undefined) && memory.location) {
        const matchedPlace = KNOWN_PLACES.find((p) => memory.location?.toLowerCase().includes(p.name.toLowerCase()));
        if (matchedPlace) {
          itemLat = matchedPlace.lat;
          itemLng = matchedPlace.lng;
        }
      }

      if (itemLat !== null && itemLat !== undefined && itemLng !== null && itemLng !== undefined) {
        const isForgotten = memory.status === 'potentially_forgotten';
        const isCritical = memory.risk_level === 'critical' || memory.risk_level === 'high';
        const isVehicle = memory.object?.toLowerCase().includes('car') || memory.location?.toLowerCase().includes('park');

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

        // Distance from user to item
        const distMeters = Math.round(
          map.distance([userLatitude, userLongitude], [itemLat, itemLng])
        );

        // Popup content with location name and action
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

        // Draw connecting dashed line from user to left items
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

  // Center On User action: fly to user coordinates and open interactive GPS Pin popup!
  const handleCenterOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLatitude, userLongitude], 18, { duration: 1.2 });
      if (userMarkerRef.current) {
        setTimeout(() => {
          userMarkerRef.current?.openPopup();
        }, 1200);
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '370px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

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
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
            {currentLocationName}
          </div>
        </div>
      </div>

      {/* Spotlight Notice if Area is Circled */}
      {highlightedLocation && (
        <div
          style={{
            position: 'absolute',
            top: '72px',
            left: '12px',
            zIndex: 1000,
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.5)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Target size={14} />
          <span>Circled Target: {highlightedLocation.label || 'Item'} @ {highlightedLocation.name}</span>
          {onClearHighlight && (
            <button
              onClick={onClearHighlight}
              style={{ background: 'transparent', border: 'none', color: '#fff', marginLeft: '6px', cursor: 'pointer', fontWeight: 800 }}
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
