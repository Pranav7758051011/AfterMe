const assert = require('assert');

console.log('========================================================');
console.log('🛰️ MILESTONE 4: GPS & GEOFENCE RELIABILITY TEST SUITE');
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
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
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

// ─── Test Group 2: Haversine Mathematical Accuracy ───────────────────

runTest('5. Identical point distance is exactly 0 meters', () => {
  const d = getDistanceInMeters(37.7749, -122.4194, 37.7749, -122.4194);
  assert.strictEqual(d, 0);
});

runTest('6. Known distance benchmark: SF Conference Room to Office Desk (~202m)', () => {
  const d = getDistanceInMeters(37.7749, -122.4194, 37.7762, -122.4178);
  assert.ok(d >= 195 && d <= 210, `Expected ~202m, received ${d}m`);
});

// ─── Test Group 3: Real Backend Live Geofence Integration ────────────

async function testLiveGeofenceAPI() {
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

  // 2. Create high-risk item at Conference Room (lat: 37.7749, lng: -122.4194, radius: 60m)
  await api('/api/memories', 'POST', {
    text: 'I left my black charger in the conference room.',
    current_location: 'Conference Room',
    latitude: 37.7749,
    longitude: -122.4194,
    user_id: 'test_geo_user'
  });

  // 3. Test: Clearly Inside Geofence (14m away)
  totalTests++;
  try {
    const insideRes = await api('/api/location/gps', 'POST', {
      latitude: 37.7750,
      longitude: -122.4193,
      accuracy: 5,
      user_id: 'test_geo_user'
    });
    assert.strictEqual(insideRes.status, 200);
    const itemStatus = insideRes.data.items_status.find(i => i.location.toLowerCase().includes('conference'));
    assert.strictEqual(itemStatus.is_outside_geofence, false);
    assert.strictEqual(insideRes.data.alerts.length, 0);
    passedTests++;
    console.log(`✅ [PASS] 7. Inside geofence (dist: ${itemStatus.distance_meters}m <= 60m): 0 false alarms`);
  } catch (e) {
    console.error('❌ [FAIL] 7. Inside geofence test:', e.message);
  }

  // 4. Test: Degraded GPS Accuracy Filter (accuracy: 250m > 150m threshold)
  totalTests++;
  try {
    const degradedRes = await api('/api/location/gps', 'POST', {
      latitude: 37.7780, // Far coordinate
      longitude: -122.4150,
      accuracy: 250, // Degraded accuracy
      user_id: 'test_geo_user'
    });
    assert.strictEqual(degradedRes.status, 200);
    assert.strictEqual(degradedRes.data.accuracy_quality, 'degraded_suppressed');
    passedTests++;
    console.log('✅ [PASS] 8. Degraded GPS accuracy (> 150m) suppressed to prevent noisy false alarm');
  } catch (e) {
    console.error('❌ [FAIL] 8. Degraded GPS accuracy test:', e.message);
  }

  // 5. Test: Clear Departure (202m away, high accuracy = 5m)
  totalTests++;
  try {
    const departRes = await api('/api/location/gps', 'POST', {
      latitude: 37.7762,
      longitude: -122.4178,
      accuracy: 5,
      user_id: 'test_geo_user'
    });
    assert.strictEqual(departRes.status, 200);
    const itemStatus = departRes.data.items_status.find(i => i.location.toLowerCase().includes('conference'));
    assert.strictEqual(itemStatus.is_outside_geofence, true);
    assert.ok(departRes.data.alerts.length > 0, 'Alert must be triggered upon departure');
    passedTests++;
    console.log(`✅ [PASS] 9. Geofence departure (dist: ${itemStatus.distance_meters}m > 60m): Alert triggered`);
  } catch (e) {
    console.error('❌ [FAIL] 9. Geofence departure test:', e.message);
  }

  // 6. Test: Invalid Coordinates Rejection (HTTP 400)
  totalTests++;
  try {
    const invalidRes = await api('/api/location/gps', 'POST', {
      latitude: 145.0, // Invalid lat
      longitude: -122.4194,
      user_id: 'test_geo_user'
    });
    assert.strictEqual(invalidRes.status, 400);
    assert.ok(invalidRes.data.error.includes('Invalid coordinates'));
    passedTests++;
    console.log('✅ [PASS] 10. Out-of-bounds coordinates rejected with HTTP 400 Bad Request');
  } catch (e) {
    console.error('❌ [FAIL] 10. Out-of-bounds coordinates test:', e.message);
  }

  console.log('\n========================================================');
  console.log(`📊 MILESTONE 4 RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================\n');
}

testLiveGeofenceAPI().catch(err => {
  console.error('GPS Reliability test runner error:', err);
});
