import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(label, command, args) {
  console.log(`[deploy-validate] ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

const mode = process.argv[2] || 'production';
run('environment', 'node', ['scripts/validate-env.mjs', mode]);
run('typecheck', 'npm', ['run', 'typecheck']);
run('build', 'npm', ['run', 'build']);

const dist = resolve(process.cwd(), 'dist');
const requiredFiles = ['index.html', 'manifest.json', 'sw.js', 'offline.html'];
for (const file of requiredFiles) {
  if (!existsSync(resolve(dist, file))) {
    console.error(`[deploy-validate] missing dist/${file}`);
    process.exit(1);
  }
}

const emittedText = readFileSync(resolve(dist, 'sw.js'), 'utf8') + readFileSync(resolve(dist, 'index.html'), 'utf8');
if (/GEMINI_API_KEY|SERVICE_ROLE|SIGNING_SECRET|sk-/.test(emittedText)) {
  console.error('[deploy-validate] possible secret found in emitted assets');
  process.exit(1);
}

console.log('[deploy-validate] production artifact checks passed');
