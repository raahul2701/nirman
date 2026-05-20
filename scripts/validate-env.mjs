import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] || process.env.VITE_APP_ENV || 'production';
const file = resolve(process.cwd(), `.env.${mode}`);
const baseFile = resolve(process.cwd(), '.env');
const allowedModes = new Set(['development', 'staging', 'production']);

if (!allowedModes.has(mode)) {
  console.error(`[env] Unknown mode "${mode}". Use development, staging, or production.`);
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`[env] Missing ${file}`);
  process.exit(1);
}

function readEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }));
}

const values = { ...readEnv(baseFile), ...readEnv(file), ...process.env };

const required = ['VITE_APP_ENV', 'VITE_APP_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_ENABLE_PRODUCTION_GUARDS'];
const placeholder = /replace_|your_|example|localhost:54321/i;
const errors = [];
const warnings = [];

for (const key of required) {
  if (!values[key]) errors.push(`Missing ${key}`);
}

if (values.VITE_APP_ENV !== mode) {
  errors.push(`VITE_APP_ENV=${values.VITE_APP_ENV} does not match .env.${mode}`);
}

if (mode !== 'development') {
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_APP_URL']) {
    if (placeholder.test(values[key] || '')) errors.push(`${key} still contains a placeholder value`);
  }
  if (values.VITE_ENABLE_PRODUCTION_GUARDS !== 'true') errors.push('VITE_ENABLE_PRODUCTION_GUARDS must be true outside development');
  if (!/^https:\/\//.test(values.VITE_APP_URL || '')) errors.push('Hosted APP_URL must use HTTPS');
}

const viteSecretKeys = Object.keys(values).filter((key) => key.startsWith('VITE_') && /GEMINI_API_KEY|SERVICE_ROLE|SIGNING_SECRET|SECRET|PRIVATE/.test(key));
if (viteSecretKeys.length) {
  errors.push(`Server-only secrets must not be exposed through VITE_* keys: ${viteSecretKeys.join(', ')}`);
}

if (!values.VITE_MAP_API_KEY) warnings.push('VITE_MAP_API_KEY empty; map previews will use fallback providers');
if (mode !== 'development' && !process.env.VITE_SUPABASE_URL) warnings.push('Hosted Supabase URL should be injected by CI/provider env, not committed files');

for (const warning of warnings) console.warn(`[env] warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`[env] error: ${error}`);
  process.exit(1);
}

console.log(`[env] .env.${mode} passed validation`);
