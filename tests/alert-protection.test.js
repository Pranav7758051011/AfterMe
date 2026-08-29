const assert = require('assert');

console.log('========================================================');
console.log('🛡️ ALERT DEDUPLICATION & STATE TRACKING TEST');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

async function testAlertDeduplication() {
  async function api(path, method = 'GET', body = null) {
    const res = await fetch(`http://localhost:3001${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test_dedup_user' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }

  // STEP 1: Reset test user
  await api('/api/demo/reset', 'POST', { user_id: 'test_dedup_user' });

  // STEP 2: Create high-risk memory at Conference Room (lat: 37.7749, lng: -122.4194, radius: 60m)
  const memRes = await api('/api/memories', 'POST', {
    text: 'I left my black laptop charger in the conference room.',
    current_location: 'Conference Room',
    latitude: 37.7749,
    longitude: -122.4194,
    user_id: 'test_dedup_user'
  });
  const memId = memRes.data.memory.id;

  // STEP 3: Initial Departure -> Should trigger EXACTLY 1 alert
  totalTests++;
  const exit1 = await api('/api/location/gps', 'POST', {
    latitude: 37.7762, // 202m away (Office area)
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const activeAlerts1 = await api('/api/location/alerts', 'GET');
  assert.strictEqual(activeAlerts1.data.count, 1);
  passedTests++;
  console.log('✅ [PASS] 1. Initial departure triggers exactly 1 alert');

  // STEP 4: Continued updates while outside -> Must NOT create duplicate spam alerts
  totalTests++;
  for (let i = 0; i < 3; i++) {
    await api('/api/location/gps', 'POST', {
      latitude: 37.7765 + (i * 0.0001),
      longitude: -122.4175 + (i * 0.0001),
      accuracy: 5,
      user_id: 'test_dedup_user'
    });
  }
  const activeAlerts2 = await api('/api/location/alerts', 'GET');
  assert.strictEqual(activeAlerts2.data.count, 1, `Expected exactly 1 alert, but found ${activeAlerts2.data.count}`);
  passedTests++;
  console.log('✅ [PASS] 2. Multiple GPS ticks outside geofence: Duplicate spam suppressed (1 alert remains)');

  // STEP 5: Dismiss the alert -> Stays suppressed while still outside
  totalTests++;
  const alertId = activeAlerts2.data.alerts[0].id;
  await api(`/api/location/alerts/${alertId}/dismiss`, 'POST', { user_id: 'test_dedup_user' });

  // Update GPS again while outside
  await api('/api/location/gps', 'POST', {
    latitude: 37.7768,
    longitude: -122.4170,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const activeAlertsAfterDismiss = await api('/api/location/alerts', 'GET');
  assert.strictEqual(activeAlertsAfterDismiss.data.count, 0, 'Dismissed alert should not immediately recreate while still outside');
  passedTests++;
  console.log('✅ [PASS] 3. Dismissed alert stays suppressed during current departure session');

  // STEP 6: User RE-ENTERS the conference room (lat: 37.7749, lng: -122.4194) -> Re-arm state machine
  totalTests++;
  await api('/api/location/gps', 'POST', {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const reEnterAlerts = await api('/api/location/alerts', 'GET');
  assert.strictEqual(reEnterAlerts.data.count, 0);
  passedTests++;
  console.log('✅ [PASS] 4. Re-entry inside geofence resets state and re-arms departure detector');

  // STEP 7: User leaves AGAIN -> New departure alert SHOULD fire
  totalTests++;
  await api('/api/location/gps', 'POST', {
    latitude: 37.7762,
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const secondDepartureAlerts = await api('/api/location/alerts', 'GET');
  assert.strictEqual(secondDepartureAlerts.data.count, 1, 'Re-armed state must trigger alert on subsequent departure');
  passedTests++;
  console.log('✅ [PASS] 5. Subsequent exit after re-entry fires new proactive departure alert');

  // STEP 8: Mark memory retrieved -> Geofencing completely ignores retrieved item
  totalTests++;
  await api(`/api/memories/${memId}/status`, 'PATCH', { status: 'retrieved', user_id: 'test_dedup_user' });
  await api(`/api/location/alerts/${secondDepartureAlerts.data.alerts[0].id}/dismiss`, 'POST', { user_id: 'test_dedup_user' });

  // Move far away again
  await api('/api/location/gps', 'POST', {
    latitude: 37.7800,
    longitude: -122.4100,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const retrievedStateAlerts = await api('/api/location/alerts', 'GET');
  assert.strictEqual(retrievedStateAlerts.data.count, 0, 'Retrieved memory should never generate departure alert');
  passedTests++;
  console.log('✅ [PASS] 6. Retrieved/completed items completely suppress departure alerts');

  console.log('\n========================================================');
  console.log(`📊 ALERT DEDUPLICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');
  if (passedTests < totalTests) process.exit(1);
}

testAlertDeduplication().catch(err => {
  console.error('Alert test runner error:', err);
  process.exit(1);
});
