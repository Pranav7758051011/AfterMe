const { spawn } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log('🚀 Starting AfterMe Fullstack Dev Environment');
console.log('========================================================\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// 1. Start Backend
const backend = spawn(npmCmd, ['--prefix', 'backend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// 2. Start Web Frontend
const web = spawn(npmCmd, ['--prefix', 'apps/web', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

function cleanup() {
  console.log('\n🛑 Shutting down AfterMe dev services...');
  backend.kill();
  web.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
