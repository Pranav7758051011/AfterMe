const assert = require('assert');

// Test suite for AI Grounding & Output Validation

console.log('========================================================');
console.log('🧪 AI GROUNDING & OUTPUT VALIDATION TEST SUITE');
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

// ─── Test Group 1: Robust JSON Parsing & Markdown Sanitization ────────

function parseAndSanitizeJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string model response received.');
  }

  let cleaned = rawText.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Extract outermost { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

runTest('1. Parse standard clean JSON', () => {
  const input = '{"memory_type": "belonging", "object": "laptop charger"}';
  const result = parseAndSanitizeJSON(input);
  assert.strictEqual(result.memory_type, 'belonging');
  assert.strictEqual(result.object, 'laptop charger');
});

runTest('2. Strip markdown json code fences', () => {
  const input = '```json\n{"memory_type": "document", "object": "passport"}\n```';
  const result = parseAndSanitizeJSON(input);
  assert.strictEqual(result.memory_type, 'document');
  assert.strictEqual(result.object, 'passport');
});

runTest('3. Extract JSON with leading/trailing conversational filler', () => {
  const input = 'Here is the extracted memory JSON:\n```json\n{"memory_type": "task", "task": "submit report"}\n```\nHope this helps!';
  const result = parseAndSanitizeJSON(input);
  assert.strictEqual(result.memory_type, 'task');
  assert.strictEqual(result.task, 'submit report');
});

runTest('4. Reject malformed/unparseable JSON cleanly', () => {
  assert.throws(() => {
    parseAndSanitizeJSON('This is not json at all');
  }, /SyntaxError|JSON/);
});

runTest('5. Reject empty or non-string input cleanly', () => {
  assert.throws(() => {
    parseAndSanitizeJSON('');
  }, /Empty or non-string/);
});

// ─── Test Group 2: Grounded Citation Verification & Hallucination Filter 

function filterVerifiedCitations(returnedIds, authenticMemories) {
  const authenticSet = new Set(authenticMemories.map(m => m.id));
  return (returnedIds || []).filter(id => authenticSet.has(id));
}

runTest('6. Filter out hallucinated memory IDs from ask response', () => {
  const authenticMemories = [
    { id: 'mem_1', original_text: 'Left keys in cafeteria' },
    { id: 'mem_2', original_text: 'Left charger in conference room' }
  ];
  const modelReturnedIds = ['mem_2', 'hallucinated_mem_999', 'fake_id_xyz'];
  const verified = filterVerifiedCitations(modelReturnedIds, authenticMemories);
  assert.deepStrictEqual(verified, ['mem_2']);
});

runTest('7. Reject match status if no authentic citations exist', () => {
  const authenticMemories = [
    { id: 'mem_1', original_text: 'Left keys in cafeteria' }
  ];
  const modelReturnedIds = ['completely_fake_id'];
  const verified = filterVerifiedCitations(modelReturnedIds, authenticMemories);
  const hasMatch = verified.length > 0;
  assert.strictEqual(hasMatch, false);
});

// ─── Test Group 3: Live API End-to-End Extraction & Grounding ─────────

async function testLiveBackend() {
  console.log('\n--- Running Live Integration Validation via Backend API ---');

  async function api(path, method = 'GET', body = null) {
    const res = await fetch(`http://localhost:3001${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test_val_user' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  // A. Clear test user memories
  await api('/api/demo/reset', 'POST', { user_id: 'test_val_user' });

  // B. Ambiguous Input Test
  totalTests++;
  try {
    const ambigRes = await api('/api/memories', 'POST', {
      text: 'Something was put somewhere yesterday maybe.',
      user_id: 'test_val_user'
    });
    assert.strictEqual(ambigRes.success, true);
    assert.ok(ambigRes.memory.id);
    assert.ok(ambigRes.extraction.summary || ambigRes.memory.original_text);
    passedTests++;
    console.log('✅ [PASS] 8. Ambiguous memory handled gracefully without crash');
  } catch (e) {
    console.error('❌ [FAIL] 8. Ambiguous memory handling:', e.message);
  }

  // C. Multiple Objects Input Test
  totalTests++;
  try {
    const multiRes = await api('/api/memories', 'POST', {
      text: 'I left my black charger and blue folder in the library on Floor 3.',
      user_id: 'test_val_user'
    });
    assert.strictEqual(multiRes.success, true);
    assert.ok(multiRes.memory.risk_level === 'high' || multiRes.memory.risk_level === 'critical');
    assert.ok(multiRes.memory.location.toLowerCase().includes('library') || multiRes.memory.location.toLowerCase().includes('floor 3'));
    passedTests++;
    console.log('✅ [PASS] 9. Multi-object extraction populated required fields');
  } catch (e) {
    console.error('❌ [FAIL] 9. Multi-object extraction:', e.message);
  }

  // D. Grounded Existing Query Test
  totalTests++;
  try {
    const askMatch = await api('/api/ask', 'POST', {
      question: 'Where is my charger?',
      user_id: 'test_val_user'
    });
    assert.strictEqual(askMatch.has_match, true);
    assert.ok(askMatch.relevant_memories.length > 0);
    assert.ok(askMatch.answer.toLowerCase().includes('library') || askMatch.answer.toLowerCase().includes('charger'));
    passedTests++;
    console.log('✅ [PASS] 10. Grounded retrieval successfully returns verified citation');
  } catch (e) {
    console.error('❌ [FAIL] 10. Grounded retrieval query:', e.message);
  }

  // E. Grounded Non-Existent Query Test (Unknown Item Rejection)
  totalTests++;
  try {
    const askUnknown = await api('/api/ask', 'POST', {
      question: 'Where are my scuba diving goggles?',
      user_id: 'test_val_user'
    });
    assert.strictEqual(askUnknown.has_match, false);
    assert.strictEqual(askUnknown.relevant_memories.length, 0);
    passedTests++;
    console.log('✅ [PASS] 11. Grounded rejection correctly handles non-existent item');
  } catch (e) {
    console.error('❌ [FAIL] 11. Grounded rejection query:', e.message);
  }

  console.log('\n========================================================');
  console.log(`📊 AI VALIDATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');
  if (passedTests < totalTests) process.exit(1);
}

testLiveBackend().catch(err => {
  console.error('Integration test runner error:', err);
  process.exit(1);
});
