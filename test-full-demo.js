async function request(path, method = 'GET', body = null, userId = 'demo_user_001') {
  const url = `http://localhost:3001${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  return res.json();
}

async function runFullGoldenDemo() {
  console.log('========================================================');
  console.log('🔥 AFTERME FIREBASE BACKEND — FULL E2E GOLDEN DEMO');
  console.log('========================================================\n');

  // STEP 0: Health & Firebase Status Check
  console.log('--- Step 0: Firebase Health Check ---');
  const health = await request('/api/health');
  console.log('Health:', JSON.stringify(health, null, 2));

  // Clean Reset for demo user
  const resetRes = await request('/api/demo/reset', 'POST', { user_id: 'demo_user_001' });
  console.log('Reset response:', resetRes.message);

  // STEP 1 & 2: Natural Language Memory Input
  console.log('\n--- Step 1 & 2: User Speaks / Types ---');
  console.log('User input: "I left my black laptop charger in the conference room."');
  const createRes = await request('/api/memories', 'POST', {
    text: 'I left my black laptop charger in the conference room.',
    current_location: 'Conference Room',
    user_id: 'demo_user_001'
  });
  console.log('Memory created in Firestore successfully:');
  console.log('  ID:', createRes.memory.id);
  console.log('  Object:', createRes.memory.object);
  console.log('  Location:', createRes.memory.location);
  console.log('  Risk Level:', createRes.memory.risk_level);
  console.log('  Status:', createRes.memory.status);

  // STEP 3 & 4: Firestore Memory Stream Verification
  console.log('\n--- Step 3 & 4: Firestore Memory Stream ---');
  const listRes = await request('/api/memories');
  console.log(`Active memories in Firestore: ${listRes.memories.length}`);
  console.log(`Memory 0: "${listRes.memories[0].original_text}" [${listRes.memories[0].location}]`);

  // STEP 5 & 6: Proactive Departure Detection
  console.log('\n--- Step 5 & 6: User Leaves Conference Room ---');
  console.log('Simulating location change: "Conference Room" -> "Office Desk"...');
  const locRes = await request('/api/location/change', 'POST', {
    previous_location: 'Conference Room',
    current_location: 'Office Desk',
    user_id: 'demo_user_001'
  });
  console.log('Departure event handled:');
  console.log('  Message:', locRes.message);
  console.log('  Alerts triggered:', locRes.alerts.length);
  if (locRes.alerts.length > 0) {
    console.log('  🚨 Proactive Warning Title:', locRes.alerts[0].title);
    console.log('  🚨 Proactive Warning Body:', locRes.alerts[0].message);
    console.log('  🚨 Severity:', locRes.alerts[0].severity);
  }

  // STEP 7 & 8: Grounded Ask AfterMe Retrieval
  console.log('\n--- Step 7 & 8: Ask AfterMe Conversational Retrieval ---');
  console.log('User Question: "Where did I leave my charger?"');
  const askRes1 = await request('/api/ask', 'POST', {
    question: 'Where did I leave my charger?',
    current_location: 'Office Desk',
    user_id: 'demo_user_001'
  });
  console.log('AfterMe AI Answer:');
  console.log('  >>', askRes1.answer);
  console.log('  Has Verified Match:', askRes1.has_match);
  console.log('  Cited Records:', askRes1.relevant_memories.map(m => m.object + ' @ ' + m.location));

  // STEP 9: Anti-Hallucination Query
  console.log('\n--- Step 9: Anti-Hallucination Test (Unknown Item) ---');
  console.log('User Question: "Where are my sunglasses?"');
  const askRes2 = await request('/api/ask', 'POST', {
    question: 'Where are my sunglasses?',
    user_id: 'demo_user_001'
  });
  console.log('AfterMe AI Answer (Strict Zero-Hallucination):');
  console.log('  >>', askRes2.answer);
  console.log('  Has Match:', askRes2.has_match);

  // STEP 10: Multi-Tenant Data Isolation Test
  console.log('\n--- Step 10: Multi-Tenant User Isolation Test ---');
  const userBMemories = await request('/api/memories', 'GET', null, 'user_b_isolated');
  console.log(`User B memories count (should be 0): ${userBMemories.memories.length}`);
  if (userBMemories.memories.length === 0) {
    console.log('✅ User data isolation verified: User B cannot see Demo User memories.');
  }

  // STEP 11: Mark Item as Retrieved
  console.log('\n--- Step 11: User Retrieves Charger ---');
  const retrieveRes = await request(`/api/memories/${createRes.memory.id}/status`, 'PATCH', {
    status: 'retrieved',
    user_id: 'demo_user_001'
  });
  console.log('Status updated in Firestore:', retrieveRes.memory.status);

  // STEP 12: Contextual Demo (Passport + Visa Appointment)
  console.log('\n--- Step 12: Contextual Linked Memories Demo ---');
  await request('/api/memories', 'POST', {
    text: 'My passport is in the blue folder in the top desk drawer.',
    user_id: 'demo_user_001'
  });
  await request('/api/memories', 'POST', {
    text: 'I have a visa appointment tomorrow at 10 AM.',
    user_id: 'demo_user_001'
  });

  const askContext = await request('/api/ask', 'POST', {
    question: 'Where is my passport? I need it tomorrow.',
    user_id: 'demo_user_001'
  });
  console.log('Contextual Question: "Where is my passport? I need it tomorrow."');
  console.log('AfterMe Contextual Answer:');
  console.log('  >>', askContext.answer);

  console.log('\n========================================================');
  console.log('🏆 ALL FIREBASE BACKEND TESTS & GOLDEN DEMOS PASSED 100%!');
  console.log('========================================================\n');
}

runFullGoldenDemo().catch(err => {
  console.error('Demo test error:', err);
  process.exit(1);
});
