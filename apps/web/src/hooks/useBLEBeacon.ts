import { useState, useCallback, useRef } from 'react';

export interface BLEBeacon {
  id: string;
  name: string;
  rssi: number;
  distanceMeters: number;
  lastSeen: number;
  batteryLevel?: number;
  linkedMemoryId?: string;
  isSimulated?: boolean;
}

export function useBLEBeacon() {
  const [beacons, setBeacons] = useState<BLEBeacon[]>([
    {
      id: 'beacon-airtag-01',
      name: '🏷️ Apple AirTag (Keys)',
      rssi: -58,
      distanceMeters: 1.2,
      lastSeen: Date.now(),
      batteryLevel: 94,
      isSimulated: true,
    },
    {
      id: 'beacon-tile-charger',
      name: '🔋 Tile Mate (Laptop Charger)',
      rssi: -65,
      distanceMeters: 2.1,
      lastSeen: Date.now(),
      batteryLevel: 88,
      isSimulated: true,
    }
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  // Real Web Bluetooth Device Pairing / Scan
  const scanRealBluetooth = useCallback(async () => {
    if (!isBluetoothSupported) {
      setError('Web Bluetooth is not supported on this browser (Chrome, Edge, or Opera required).');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information', 'generic_access']
      });

      const newBeacon: BLEBeacon = {
        id: device.id,
        name: device.name || 'Nearby BLE Device',
        rssi: -60,
        distanceMeters: 1.5,
        lastSeen: Date.now(),
        batteryLevel: 90,
        isSimulated: false,
      };

      setBeacons((prev) => [newBeacon, ...prev.filter((b) => b.id !== device.id)]);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.warn('Bluetooth scan error:', err);
        setError(err.message || 'Failed to connect to Bluetooth device.');
      }
    } finally {
      setIsScanning(false);
    }
  }, [isBluetoothSupported]);

  // Simulate Proximity Pulse
  const pulseBeacons = useCallback(() => {
    setBeacons((prev) =>
      prev.map((b) => {
        const delta = (Math.random() - 0.5) * 6;
        const newRssi = Math.min(-40, Math.max(-95, Math.round(b.rssi + delta)));
        // Approximate distance formula: 10 ^ ((TxPower - RSSI) / (10 * n))
        const dist = parseFloat(Math.pow(10, (-59 - newRssi) / 20).toFixed(1));
        return {
          ...b,
          rssi: newRssi,
          distanceMeters: dist,
          lastSeen: Date.now(),
        };
      })
    );
  }, []);

  // Add custom simulated beacon
  const addCustomBeacon = (name: string, distMeters: number) => {
    const id = `beacon-${Date.now()}`;
    const rssi = Math.round(-59 - 20 * Math.log10(distMeters));
    const newBeacon: BLEBeacon = {
      id,
      name,
      rssi,
      distanceMeters: distMeters,
      lastSeen: Date.now(),
      batteryLevel: 100,
      isSimulated: true,
    };
    setBeacons((prev) => [newBeacon, ...prev]);
  };

  const removeBeacon = (id: string) => {
    setBeacons((prev) => prev.filter((b) => b.id !== id));
  };

  return {
    beacons,
    isScanning,
    isBluetoothSupported,
    error,
    scanRealBluetooth,
    pulseBeacons,
    addCustomBeacon,
    removeBeacon,
  };
}
