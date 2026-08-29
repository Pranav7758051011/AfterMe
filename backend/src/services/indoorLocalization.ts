/**
 * AfterMe — Indoor Micro-Localization & BLE Beacon Triangulation Engine
 * 
 * Computes sub-room indoor positioning using:
 * 1. Log-Distance Path Loss Model (RSSI -> Distance in meters)
 * 2. Multi-Beacon 2D Least-Squares Trilateration
 * 3. Indoor Zone / Room Boundary Classifier
 */

export interface BeaconSignal {
  beaconId: string;
  rssi: number;
  txPower?: number; // RSSI at 1 meter (default: -59 dBm)
  x?: number;       // Known beacon indoor X coordinate in meters
  y?: number;       // Known beacon indoor Y coordinate in meters
  zoneName?: string;
}

export interface IndoorLocationResult {
  estimatedX: number;
  estimatedY: number;
  nearestBeaconId: string;
  resolvedZone: string;
  confidence: number;
  signalsCount: number;
}

export interface IndoorZoneDefinition {
  name: string;
  x: number;
  y: number;
  radiusMeters: number;
}

// ─── Default Known Office Indoor Anchors ──────────────────────────────

export const DEFAULT_INDOOR_BEACONS: Record<string, { x: number; y: number; zone: string; txPower: number }> = {
  'beacon_conf_room_1': { x: 5.0, y: 15.0, zone: 'Conference Room Alpha', txPower: -59 },
  'beacon_desk_bay_2': { x: 25.0, y: 10.0, zone: 'Workstation Bay B', txPower: -59 },
  'beacon_cafeteria_3': { x: 45.0, y: 30.0, zone: 'Cafeteria & Lounge', txPower: -59 },
  'beacon_library_pod': { x: 12.0, y: 35.0, zone: 'Library Study Pod', txPower: -59 },
};

// ─── Log-Distance Path Loss Model ────────────────────────────────────

/**
 * Calculates estimated distance from RSSI using the Log-Distance Path Loss formula:
 * d = 10 ^ ((txPower - RSSI) / (10 * n))
 * 
 * @param rssi Measured Received Signal Strength Indicator in dBm
 * @param txPower Reference RSSI at 1 meter (typically -59 dBm)
 * @param pathLossExponent Environmental path loss exponent (2.0 for free space, 2.5 - 3.5 for indoor office)
 * @returns Estimated distance in meters (clamped between 0.1m and 100m)
 */
export function calculateDistanceFromRSSI(
  rssi: number,
  txPower = -59,
  pathLossExponent = 2.5
): number {
  if (rssi === 0 || !isFinite(rssi)) return -1.0;
  if (rssi >= txPower) return 0.5; // Very close (< 1m)

  const ratio = (txPower - rssi) / (10 * pathLossExponent);
  const distance = Math.pow(10, ratio);
  return Math.round(Math.min(Math.max(distance, 0.1), 100.0) * 100) / 100;
}

// ─── 2D Least-Squares Trilateration ──────────────────────────────────

/**
 * Computes 2D position (x, y) from 3+ anchor beacons with known coordinates and measured distances
 */
export function trilateratePosition(
  beacons: { x: number; y: number; distance: number }[]
): { x: number; y: number; confidence: number } {
  if (!beacons || beacons.length === 0) {
    return { x: 0, y: 0, confidence: 0 };
  }

  if (beacons.length === 1) {
    return { x: beacons[0].x, y: beacons[0].y, confidence: 0.5 };
  }

  if (beacons.length === 2) {
    // Weighted midpoint between 2 beacons
    const b1 = beacons[0];
    const b2 = beacons[1];
    const totalDist = b1.distance + b2.distance || 1;
    const w1 = 1 - (b1.distance / totalDist);
    const w2 = 1 - (b2.distance / totalDist);
    const sumW = w1 + w2 || 1;
    return {
      x: Math.round(((b1.x * w1) + (b2.x * w2)) / sumW * 10) / 10,
      y: Math.round(((b1.y * w1) + (b2.y * w2)) / sumW * 10) / 10,
      confidence: 0.7
    };
  }

  // Linear least squares matrix for 3+ points:
  // 2*(x2 - x1)*x + 2*(y2 - y1)*y = (r1^2 - r2^2) + (x2^2 - x1^2) + (y2^2 - y1^2)
  const p1 = beacons[0];
  const p2 = beacons[1];
  const p3 = beacons[2];

  const A = 2 * (p2.x - p1.x);
  const B = 2 * (p2.y - p1.y);
  const C = (p1.distance * p1.distance) - (p2.distance * p2.distance) - (p1.x * p1.x) + (p2.x * p2.x) - (p1.y * p1.y) + (p2.y * p2.y);

  const D = 2 * (p3.x - p2.x);
  const E = 2 * (p3.y - p2.y);
  const F = (p2.distance * p2.distance) - (p3.distance * p3.distance) - (p2.x * p2.x) + (p3.x * p3.x) - (p2.y * p2.y) + (p3.y * p3.y);

  const denominator = (A * E) - (B * D);
  if (Math.abs(denominator) < 1e-6) {
    // Collinear points fallback
    return {
      x: (p1.x + p2.x + p3.x) / 3,
      y: (p1.y + p2.y + p3.y) / 3,
      confidence: 0.6
    };
  }

  const x = ((C * E) - (F * B)) / denominator;
  const y = ((A * F) - (C * D)) / denominator;

  return {
    x: Math.round(Math.max(0, x) * 10) / 10,
    y: Math.round(Math.max(0, y) * 10) / 10,
    confidence: 0.95
  };
}

// ─── Indoor Zone Resolution ──────────────────────────────────────────

/**
 * Resolves indoor micro-zone based on beacon signals
 */
export function resolveIndoorPosition(signals: BeaconSignal[]): IndoorLocationResult {
  if (!signals || signals.length === 0) {
    return {
      estimatedX: 0,
      estimatedY: 0,
      nearestBeaconId: 'none',
      resolvedZone: 'Unknown Indoor Location',
      confidence: 0,
      signalsCount: 0
    };
  }

  // Sort signals by strongest RSSI (highest dBm value, e.g. -50 > -85)
  const sorted = [...signals].sort((a, b) => b.rssi - a.rssi);
  const strongest = sorted[0];

  const enriched = sorted.map(s => {
    const known = DEFAULT_INDOOR_BEACONS[s.beaconId];
    const tx = s.txPower || known?.txPower || -59;
    const x = s.x ?? known?.x ?? 0;
    const y = s.y ?? known?.y ?? 0;
    const zone = s.zoneName || known?.zone || 'Indoor Zone';
    const dist = calculateDistanceFromRSSI(s.rssi, tx);
    return { ...s, x, y, txPower: tx, distance: dist, zone };
  });

  const triangulated = trilateratePosition(enriched);
  const nearestKnown = enriched[0];

  return {
    estimatedX: triangulated.x,
    estimatedY: triangulated.y,
    nearestBeaconId: strongest.beaconId,
    resolvedZone: nearestKnown.zone,
    confidence: triangulated.confidence,
    signalsCount: signals.length
  };
}
