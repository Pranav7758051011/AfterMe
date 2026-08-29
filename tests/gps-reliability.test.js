const assert = require('assert');

console.log('========================================================');
console.log('🛰️ GPS & GEOFENCE RELIABILITY TEST SUITE');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
  }
}

// ─── Mathematical Haversine Benchmark Function ───────────────────────

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

// ─── Test Group 1: Coordinate Range & Validation ─────────────────────

runTest('1. Valid coordinate accepted (San Francisco: 37.7749, -122.4194)', () => {
  assert.strictEqual(isValidCoordinate(37.7749, -122.4194), true);
});

runTest('2. Reject invalid latitude (> 90°)', () => {
  assert.strictEqual(isValidCoordinate(95.0, -122.4194), false);
});

runTest('3. Reject invalid longitude (< -180°)', () => {
  assert.strictEqual(isValidCoordinate(37.7749, -185.0), false);
});

runTest('4. Reject NaN and Infinity coordinates', () => {
  assert.strictEqual(isValidCoordinate(NaN, -122.4194), false);
  assert.strictEqual(isValidCoordinate(37.7749, Infinity), false);
});

// ─── Test Group 2: Haversine Geodesic Distance Math ──────────────────

runTest('5. Identical point distance is exactly 0 meters', () => {
  const d = getDistanceInMeters(37.7749, -122.4194, 37.7749, -122.4194);
  assert.strictEqual(d, 0);
});

runTest('6. Known distance benchmark: SF Conference Room to Office Desk (~202m)', () => {
  const d = getDistanceInMeters(37.7749, -122.4194, 37.7762, -122.4178);
  assert.ok(d >= 195 && d <= 210, `Expected ~202m, got ${d}m`);
});

// ─── Test Group 3: Live Geofence Integration via Backend API ──────────

async function testLiveGeofence() {
  console.log('\n--- Running Live Geofence Integration via Backend API ---');

  async function api(path, method = 'GET', body = null) {
    const res = await fetch(`http://localhost:3001${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test_geo_user' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }

  // 1. Reset user state
  await api('/api/demo/reset', 'POST', { user_id: 'test_geo_user' });

  // 2. Create high-risk memory at Conference Room (lat: 37.7749, lng: -122.4194, radius: 60m)
  await api('/api/memories', 'POST', {
    text: 'I left my black laptop charger in the conference room.',
    current_location: 'Conference Room',
    latitude: 37.7749,
    longitude: -122.4194,
    user_id: 'test_geo_user'
  });

  // 3. User inside geofence (dist ~14m <= 60m): lat 37.7750, lng -122.4193
  totalTests++;
  const insideRes = await api('/api/location/gps', 'POST', {
    latitude: 37.7750,
    longitude: -122.4193,
    accuracy: 5,
    user_id: 'test_geo_user'
  });
  assert.strictEqual(insideRes.data.alerts.length, 0);
  assert.strictEqual(insideRes.data.items_status?.[0]?.is_outside_geofence, false);
  passedTests++;
  console.log('✅ [PASS] 7. Inside geofence (dist: 14m <= 60m): 0 false alarms');

  // 4. Noisy degraded GPS update (accuracy = 250m > 150m threshold) -> Alert suppressed
  totalTests++;
  const noisyRes = await api('/api/location/gps', 'POST', {
    latitude: 37.7780, // Far away coordinates but terrible GPS accuracy
    longitude: -122.4150,
    accuracy: 250, // Degraded satellite fix
    user_id: 'test_geo_user'
  });
  assert.strictEqual(noisyRes.data.alerts.length, 0, 'Noisy GPS should be suppressed');
  passedTests++;
  console.log('✅ [PASS] 8. Degraded GPS accuracy (> 150m) suppressed to prevent noisy false alarm');

  // 5. Clean GPS Departure (dist ~202m > 60m, accuracy = 5m) -> Trigger Alert
  totalTests++;
  const outsideRes = await api('/api/location/gps', 'POST', {
    latitude: 37.7762,
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'test_geo_user'
  });
  assert.strictEqual(outsideRes.data.alerts.length, 1);
  assert.strictEqual(outsideRes.data.items_status?.[0]?.is_outside_geofence, true);
  passedTests++;
  console.log('✅ [PASS] 9. Geofence departure (dist: 202m > 60m): Alert triggered');

  // 6. Bad GPS coordinates validation test
  totalTests++;
  const badRes = await api('/api/location/gps', 'POST', {
    latitude: 100.5, // Invalid lat
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'test_geo_user'
  });
  assert.strictEqual(badRes.status, 400);
  passedTests++;
  console.log('✅ [PASS] 10. Out-of-bounds coordinates rejected with HTTP 400 Bad Request');

  console.log('\n========================================================');
  console.log(`📊 GPS RELIABILITY RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');
  if (passedTests < totalTests) process.exit(1);
}

testLiveGeofence().catch(err => {
  console.error('Geofence test runner error:', err);
  process.exit(1);
});
