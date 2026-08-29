const assert = require('assert');
const path = require('path');

console.log('========================================================');
console.log('🛡️ FAILURE & OFFLINE RESILIENCE TEST SUITE');
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

// ─── Direct Offline Heuristic Unit Tests ──────────────────────────────

const { fallbackExtract } = require('../backend/dist/services/gemini');

runTest('1. Offline Heuristic: High-risk charger memory extraction', () => {
  const result = fallbackExtract('I left my black charger in the conference room.');
  assert.strictEqual(result.memory_type, 'belonging');
  assert.strictEqual(result.risk_level, 'high');
  assert.ok(result.location.toLowerCase().includes('conference room'));
  assert.strictEqual(result.status, 'potentially_forgotten');
});

runTest('2. Offline Heuristic: Critical passport & task extraction', () => {
  const result = fallbackExtract('I have to submit my passport tomorrow for visa.');
  assert.strictEqual(result.risk_level, 'critical');
  assert.strictEqual(result.memory_type, 'task');
  assert.ok(result.deadline.toLowerCase().includes('tomorrow'));
});

runTest('3. Offline Heuristic: Parking spot number extraction', () => {
  const result = fallbackExtract('Parked my car on Floor 2, Bay B-14 near the elevator.');
  assert.strictEqual(result.risk_level, 'critical');
  assert.strictEqual(result.location, 'Parking Spot B-14');
});

runTest('4. Offline Heuristic: Empty string safety handling', () => {
  const result = fallbackExtract('');
  assert.strictEqual(result.memory_type, 'belonging');
  assert.strictEqual(result.importance, 'low');
});

// ─── API Live Fallback & Error Handling Integration Tests ─────────────

async function testLiveResilience() {
  console.log('\n--- Running Live Resilience & Failure Mode API Tests ---');

  async function rawApi(path, method = 'GET', body = null, rawBody = null) {
    const headers = { 'x-user-id': 'resilience_user' };
    if (body) headers['Content-Type'] = 'application/json';
    if (rawBody) headers['Content-Type'] = 'application/json';

    const res = await fetch(`http://localhost:3001${path}`, {
      method,
      headers,
      body: rawBody !== null ? rawBody : (body ? JSON.stringify(body) : undefined),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  }

  // TEST 5: Health Check
  totalTests++;
  const healthRes = await rawApi('/api/health', 'GET');
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.data.status, 'ok');
  assert.strictEqual(healthRes.data.product, 'AfterMe');
  passedTests++;
  console.log('✅ [PASS] 5. Health check responds ok under all deployment modes');

  // TEST 6: Empty memory creation rejection (HTTP 400)
  totalTests++;
  const emptyRes = await rawApi('/api/memories', 'POST', { text: '   ' });
  assert.strictEqual(emptyRes.status, 400);
  assert.ok(emptyRes.data.error.includes('Text prompt is required'));
  passedTests++;
  console.log('✅ [PASS] 6. Empty memory input cleanly rejected with HTTP 400');

  // TEST 7: Malformed JSON body handling (HTTP 400 without crashing)
  totalTests++;
  const malformedRes = await rawApi('/api/memories', 'POST', null, '{ invalid json payload: true');
  assert.strictEqual(malformedRes.status, 400);
  assert.ok(malformedRes.data.error.includes('Invalid JSON'));
  passedTests++;
  console.log('✅ [PASS] 7. Malformed JSON payload caught by global error middleware with HTTP 400');

  // TEST 8: Non-existent memory lookup (HTTP 404)
  totalTests++;
  const notFoundRes = await rawApi('/api/memories/non_existent_uuid_123', 'GET');
  assert.strictEqual(notFoundRes.status, 404);
  passedTests++;
  console.log('✅ [PASS] 8. Non-existent memory ID lookup returns HTTP 404 cleanly');

  console.log('\n========================================================');
  console.log(`📊 RESILIENCE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');
  if (passedTests < totalTests) process.exit(1);
}

testLiveResilience().catch(err => {
  console.error('Resilience test runner error:', err);
  process.exit(1);
});
