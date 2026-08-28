/**
 * AfterMe — Master Test Harness & Test Suite Hardening Runner
 * 
 * Runs all 9 unit, integration, spatial, security, resilience, and evaluation test suites
 * with consolidated reporting and exit code status.
 */

const { execSync } = require('child_process');
const { performance } = require('perf_hooks');

console.log('\n================================================================');
console.log('🧪 AFTERME MASTER TEST HARNESS — FULL ENGINEERING TEST SUITE');
console.log('================================================================\n');

const TEST_SUITES = [
  { file: 'test-ai-validation.js', name: 'Milestone 3: AI Grounding & Output Validation' },
  { file: 'test-gps-reliability.js', name: 'Milestone 4: GPS & Geofence Reliability' },
  { file: 'test-alert-protection.js', name: 'Milestone 5: Alert Deduplication & State Tracking' },
  { file: 'test-security-isolation.js', name: 'Milestone 6: Security & Multi-Tenant Isolation' },
  { file: 'test-resilience-fallback.js', name: 'Milestone 7: Failure Modes & Offline Resilience' },
  { file: 'test-metrics-observability.js', name: 'Milestone 9: Performance & Cost Observability' },
  { file: 'test-multimodal-tts.js', name: 'Multimodal Vision & Audio Verification' },
  { file: 'test-cross-platform.js', name: 'Cross-Platform Web & Mobile Synchronization' },
  { file: 'test-full-demo.js', name: 'E2E Full Golden Demo Flow' },
];

const results = [];
const masterStart = performance.now();

for (let i = 0; i < TEST_SUITES.length; i++) {
  const suite = TEST_SUITES[i];
  console.log(`[${i + 1}/${TEST_SUITES.length}] Running ${suite.name} (${suite.file})...`);
  
  const suiteStart = performance.now();
  let passed = false;
  let output = '';

  try {
    output = execSync(`node ${suite.file}`, { encoding: 'utf8', stdio: 'pipe' });
    passed = true;
  } catch (err) {
    passed = false;
    output = err.stdout || err.message;
  }

  const duration = Math.round(performance.now() - suiteStart);
  results.push({ ...suite, passed, duration, output });

  if (passed) {
    console.log(`    ✅ PASSED (${duration} ms)\n`);
  } else {
    console.error(`    ❌ FAILED (${duration} ms)\n${output}\n`);
  }
}

const totalDuration = Math.round(performance.now() - masterStart);
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;

console.log('================================================================');
console.log('📊 MASTER TEST HARNESS SUMMARY SCORECARD');
console.log('================================================================');
console.log('| # | Test Suite Module                               | Duration | Status |');
console.log('|---|:------------------------------------------------|:---------|:-------|');

results.forEach((r, idx) => {
  const num = (idx + 1).toString().padEnd(2);
  const name = r.name.padEnd(48);
  const dur = `${r.duration} ms`.padEnd(8);
  const status = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`| ${num}| ${name}| ${dur}| ${status} |`);
});

console.log('----------------------------------------------------------------');
console.log(`Total Suites Executed : ${totalCount}`);
console.log(`Suites Passed         : ${passedCount} / ${totalCount} (${((passedCount / totalCount) * 100).toFixed(1)}%)`);
console.log(`Total Harness Runtime : ${totalDuration} ms`);
console.log('================================================================\n');

if (passedCount < totalCount) {
  console.error('❌ Master Test Harness: Some test suites failed!');
  process.exit(1);
} else {
  console.log('🏆 Master Test Harness: 100% OF ALL TEST SUITES PASSED CLEANLY!\n');
  process.exit(0);
}
