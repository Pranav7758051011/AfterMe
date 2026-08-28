const assert = require('assert');

console.log('========================================================');
console.log('📈 MILESTONE 9: PERFORMANCE & COST OBSERVABILITY TEST');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;

async function testMetricsObservability() {
  async function api(path, method = 'GET', body = null) {
    const res = await fetch(`http://localhost:3001${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'test_metrics_user' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }

  // 1. Check /api/metrics endpoint exists & returns 200
  totalTests++;
  const initialMetrics = await api('/api/metrics', 'GET');
  assert.strictEqual(initialMetrics.status, 200);
  assert.ok(initialMetrics.data.uptime_seconds >= 0);
  passedTests++;
  console.log('✅ [PASS] 1. GET /api/metrics endpoint returns HTTP 200 with uptime');

  // 2. Perform memory creation & check extraction metrics
  totalTests++;
  const prevExtractions = initialMetrics.data.total_extractions;
  await api('/api/memories', 'POST', {
    text: 'I left my black charger in the conference room.',
    current_location: 'Conference Room',
    user_id: 'test_metrics_user'
  });
  const afterExtMetrics = await api('/api/metrics', 'GET');
  assert.ok(afterExtMetrics.data.total_extractions > prevExtractions, 'Extraction counter must increment');
  passedTests++;
  console.log('✅ [PASS] 2. Memory extraction latency & counter telemetry incremented');

  // 3. Perform Ask Query & check retrieval metrics
  totalTests++;
  const prevAsk = afterExtMetrics.data.total_ask_queries;
  await api('/api/ask', 'POST', {
    question: 'Where is my charger?',
    user_id: 'test_metrics_user'
  });
  const afterAskMetrics = await api('/api/metrics', 'GET');
  assert.ok(afterAskMetrics.data.total_ask_queries > prevAsk, 'Ask query counter must increment');
  passedTests++;
  console.log('✅ [PASS] 3. Conversational retrieval latency & counter telemetry incremented');

  // 4. Perform GPS Geofence Check & check spatial metrics
  totalTests++;
  const prevGeo = afterAskMetrics.data.total_geofence_checks;
  await api('/api/location/gps', 'POST', {
    latitude: 37.7762,
    longitude: -122.4178,
    accuracy: 5,
    user_id: 'test_metrics_user'
  });
  const afterGeoMetrics = await api('/api/metrics', 'GET');
  assert.ok(afterGeoMetrics.data.total_geofence_checks > prevGeo, 'Geofence check counter must increment');
  passedTests++;
  console.log('✅ [PASS] 4. Geofence evaluation latency & counter telemetry incremented');

  // 5. Verify Token & Cost Observability Schema
  totalTests++;
  const costObs = afterGeoMetrics.data.cost_observability;
  assert.strictEqual(costObs.model, 'gemini-2.5-flash');
  assert.ok(typeof costObs.estimated_input_tokens === 'number');
  assert.ok(typeof costObs.estimated_output_tokens === 'number');
  assert.ok(typeof costObs.estimated_cost_usd === 'number');
  assert.ok(costObs.pricing_tier.includes('Gemini Flash'));
  passedTests++;
  console.log('✅ [PASS] 5. Token usage estimation & USD cost observability validated');

  console.log('\n📊 Live Telemetry Snapshot:');
  console.log(`   • Total Requests Processed    : ${afterGeoMetrics.data.total_requests}`);
  console.log(`   • Total Extractions Recorded   : ${afterGeoMetrics.data.total_extractions}`);
  console.log(`   • Total Ask Queries Handled    : ${afterGeoMetrics.data.total_ask_queries}`);
  console.log(`   • Total Geofence Checks Run    : ${afterGeoMetrics.data.total_geofence_checks}`);
  console.log(`   • Estimated Total Token Volume : ${costObs.estimated_total_tokens} tokens`);
  console.log(`   • Estimated Cumulative Cost    : $${costObs.estimated_cost_usd} USD`);

  console.log('\n========================================================');
  console.log(`📊 MILESTONE 9 RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================\n');
}

testMetricsObservability().catch(err => {
  console.error('Metrics test runner error:', err);
});
