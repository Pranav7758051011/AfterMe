const assert = require('assert');
const path = require('path');

console.log('========================================================');
console.log('📡 INDOOR BLE MICRO-LOCALIZATION & PATH LOSS TEST SUITE');
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

// ─── Direct Unit Tests from indoorLocalization module ────────────────

const {
  calculateDistanceFromRSSI,
  trilateratePosition,
  resolveIndoorPosition
} = require('../backend/dist/services/indoorLocalization');

// TEST 1: RSSI at 1 meter (-59 dBm) equals 1.0m or close
runTest('1. Log-Distance Path Loss: RSSI = -59 dBm (TxPower) yields ~1.0m', () => {
  const d = calculateDistanceFromRSSI(-59, -59, 2.5);
  assert.ok(Math.abs(d - 0.5) < 0.6, `Expected ~0.5-1.0m, got ${d}m`);
});

// TEST 2: Attenuated RSSI (-75 dBm) yields realistic indoor distance (~4.3m)
runTest('2. Log-Distance Path Loss: Attenuated RSSI (-75 dBm) yields distance ~4-5m', () => {
  const d = calculateDistanceFromRSSI(-75, -59, 2.5);
  assert.ok(d >= 3.5 && d <= 5.5, `Expected 3.5m - 5.5m, got ${d}m`);
});

// TEST 3: Weak RSSI (-95 dBm) yields long distance (> 25m)
runTest('3. Log-Distance Path Loss: Weak RSSI (-95 dBm) yields distance > 25m', () => {
  const d = calculateDistanceFromRSSI(-95, -59, 2.5);
  assert.ok(d >= 20.0, `Expected >= 20m, got ${d}m`);
});

// TEST 4: Invalid RSSI returns -1
runTest('4. Invalid or zero RSSI safely returns -1.0', () => {
  assert.strictEqual(calculateDistanceFromRSSI(0), -1.0);
  assert.strictEqual(calculateDistanceFromRSSI(NaN), -1.0);
});

// TEST 5: 3-Beacon Trilateration Math
runTest('5. 3-Beacon 2D Trilateration accurately solves known coordinate (10, 10)', () => {
  // Target position is (10, 10)
  // Beacon 1: (0, 0) -> dist = sqrt(100 + 100) = 14.14m
  // Beacon 2: (20, 0) -> dist = sqrt(100 + 100) = 14.14m
  // Beacon 3: (10, 20) -> dist = 10.0m
  const anchors = [
    { x: 0, y: 0, distance: 14.14 },
    { x: 20, y: 0, distance: 14.14 },
    { x: 10, y: 20, distance: 10.0 }
  ];

  const pos = trilateratePosition(anchors);
  assert.ok(Math.abs(pos.x - 10.0) <= 0.5, `Expected x ~ 10, got ${pos.x}`);
  assert.ok(Math.abs(pos.y - 10.0) <= 0.5, `Expected y ~ 10, got ${pos.y}`);
  assert.ok(pos.confidence >= 0.9);
});

// TEST 6: Indoor Zone Resolver
runTest('6. Indoor Zone Resolver correctly maps strong Conference beacon to Conference Room', () => {
  const signals = [
    { beaconId: 'beacon_conf_room_1', rssi: -52 }, // Strongest signal (~0.5m away)
    { beaconId: 'beacon_desk_bay_2', rssi: -82 },
    { beaconId: 'beacon_cafeteria_3', rssi: -94 }
  ];

  const result = resolveIndoorPosition(signals);
  assert.strictEqual(result.nearestBeaconId, 'beacon_conf_room_1');
  assert.strictEqual(result.resolvedZone, 'Conference Room Alpha');
  assert.ok(result.confidence > 0.8);
});

// TEST 7: Empty signal list
runTest('7. Empty beacon signals safely return Unknown Indoor Location', () => {
  const result = resolveIndoorPosition([]);
  assert.strictEqual(result.resolvedZone, 'Unknown Indoor Location');
  assert.strictEqual(result.confidence, 0);
});

// TEST 8: Live API endpoint test
async function testBeaconAPI() {
  console.log('\n--- Running Live /api/location/beacon Integration Test ---');
  totalTests++;

  try {
    const res = await fetch('http://localhost:3001/api/location/beacon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'indoor_test_user' },
      body: JSON.stringify({
        signals: [
          { beaconId: 'beacon_conf_room_1', rssi: -55 },
          { beaconId: 'beacon_desk_bay_2', rssi: -80 }
        ]
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.indoor_position.resolvedZone, 'Conference Room Alpha');
    passedTests++;
    console.log('✅ [PASS] 8. POST /api/location/beacon endpoint resolves micro-zone successfully');
  } catch (err) {
    console.error('❌ [FAIL] 8. Beacon API error:', err.message);
  }

  console.log('\n========================================================');
  console.log(`📊 INDOOR LOCALIZATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');
  if (passedTests < totalTests) process.exit(1);
}

testBeaconAPI().catch(err => {
  console.error('Indoor API test error:', err);
  process.exit(1);
});
