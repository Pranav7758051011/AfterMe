import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Compass, Navigation, Target, Sparkles, Layers, RotateCcw, ZoomIn, ZoomOut, Radio } from 'lucide-react';
import { Memory } from '../types';
import { KNOWN_PLACES, KnownPlace } from './LocationSimulator';
import { HighlightedLocation } from './LocationMap';

interface ThreeDSpatialRadarProps {
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
}

export const ThreeDSpatialRadar: React.FC<ThreeDSpatialRadarProps> = ({
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D Camera & Perspective State
  const [rotationAngle, setRotationAngle] = useState(0.4); // Yaw in radians
  const [pitchAngle, setPitchAngle] = useState(0.85); // Pitch (tilt) in radians (~50 deg)
  const [zoomScale, setZoomScale] = useState(1.4); // Scale multiplier (1.0 = ~200m view)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedPin, setSelectedPin] = useState<{ id: string; name: string; type: string; dist: number; lat: number; lng: number } | null>(null);

  const validUserLat = Number.isFinite(userLatitude) ? userLatitude : 18.9310;
  const validUserLng = Number.isFinite(userLongitude) ? userLongitude : 73.1630;

  // Convert GPS lat/lng offset to local meters (dx: East-West, dy: North-South)
  const getMeterOffsets = (lat: number, lng: number) => {
    const latMeters = (lat - validUserLat) * 111139;
    const lngMeters = (lng - validUserLng) * 111139 * Math.cos((validUserLat * Math.PI) / 180);
    return { x: lngMeters, y: -latMeters }; // Screen Y is down (South)
  };

  // Convert (x, y) meters to 2D Canvas Screen coordinates with 3D isometric projection
  const project3D = (x: number, y: number, z: number, centerX: number, centerY: number, scale: number) => {
    // 1. Rotate by Yaw
    const cosYaw = Math.cos(rotationAngle);
    const sinYaw = Math.sin(rotationAngle);
    const rotX = x * cosYaw - y * sinYaw;
    const rotY = x * sinYaw + y * cosYaw;

    // 2. Apply Pitch Tilt (compression on Y axis)
    const sinPitch = Math.sin(pitchAngle);
    const cosPitch = Math.cos(pitchAngle);

    const screenX = centerX + rotX * scale;
    const screenY = centerY + (rotY * sinPitch - z * cosPitch) * scale;
    const depth = rotY * cosPitch + z * sinPitch;

    return { screenX, screenY, depth };
  };

  // Animation Frame Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let sweepAngle = 0;
    let pulsePhase = 0;

    const render = () => {
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 480;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Clear & Deep Navy Cyber Background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Background ambient gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, 'rgba(79, 110, 247, 0.12)');
      bgGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
      bgGrad.addColorStop(1, 'rgba(8, 12, 20, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 30;
      const scale = (Math.min(width, height) / 260) * zoomScale;

      // 2. Draw 3D Isometric Grid Floor
      const gridSize = 160;
      const gridStep = 20;

      ctx.strokeStyle = 'rgba(79, 110, 247, 0.15)';
      ctx.lineWidth = 1;

      for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
        const p1 = project3D(gx, -gridSize, 0, centerX, centerY, scale);
        const p2 = project3D(gx, gridSize, 0, centerX, centerY, scale);
        ctx.beginPath();
        ctx.moveTo(p1.screenX, p1.screenY);
        ctx.lineTo(p2.screenX, p2.screenY);
        ctx.stroke();
      }

      for (let gy = -gridSize; gy <= gridSize; gy += gridStep) {
        const p1 = project3D(-gridSize, gy, 0, centerX, centerY, scale);
        const p2 = project3D(gridSize, gy, 0, centerX, centerY, scale);
        ctx.beginPath();
        ctx.moveTo(p1.screenX, p1.screenY);
        ctx.lineTo(p2.screenX, p2.screenY);
        ctx.stroke();
      }

      // 3. Draw Concentric 3D Range Rings (25m, 50m, 100m, 150m)
      const rangeRings = [25, 50, 100, 150];
      rangeRings.forEach((radiusMeters, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = idx === 1 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(79, 110, 247, 0.3)';
        ctx.lineWidth = idx === 1 ? 1.5 : 1;
        if (idx === 1) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);

        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const rx = Math.cos(theta) * radiusMeters;
          const ry = Math.sin(theta) * radiusMeters;
          const p = project3D(rx, ry, 0, centerX, centerY, scale);
          if (i === 0) ctx.moveTo(p.screenX, p.screenY);
          else ctx.lineTo(p.screenX, p.screenY);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Range Tag on ring
        const labelP = project3D(radiusMeters * Math.cos(0.3), radiusMeters * Math.sin(0.3), 0, centerX, centerY, scale);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.fillText(`${radiusMeters}m`, labelP.screenX + 4, labelP.screenY - 2);
      });

      // 4. Draw Known Place Geofence Cylinders in 3D
      KNOWN_PLACES.forEach((place) => {
        const offset = getMeterOffsets(place.lat, place.lng);
        const radius = place.radius || 60;
        const isCurrent = currentLocationName.toLowerCase().includes(place.name.toLowerCase());

        // Base Circle
        ctx.beginPath();
        ctx.strokeStyle = isCurrent ? 'rgba(79, 110, 247, 0.8)' : 'rgba(148, 163, 184, 0.3)';
        ctx.fillStyle = isCurrent ? 'rgba(79, 110, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = isCurrent ? 2 : 1;

        const steps = 32;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const rx = offset.x + Math.cos(theta) * radius;
          const ry = offset.y + Math.sin(theta) * radius;
          const p = project3D(rx, ry, 0, centerX, centerY, scale);
          if (i === 0) ctx.moveTo(p.screenX, p.screenY);
          else ctx.lineTo(p.screenX, p.screenY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Zone Name Pin
        const centerP = project3D(offset.x, offset.y, 14, centerX, centerY, scale);
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = isCurrent ? '#93c5fd' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(`${place.icon} ${place.name}`, centerP.screenX, centerP.screenY);
      });

      // 5. 360° Rotating Radar Sweep Sector
      sweepAngle = (sweepAngle + 0.02) % (Math.PI * 2);
      const sweepSteps = 24;
      const sweepRadius = 160;

      ctx.beginPath();
      const centerP = project3D(0, 0, 0, centerX, centerY, scale);
      ctx.moveTo(centerP.screenX, centerP.screenY);

      for (let i = 0; i <= sweepSteps; i++) {
        const theta = sweepAngle - (i / sweepSteps) * 0.5;
        const rx = Math.cos(theta) * sweepRadius;
        const ry = Math.sin(theta) * sweepRadius;
        const p = project3D(rx, ry, 0, centerX, centerY, scale);
        ctx.lineTo(p.screenX, p.screenY);
      }
      ctx.closePath();

      const sweepGrad = ctx.createRadialGradient(centerP.screenX, centerP.screenY, 10, centerP.screenX, centerP.screenY, sweepRadius * scale);
      sweepGrad.addColorStop(0, 'rgba(79, 110, 247, 0.35)');
      sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // 6. Highlighted Search Target (if active)
      if (highlightedLocation) {
        const targetOffset = getMeterOffsets(highlightedLocation.lat, highlightedLocation.lng);
        const targetBase = project3D(targetOffset.x, targetOffset.y, 0, centerX, centerY, scale);
        const targetTop = project3D(targetOffset.x, targetOffset.y, 45, centerX, centerY, scale);

        // Glowing Emerald Pillar
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(targetBase.screenX, targetBase.screenY);
        ctx.lineTo(targetTop.screenX, targetTop.screenY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target Rings
        ctx.beginPath();
        ctx.arc(targetTop.screenX, targetTop.screenY, 18 + Math.sin(pulsePhase * 3) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'center';
        ctx.fillText(`🎯 ${highlightedLocation.name}`, targetTop.screenX, targetTop.screenY - 24);
      }

      // 7. Render Memory Belonging Pillars in 3D
      memories.forEach((mem) => {
        let memLat = mem.latitude;
        let memLng = mem.longitude;

        if ((memLat === null || memLat === undefined) && mem.location) {
          const match = KNOWN_PLACES.find((p) => mem.location?.toLowerCase().includes(p.name.toLowerCase()));
          if (match) {
            memLat = match.lat;
            memLng = match.lng;
          }
        }

        if (memLat !== null && memLat !== undefined && memLng !== null && memLng !== undefined && Number.isFinite(memLat) && Number.isFinite(memLng)) {
          const offset = getMeterOffsets(memLat, memLng);
          const isForgotten = mem.status === 'potentially_forgotten';
          const isVehicle = mem.object?.toLowerCase().includes('car') || mem.object?.toLowerCase().includes('park');
          const isCritical = mem.risk_level === 'critical' || mem.risk_level === 'high';

          const pillarHeight = isForgotten ? 40 : 28;
          const baseP = project3D(offset.x, offset.y, 0, centerX, centerY, scale);
          const topP = project3D(offset.x, offset.y, pillarHeight, centerX, centerY, scale);

          // 3D Light Pillar
          const strokeCol = isForgotten ? '#ef4444' : isVehicle ? '#38bdf8' : isCritical ? '#f59e0b' : '#4F6EF7';
          ctx.beginPath();
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = isForgotten ? 2.5 : 1.5;
          ctx.moveTo(baseP.screenX, baseP.screenY);
          ctx.lineTo(topP.screenX, topP.screenY);
          ctx.stroke();

          // Base Ripple
          ctx.beginPath();
          ctx.arc(baseP.screenX, baseP.screenY, 6, 0, Math.PI * 2);
          ctx.fillStyle = strokeCol;
          ctx.fill();

          // Top Floating Node
          ctx.beginPath();
          ctx.arc(topP.screenX, topP.screenY, 12, 0, Math.PI * 2);
          ctx.fillStyle = strokeCol;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Icon emoji
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isVehicle ? '🚗' : mem.memory_type === 'belonging' ? '🔌' : mem.memory_type === 'document' ? '📁' : '📝', topP.screenX, topP.screenY);

          // Label
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(mem.object || mem.original_text.slice(0, 16), topP.screenX, topP.screenY - 14);

          // Connecting Polyline from user to item if forgotten
          if (isForgotten || isCritical) {
            const userP = project3D(0, 0, 0, centerX, centerY, scale);
            ctx.beginPath();
            ctx.strokeStyle = isForgotten ? 'rgba(239, 68, 68, 0.7)' : 'rgba(245, 158, 11, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.moveTo(userP.screenX, userP.screenY);
            ctx.lineTo(baseP.screenX, baseP.screenY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      });

      // 8. Draw Central User GPS 3D Beacon Pillar
      pulsePhase += 0.05;
      const userBase = project3D(0, 0, 0, centerX, centerY, scale);
      const userTop = project3D(0, 0, 48, centerX, centerY, scale);

      // Expanding Shockwave Rings at User base
      const pulseRingRadius = (Math.sin(pulsePhase) * 0.5 + 0.5) * 26 + 10;
      ctx.beginPath();
      ctx.arc(userBase.screenX, userBase.screenY, pulseRingRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(79, 110, 247, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rising Laser Column
      const laserGrad = ctx.createLinearGradient(userBase.screenX, userBase.screenY, userTop.screenX, userTop.screenY);
      laserGrad.addColorStop(0, 'rgba(79, 110, 247, 0.9)');
      laserGrad.addColorStop(1, 'rgba(56, 189, 248, 1)');
      ctx.beginPath();
      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 3;
      ctx.moveTo(userBase.screenX, userBase.screenY);
      ctx.lineTo(userTop.screenX, userTop.screenY);
      ctx.stroke();

      // User Top Floating Beacon Head
      ctx.beginPath();
      ctx.arc(userTop.screenX, userTop.screenY, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'linear-gradient(135deg, #4F6EF7, #3730a3)';
      ctx.fillStyle = '#4F6EF7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // User Icon
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isLiveTracking ? '🛰️' : '📍', userTop.screenX, userTop.screenY);

      // User Floating Callout Card
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`📍 YOU (${validUserLat.toFixed(4)}, ${validUserLng.toFixed(4)})`, userTop.screenX, userTop.screenY - 18);

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [rotationAngle, pitchAngle, zoomScale, userLatitude, userLongitude, currentLocationName, memories, highlightedLocation, isLiveTracking]);

  // Mouse / Touch Drag to Rotate 3D Camera
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setRotationAngle((prev) => prev + dx * 0.008);
    setPitchAngle((prev) => Math.max(0.3, Math.min(1.3, prev + dy * 0.006)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomScale((prev) => Math.max(0.6, Math.min(3.5, prev - e.deltaY * 0.0015)));
  };

  const reset3DCamera = () => {
    setRotationAngle(0.4);
    setPitchAngle(0.85);
    setZoomScale(1.4);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{
        position: 'relative',
        width: '100%',
        height: '480px',
        minHeight: '480px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(79, 110, 247, 0.3)',
        background: '#080c14',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* 3D Holographic Location Name HUD (Top-Left) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 20,
          background: 'rgba(12, 17, 29, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(79, 110, 247, 0.4)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} className="animate-ping" />
        <div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            🛰️ 3D SPATIAL RADAR MATRIX
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            {currentLocationName}
          </div>
        </div>
      </div>

      {/* 3D Camera Controls (Top-Right) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setZoomScale((prev) => Math.min(3.5, prev + 0.3))}
          title="Zoom In 3D Radar"
          style={{ padding: '6px 10px', background: 'rgba(15, 23, 42, 0.9)', color: '#fff' }}
        >
          <ZoomIn size={14} />
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setZoomScale((prev) => Math.max(0.6, prev - 0.3))}
          title="Zoom Out 3D Radar"
          style={{ padding: '6px 10px', background: 'rgba(15, 23, 42, 0.9)', color: '#fff' }}
        >
          <ZoomOut size={14} />
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={reset3DCamera}
          title="Reset 3D Perspective Angles"
          style={{ padding: '6px 12px', background: 'rgba(15, 23, 42, 0.9)', color: '#38bdf8', fontSize: '0.75rem' }}
        >
          <RotateCcw size={13} />
          <span>Reset 3D</span>
        </button>
      </div>

      {/* Bottom 3D Telemetry HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(12, 17, 29, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '8px 14px',
          fontSize: '0.75rem',
          color: '#cbd5e1',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} color="#38bdf8" />
            <span>Yaw: {Math.round((rotationAngle * 180) / Math.PI)}° | Pitch: {Math.round((pitchAngle * 180) / Math.PI)}°</span>
          </div>
          <div style={{ color: '#64748b' }}>|</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color="#34d399" />
            <span>Sweep: 360° Real-Time</span>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
          💡 Drag with mouse/touch to rotate in 3D • Scroll to zoom
        </div>
      </div>
    </div>
  );
};
