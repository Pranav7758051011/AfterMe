const assert = require('assert');
const path = require('path');

console.log('========================================================');
console.log('🧠 VECTOR EMBEDDINGS & HYBRID RAG RETRIEVAL TEST SUITE');
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

// ─── Direct Unit Tests from vectorRetrieval module ───────────────────

const {
  computeCosineSimilarity,
  generateLocalFallbackEmbedding,
  computeKeywordOverlapScore,
  rankCandidateMemories
} = require('../backend/dist/services/vectorRetrieval');

// TEST 1: Identical vector cosine similarity must be exactly 1.0
runTest('1. Identical normalized vectors yield cosine similarity = 1.0', () => {
  const v1 = [0.6, 0.8];
  const sim = computeCosineSimilarity(v1, v1);
  assert.ok(Math.abs(sim - 1.0) < 1e-5, `Expected 1.0, got ${sim}`);
});

// TEST 2: Orthogonal vectors cosine similarity must be 0.0
runTest('2. Orthogonal vectors yield cosine similarity = 0.0', () => {
  const v1 = [1.0, 0.0];
  const v2 = [0.0, 1.0];
  const sim = computeCosineSimilarity(v1, v2);
  assert.ok(Math.abs(sim - 0.0) < 1e-5, `Expected 0.0, got ${sim}`);
});

// TEST 3: Opposite vectors cosine similarity must be -1.0
runTest('3. Opposite vectors yield cosine similarity = -1.0', () => {
  const v1 = [1.0, 0.0];
  const v2 = [-1.0, 0.0];
  const sim = computeCosineSimilarity(v1, v2);
  assert.ok(Math.abs(sim - (-1.0)) < 1e-5, `Expected -1.0, got ${sim}`);
});

// TEST 4: Empty vector handling
runTest('4. Empty or mismatched vector lengths safely return 0.0 without throw', () => {
  assert.strictEqual(computeCosineSimilarity([], []), 0);
  assert.strictEqual(computeCosineSimilarity([1, 2], [1]), 0);
});

// TEST 5: Fallback TF-IDF embedding generation
runTest('5. Local TF-IDF vectorizer produces normalized 64-dimensional dense vectors', () => {
  const embedding = generateLocalFallbackEmbedding('I left my laptop charger in the conference room', 64);
  assert.strictEqual(embedding.length, 64);
  
  // Verify L2 norm is ~1.0
  let sumSq = 0;
  for (let i = 0; i < embedding.length; i++) sumSq += embedding[i] * embedding[i];
  assert.ok(Math.abs(Math.sqrt(sumSq) - 1.0) < 1e-3, `Expected L2 norm ~1.0, got ${Math.sqrt(sumSq)}`);
});

// TEST 6: Semantic similarity between related texts
runTest('6. Similar queries have higher cosine similarity than unrelated queries', () => {
  const e1 = generateLocalFallbackEmbedding('laptop charger in conference room');
  const e2 = generateLocalFallbackEmbedding('where is my charger?');
  const e3 = generateLocalFallbackEmbedding('cooking pizza pasta recipes');

  const simRelated = computeCosineSimilarity(e1, e2);
  const simUnrelated = computeCosineSimilarity(e1, e3);

  assert.ok(simRelated > simUnrelated, `Expected related similarity (${simRelated}) > unrelated (${simUnrelated})`);
});

// TEST 7: Keyword overlap scoring
runTest('7. BM25-style keyword overlap computes accurate match ratio', () => {
  const memory = {
    id: 'mem_1',
    original_text: 'I left my black charger in the conference room.',
    object: 'charger',
    location: 'conference room'
  };

  const scoreHigh = computeKeywordOverlapScore('where is my charger?', memory);
  const scoreNone = computeKeywordOverlapScore('where is my umbrella?', memory);

  assert.ok(scoreHigh > 0.4, `Expected high score, got ${scoreHigh}`);
  assert.strictEqual(scoreNone, 0);
});

// TEST 8: Hybrid Reranking on candidate list
async function testHybridReranking() {
  console.log('\n--- Running Hybrid Reranking Candidates Test ---');
  
  totalTests++;
  const sampleMemories = [
    { id: 'm1', original_text: 'Parked car on Floor 2, Bay B-14', object: 'car', location: 'Floor 2' },
    { id: 'm2', original_text: 'Left black charger in conference room', object: 'charger', location: 'conference room' },
    { id: 'm3', original_text: 'Doctor appointment on Friday at 3 PM', object: 'doctor', location: 'clinic' },
    { id: 'm4', original_text: 'Passport is in the blue desk folder', object: 'passport', location: 'desk' },
    { id: 'm5', original_text: 'Electric bill payment due tomorrow', object: 'bill', location: 'online' },
  ];

  const ranked = await rankCandidateMemories('Where did I leave my laptop charger?', sampleMemories, 2);
  assert.strictEqual(ranked.length, 2);
  assert.strictEqual(ranked[0].memory.id, 'm2', 'Top-1 candidate must be the charger memory');
  passedTests++;
  console.log('✅ [PASS] 8. Hybrid vector pre-filtering selects exact top-1 candidate ("charger") from memory pool');

  console.log('\n========================================================');
  console.log(`📊 VECTOR RETRIEVAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================\n');
  if (passedTests < totalTests) process.exit(1);
}

testHybridReranking().catch(err => {
  console.error('Vector test error:', err);
  process.exit(1);
});
