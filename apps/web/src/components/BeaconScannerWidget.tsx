import React, { useState, useEffect } from 'react';
import { 
  Bluetooth, Radio, RefreshCw, Plus, Trash2, Battery, 
  CheckCircle2, AlertCircle, Signal, Tag, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useBLEBeacon } from '../hooks/useBLEBeacon';

interface BeaconScannerWidgetProps {
  onLocateMemory?: (memoryId: string) => void;
}

export const BeaconScannerWidget: React.FC<BeaconScannerWidgetProps> = ({ onLocateMemory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const { beacons, isScanning, isBluetoothSupported, error, scanRealBluetooth, pulseBeacons, addCustomBeacon, removeBeacon } = useBLEBeacon();

  // Pulse beacon RSSI every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(pulseBeacons, 3500);
    return () => clearInterval(interval);
  }, [pulseBeacons]);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim()) return;
    addCustomBeacon(`🏷️ ${newTagText.trim()}`, 1.8);
    setNewTagText('');
  };

  const getDistanceBadge = (meters: number) => {
    if (meters <= 1.5) {
      return { label: 'Immediate (< 1.5m)', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981' };
    }
    if (meters <= 4.0) {
      return { label: `Nearby (~${meters}m)`, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' };
    }
    return { label: `Far Away (~${meters}m)`, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' };
  };

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(2, 132, 199, 0.5)',
            }}
          >
            <Bluetooth size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
                Indoor BLE Beacon Radar
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                Sub-2m Precision
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Tracks nearby Apple AirTags, Tile Mates, & Bluetooth physical belongings
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={scanRealBluetooth}
            disabled={isScanning}
            style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
            title="Scan for physical Bluetooth Low Energy tags"
          >
            <Radio size={13} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Scanning...' : 'Pair Real BLE Tag'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Collapse Radar' : 'Expand Radar'}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Active Beacon Cards (Collapsible) */}
      {isOpen && (
        <div style={{ marginTop: '16px', animation: 'fadeIn 0.25s ease' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            {beacons.map((beacon) => {
              const badge = getDistanceBadge(beacon.distanceMeters);
              return (
                <div
                  key={beacon.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: `1px solid ${badge.border}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: `0 4px 14px ${badge.bg}`,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                      {beacon.name}
                    </div>
                    <button
                      onClick={() => removeBeacon(beacon.id)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      title="Remove beacon"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <div
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <span>RSSI: {beacon.rssi} dBm</span>
                      {beacon.batteryLevel !== undefined && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#34d399' }}>
                          <Battery size={13} /> {beacon.batteryLevel}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Custom Beacon Tag */}
          <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder='Add simulated tag (e.g. "AirTag (Backpack)", "Tile (Passport)")...'
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              className="capture-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={!newTagText.trim()}
              style={{ padding: '8px 14px' }}
            >
              <Plus size={14} />
              <span>Add Beacon</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
