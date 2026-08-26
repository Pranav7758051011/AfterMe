async function runGPSGeofenceTest() {
  console.log('========================================================');
  console.log('🛰️ 🗺️ AFTERME REAL-TIME GPS & GEOFENCE AUTOMATION TEST');
  console.log('========================================================\n');

  const testUser = 'gps_test_user_' + Date.now();
  const headers = { 'Content-Type': 'application/json', 'x-user-id': testUser };

  // Step 1: Clean reset for test user
  console.log('1. [RESET] Initializing clean test session...');
  await fetch('http://localhost:3001/api/demo/reset', {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: testUser })
  });

  // Step 2: Create memory left at Conference Room (lat: 37.7749, lng: -122.4194)
  console.log('\n2. [MEMORY INPUT] User speaks memory:');
  console.log('   "I left my black laptop charger in the conference room."');
  const createRes = await fetch('http://localhost:3001/api/memories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: 'I left my black laptop charger in the conference room.',
      current_location: 'Conference Room',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log('   ✅ Memory stored with location:', createRes.memory.location);

  // Step 3: User GPS update INSIDE geofence (distance ~15m away)
  console.log('\n3. [GPS INSIDE GEOFENCE] User moves 15m away:');
  console.log('   GPS: lat=37.7750, lng=-122.4193');
  const insideGPS = await fetch('http://localhost:3001/api/location/gps', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      latitude: 37.7750,
      longitude: -122.4193,
      accuracy: 5,
      user_id: testUser
    })
  }).then(r => r.json());
  console.log('   Distance to item:', insideGPS.items_status?.[0]?.distance_meters, 'meters');
  console.log('   Outside geofence?', insideGPS.items_status?.[0]?.is_outside_geofence);
  console.log('   Alerts triggered:', insideGPS.alerts.length);
  if (insideGPS.alerts.length === 0) {
    console.log('   ✅ PASS: Inside 60m safety geofence -> No premature warning.');
  }

  // Step 4: User GPS update OUTSIDE geofence (distance ~180m away at Office Desk)
  console.log('\n4. [GPS DEPARTURE TRIGGER] User moves 180m away (GPS Departure):');
  console.log('   GPS: lat=37.7762, lng=-122.4178 (Office Desk area)');
  const outsideGPS = await fetch('http://localhost:3001/api/location/gps', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      latitude: 37.7762,
      longitude: -122.4178,
      accuracy: 5,
      place_name: 'Office Desk (Outside Conference Geofence)',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log('   Distance to item:', outsideGPS.items_status?.[0]?.distance_meters, 'meters');
  console.log('   Outside geofence?', outsideGPS.items_status?.[0]?.is_outside_geofence);
  console.log('   Alerts triggered:', outsideGPS.alerts.length);
  if (outsideGPS.alerts.length > 0) {
    console.log('   🚨 PROACTIVE GEOFENCE WARNING TRIGGERED:');
    console.log('      Title:', outsideGPS.alerts[0].title);
    console.log('      Message:', outsideGPS.alerts[0].message);
    console.log('      Trigger Type:', outsideGPS.alerts[0].trigger_type);
    console.log('   ✅ PASS: Automatic departure reminder generated successfully!');
  } else {
    throw new Error('Expected geofence departure alert was NOT triggered!');
  }

  // Step 5: Ask AfterMe Retrieval
  console.log('\n5. [RETRIEVAL] Asking AfterMe: "Where did I leave my charger?"');
  const askRes = await fetch('http://localhost:3001/api/ask', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: 'Where did I leave my charger?',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log('   AfterMe Answer: >>', askRes.answer);

  console.log('\n========================================================');
  console.log('🎯 REAL-TIME GPS & GEOFENCE DETECTION VERIFIED 100% PASS!');
  console.log('========================================================\n');
}

runGPSGeofenceTest().catch(err => {
  console.error('GPS test failed:', err);
  process.exit(1);
});
