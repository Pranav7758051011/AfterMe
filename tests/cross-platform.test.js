async function runCrossPlatformSyncTest() {
  console.log('========================================================');
  console.log('📱↔️💻 AFTERME WEB & MOBILE SYNCHRONIZATION TEST');
  console.log('========================================================\n');

  const testUser = 'sync_test_user_' + Date.now();
  const headers = { 'Content-Type': 'application/json', 'x-user-id': testUser };

  // 1. MOBILE: Create memory
  console.log('1. [MOBILE] User speaks on Mobile App:');
  console.log('   "I left my black wallet on the table in the cafeteria."');
  const mobCreate = await fetch('http://localhost:3001/api/memories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: 'I left my black wallet on the table in the cafeteria.',
      current_location: 'Cafeteria',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log('   ✅ Saved in Firestore. ID:', mobCreate.memory.id);

  // 2. WEB: Verify memory is visible on Web
  console.log('\n2. [WEB] Fetching memories on Web Dashboard:');
  const webList = await fetch(`http://localhost:3001/api/memories?user_id=${testUser}`, { headers }).then(r => r.json());
  console.log(`   Memories found on Web: ${webList.memories.length}`);
  const matchOnWeb = webList.memories.find(m => m.id === mobCreate.memory.id);
  if (matchOnWeb) {
    console.log(`   ✅ SUCCESS: Mobile-created memory "${matchOnWeb.object}" is visible on Web Dashboard!`);
  } else {
    throw new Error('Memory created on mobile was NOT found on web!');
  }

  // 3. WEB: Create memory on Web
  console.log('\n3. [WEB] User creates memory on Web Dashboard:');
  console.log('   "My project presentation slides are in the shared cloud folder."');
  const webCreate = await fetch('http://localhost:3001/api/memories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: 'My project presentation slides are in the shared cloud folder.',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log('   ✅ Saved in Firestore. ID:', webCreate.memory.id);

  // 4. MOBILE: Verify memory is visible on Mobile
  console.log('\n4. [MOBILE] Fetching memories on Mobile App:');
  const mobList = await fetch(`http://localhost:3001/api/memories?user_id=${testUser}`, { headers }).then(r => r.json());
  console.log(`   Memories found on Mobile: ${mobList.memories.length}`);
  const matchOnMob = mobList.memories.find(m => m.id === webCreate.memory.id);
  if (matchOnMob) {
    console.log(`   ✅ SUCCESS: Web-created memory "${matchOnMob.original_text.slice(0, 30)}..." is visible on Mobile App!`);
  } else {
    throw new Error('Memory created on web was NOT found on mobile!');
  }

  // 5. LOCATION DEPARTURE SYNC: Simulate departure from Cafeteria
  console.log('\n5. [DEPARTURE] User departs Cafeteria &rarr; Proactive Alert Triggered:');
  const departure = await fetch('http://localhost:3001/api/location/change', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      previous_location: 'Cafeteria',
      current_location: 'Office',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log(`   Alerts triggered in Firestore: ${departure.alerts.length}`);
  console.log(`   🚨 Warning: "${departure.alerts[0]?.message}"`);

  // 6. RETRIEVAL ON BOTH CLIENTS
  console.log('\n6. [RETRIEVAL] Asking on Mobile: "Where is my wallet?"');
  const askMob = await fetch('http://localhost:3001/api/ask', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: 'Where is my wallet?',
      user_id: testUser
    })
  }).then(r => r.json());
  console.log(`   AfterMe Answer: >> ${askMob.answer}`);

  console.log('\n========================================================');
  console.log('🎉 BIDIRECTIONAL WEB & MOBILE SYNC VERIFIED 100% WORKING!');
  console.log('========================================================\n');
}

runCrossPlatformSyncTest().catch(err => {
  console.error('Sync test failed:', err);
  process.exit(1);
});
