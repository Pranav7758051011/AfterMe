/**
 * AfterMe — Master Test Runner
 * 
 * Runs all engineering test suites against the backend API and local units.
 * Auto-starts a local backend instance if one is not already running.
 */

const { execSync, spawn } = require('child_process');
const { performance } = require('perf_hooks');
const path = require('path');
const http = require('http');

const rootDir = path.join(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\n================================================================');
console.log('🧪 AFTERME AUTOMATED TEST SUITE HARNESS');
console.log('================================================================\n');

const TEST_SUITES = [
  { file: 'tests/ai-validation.test.js', name: 'AI Grounding & Output Validation' },
  { file: 'tests/gps-reliability.test.js', name: 'GPS & Geofence Reliability' },
  { file: 'tests/alert-protection.test.js', name: 'Alert Deduplication & State Tracking' },
  { file: 'tests/security-isolation.test.js', name: 'Security & Multi-Tenant Isolation' },
  { file: 'tests/resilience-fallback.test.js', name: 'Failure Modes & Offline Resilience' },
  { file: 'tests/metrics-observability.test.js', name: 'Performance & Cost Observability' },
  { file: 'tests/multimodal-tts.test.js', name: 'Multimodal Vision & Audio Verification' },
  { file: 'tests/cross-platform.test.js', name: 'Cross-Platform Web & Mobile Synchronization' },
  { file: 'tests/full-demo.test.js', name: 'End-to-End Workflow Verification' },
];

function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureBackendRunning() {
  const isUp = await checkBackendHealth();
  if (isUp) {
    console.log('ℹ️  Detected active backend on port 3001.\n');
    return null;
  }

  console.log('ℹ️  Starting local backend instance for test execution...');
  // First ensure backend is built
  try {
    execSync(`${npmCmd} --prefix backend run build`, { cwd: rootDir, stdio: 'pipe' });
  } catch (e) {
    console.warn('Backend build notice:', e.message);
  }

  const backendProc = spawn(npmCmd, ['--prefix', 'backend', 'run', 'start'], {
    cwd: rootDir,
    stdio: 'pipe',
    shell: true,
  });

  // Wait for health check up to 15 seconds
  const start = Date.now();
  while (Date.now() - start < 15000) {
    await sleep(500);
    const healthy = await checkBackendHealth();
    if (healthy) {
      console.log('✅ Local backend server ready on port 3001.\n');
      return backendProc;
    }
  }

  console.warn('⚠️ Backend health check timed out. Proceeding with tests...\n');
  return backendProc;
}

async function main() {
  let spawnedBackend = null;
  try {
    spawnedBackend = await ensureBackendRunning();
  } catch (e) {
    console.warn('Backend auto-start notice:', e.message);
  }

  const results = [];
  const masterStart = performance.now();

  for (let i = 0; i < TEST_SUITES.length; i++) {
    const suite = TEST_SUITES[i];
    console.log(`[${i + 1}/${TEST_SUITES.length}] Running ${suite.name} (${suite.file})...`);

    const suiteStart = performance.now();
    let passed = false;
    let output = '';

    try {
      output = execSync(`node ${path.join(rootDir, suite.file)}`, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
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

  // Cleanup spawned backend if any
  if (spawnedBackend) {
    try {
      if (isWin) {
        execSync(`taskkill /pid ${spawnedBackend.pid} /T /F`, { stdio: 'ignore' });
      } else {
        spawnedBackend.kill('SIGTERM');
      }
    } catch (_) {}
  }

  const totalDuration = Math.round(performance.now() - masterStart);
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log('================================================================');
  console.log('📊 TEST HARNESS SUMMARY SCORECARD');
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
    console.error('❌ Test execution failed.');
    process.exit(1);
  } else {
    console.log('🏆 All test suites passed cleanly!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Master test runner fatal error:', err);
  process.exit(1);
});
