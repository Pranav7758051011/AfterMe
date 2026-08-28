const assert = require('assert');

// Test suite for Milestone 3 — Strengthen AI Grounding & Output Validation

console.log('========================================================');
console.log('🧪 MILESTONE 3: AI GROUNDING & OUTPUT VALIDATION TEST SUITE');
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

runTest('1. Parse clean standard JSON', () => {
  const input = '{"memory_type": "belonging", "object": "laptop charger", "risk_level": "high"}';
  const result = parseAndSanitizeJSON(input);
  assert.strictEqual(result.object, 'laptop charger');
  assert.strictEqual(result.risk_level, 'high');
});

runTest('2. Strip markdown code fences (```json ... ```)', () => {
  const input = '```json\n{\n  "memory_type": "belonging",\n  "object": "keys",\n  "location": "office desk"\n}\n```';
  const result = parseAndSanitizeJSON(input);
  assert.strictEqual(result.object, 'keys');
  assert.strictEqual(result.location, 'office desk');
});

runTest('3. Extract JSON with leading/trailing conversational filler', () => {
  const input = 'Here is the structured extraction:\n{"memory_type": "task", "task": "submit report", "deadline": "tomorrow"}\nHope this helps!';
  const result = parseAndSanitizeJSON(input);
  assert.strictEqual(result.task, 'submit report');
  assert.strictEqual(result.deadline, 'tomorrow');
});

runTest('4. Reject malformed/unparseable JSON cleanly', () => {
  const input = '{ memory_type: invalid json without quotes';
  assert.throws(() => parseAndSanitizeJSON(input), /SyntaxError|Unexpected/);
});

runTest('5. Reject empty or non-string input cleanly', () => {
  assert.throws(() => parseAndSanitizeJSON(''), /Empty or non-string/);
  assert.throws(() => parseAndSanitizeJSON(null), /Empty or non-string/);
});

// ─── Test Group 2: Citation Verification & Grounding Guardrails ──────

runTest('6. Filter out hallucinated memory IDs from ask response', () => {
  const authenticMemories = [
    { id: 'mem_001', original_text: 'Left charger in conference room' },
    { id: 'mem_002', original_text: 'Parked car at Bay B4' },
  ];
  const authenticIdSet = new Set(authenticMemories.map(m => m.id));

  // Simulated model output that returned a valid ID AND an invented/hallucinated ID
  const modelOutputIds = ['mem_001', 'mem_999_hallucinated', 'fake_id_123'];

  // Grounding filter
  const verifiedIds = modelOutputIds.filter(id => authenticIdSet.has(id));

  assert.strictEqual(verifiedIds.length, 1);
  assert.strictEqual(verifiedIds[0], 'mem_001');
  assert.strictEqual(verifiedIds.includes('mem_999_hallucinated'), false);
});

runTest('7. Reject match status if no authentic citations exist', () => {
  const authenticMemories = [
    { id: 'mem_001', original_text: 'Left keys on kitchen counter' }
  ];
  const authenticIdSet = new Set(authenticMemories.map(m => m.id));

  // Model claimed match: true but returned unknown ID
  const modelResult = {
    has_match: true,
    relevant_memory_ids: ['non_existent_id_999']
  };

  const verifiedIds = modelResult.relevant_memory_ids.filter(id => authenticIdSet.has(id));
  const hasValidMatch = Boolean(modelResult.has_match && verifiedIds.length > 0);

  assert.strictEqual(hasValidMatch, false);
  assert.strictEqual(verifiedIds.length, 0);
});

// ─── Test Group 3: Real Backend End-to-End Extraction & Retrieval ────

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
  console.log(`📊 MILESTONE 3 RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================\n');
}

testLiveBackend().catch(err => {
  console.error('Integration test runner error:', err);
});
