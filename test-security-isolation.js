const assert = require('assert');

console.log('========================================================');
console.log('🔐 MILESTONE 6: MULTI-TENANT USER SECURITY & DATA ISOLATION TEST');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

async function testSecurityIsolation() {
  async function api(path, method = 'GET', body = null, userId = 'alice_user') {
    const res = await fetch(`http://localhost:3001${path}`, {
      method,
      headers: { 
        'Content-Type': 'application/json', 
        'x-user-id': userId 
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }

  // 1. Reset Alice and Bob
  await api('/api/demo/reset', 'POST', { user_id: 'alice_user' }, 'alice_user');
  await api('/api/demo/reset', 'POST', { user_id: 'bob_user' }, 'bob_user');

  // 2. Alice creates a sensitive high-risk memory
  const aliceMemRes = await api('/api/memories', 'POST', {
    text: 'I left my master server keys and laptop in the conference room.',
    current_location: 'Conference Room',
    latitude: 37.7749,
    longitude: -122.4194,
    user_id: 'alice_user'
  }, 'alice_user');

  assert.strictEqual(aliceMemRes.status, 201);
  const aliceMemId = aliceMemRes.data.memory.id;

  // TEST 1: Bob lists his memories -> Count must be 0 (No leakage)
  totalTests++;
  const bobList = await api('/api/memories', 'GET', null, 'bob_user');
  assert.strictEqual(bobList.status, 200);
  assert.strictEqual(bobList.data.memories.length, 0);
  passedTests++;
  console.log('✅ [PASS] 1. Multi-tenant list isolation: Bob cannot view Alice memories in list queries');

  // TEST 2: Bob attempts direct GET /api/memories/:id on Alice's memory -> 403 Forbidden
  totalTests++;
  const bobGet = await api(`/api/memories/${aliceMemId}`, 'GET', null, 'bob_user');
  assert.strictEqual(bobGet.status, 403, `Expected 403 Forbidden, got ${bobGet.status}`);
  passedTests++;
  console.log('✅ [PASS] 2. Direct memory read authorization: Bob blocked with 403 Forbidden');

  // TEST 3: Bob attempts PATCH /api/memories/:id/status on Alice's memory -> 403 Forbidden
  totalTests++;
  const bobPatch = await api(`/api/memories/${aliceMemId}/status`, 'PATCH', { status: 'retrieved' }, 'bob_user');
  assert.strictEqual(bobPatch.status, 403, `Expected 403 Forbidden, got ${bobPatch.status}`);
  passedTests++;
  console.log('✅ [PASS] 3. Status mutation authorization: Bob blocked with 403 Forbidden');

  // TEST 4: Bob attempts DELETE /api/memories/:id on Alice's memory -> 403 Forbidden
  totalTests++;
  const bobDelete = await api(`/api/memories/${aliceMemId}`, 'DELETE', null, 'bob_user');
  assert.strictEqual(bobDelete.status, 403, `Expected 403 Forbidden, got ${bobDelete.status}`);
  passedTests++;
  console.log('✅ [PASS] 4. Memory deletion authorization: Bob blocked with 403 Forbidden');

  // TEST 5: Alert Isolation -> Alice leaves Conference Room -> Alert created
  totalTests++;
  const aliceExit = await api('/api/location/gps', 'POST', {
    latitude: 37.7762, // 202m away
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'alice_user'
  }, 'alice_user');

  const aliceAlerts = await api('/api/location/alerts', 'GET', null, 'alice_user');
  assert.strictEqual(aliceAlerts.data.count, 1);
  const aliceAlertId = aliceAlerts.data.alerts[0].id;

  // Bob lists alerts -> must be 0
  const bobAlerts = await api('/api/location/alerts', 'GET', null, 'bob_user');
  assert.strictEqual(bobAlerts.data.count, 0);

  // Bob attempts to dismiss Alice's alert -> 403 Forbidden
  const bobDismiss = await api(`/api/location/alerts/${aliceAlertId}/dismiss`, 'POST', null, 'bob_user');
  assert.strictEqual(bobDismiss.status, 403, `Expected 403 Forbidden, got ${bobDismiss.status}`);
  passedTests++;
  console.log('✅ [PASS] 5. Proactive alert isolation: Bob cannot view or dismiss Alice alerts');

  // TEST 6: AI Retrieval Isolation -> Bob asks for Alice's item -> Zero match returned
  totalTests++;
  const bobAsk = await api('/api/ask', 'POST', {
    question: 'Where is the master encryption key?',
    user_id: 'bob_user'
  }, 'bob_user');

  assert.strictEqual(bobAsk.status, 200);
  assert.strictEqual(bobAsk.data.has_match, false);
  assert.strictEqual(bobAsk.data.relevant_memories.length, 0);
  assert.strictEqual(bobAsk.data.answer.includes('Conference Room'), false);
  passedTests++;
  console.log('✅ [PASS] 6. AI conversational retrieval isolation: 0 confidential data leakage across users');

  console.log('\n========================================================');
  console.log(`📊 MILESTONE 6 RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================\n');
}

testSecurityIsolation().catch(err => {
  console.error('Security isolation test runner error:', err);
});
