const assert = require('assert');

console.log('========================================================');
console.log('🛡️ MILESTONE 5: FALSE POSITIVE & DUPLICATE ALERT PROTECTION TEST');
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

  // STEP 5: Dismiss alert while still outside -> Must NOT immediately re-alert
  totalTests++;
  const alertId = activeAlerts2.data.alerts[0].id;
  await api(`/api/location/alerts/${alertId}/dismiss`, 'POST');
  
  // Send another GPS update while outside
  await api('/api/location/gps', 'POST', {
    latitude: 37.7770,
    longitude: -122.4170,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const activeAlerts3 = await api('/api/location/alerts', 'GET');
  assert.strictEqual(activeAlerts3.data.count, 0, 'Dismissed alert must not immediately respawn while outside');
  passedTests++;
  console.log('✅ [PASS] 3. Dismissed alert stays suppressed during current departure session');

  // STEP 6: Re-entry inside geofence -> Re-arms the departure trigger
  totalTests++;
  const reEnterRes = await api('/api/location/gps', 'POST', {
    latitude: 37.7749, // Exactly at Conference Room (0m away)
    longitude: -122.4194,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const itemStatus = reEnterRes.data.items_status.find(i => i.memory_id === memId);
  assert.strictEqual(itemStatus.is_outside_geofence, false);
  passedTests++;
  console.log('✅ [PASS] 4. Re-entry inside geofence resets state and re-arms departure detector');

  // STEP 7: Second Departure -> Must trigger a fresh proactive alert!
  totalTests++;
  const exit2 = await api('/api/location/gps', 'POST', {
    latitude: 37.7762, // 202m away
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const activeAlerts4 = await api('/api/location/alerts', 'GET');
  assert.strictEqual(activeAlerts4.data.count, 1, 'Re-departure after re-entry must fire new alert');
  passedTests++;
  console.log('✅ [PASS] 5. Subsequent exit after re-entry fires new proactive departure alert');

  // STEP 8: Mark memory as retrieved -> Departures no longer alert
  totalTests++;
  await api(`/api/memories/${memId}/status`, 'PATCH', { status: 'retrieved' });
  await api(`/api/location/alerts/${activeAlerts4.data.alerts[0].id}/dismiss`, 'POST');

  await api('/api/location/gps', 'POST', {
    latitude: 37.7812, // 1000m away (Home)
    longitude: -122.4085,
    accuracy: 5,
    user_id: 'test_dedup_user'
  });
  const activeAlerts5 = await api('/api/location/alerts', 'GET');
  assert.strictEqual(activeAlerts5.data.count, 0, 'Retrieved items must never fire departure alerts');
  passedTests++;
  console.log('✅ [PASS] 6. Retrieved/completed items completely suppress departure alerts');

  console.log('\n========================================================');
  console.log(`📊 MILESTONE 5 RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================\n');
}

testAlertDeduplication().catch(err => {
  console.error('Alert protection test runner error:', err);
});
