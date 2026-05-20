export interface EnvironmentStatus {
  ok: boolean;
  mode: 'development' | 'staging' | 'production';
  warnings: string[];
  errors: string[];
  features: {
    supabase: boolean;
    aiProxy: boolean;
    maps: boolean;
    remoteLogs: boolean;
    productionGuards: boolean;
  };
}

const validModes = ['development', 'staging', 'production'] as const;
const placeholderPattern = /replace_|your_|example/i;

export function validateEnvironment(): EnvironmentStatus {
  const warnings: string[] = [];
  const errors: string[] = [];
  const requestedMode = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || (import.meta.env.PROD ? 'production' : 'development')) as string;
  const mode = validModes.includes(requestedMode as EnvironmentStatus['mode'])
    ? requestedMode as EnvironmentStatus['mode']
    : 'development';
  const appUrl = import.meta.env.VITE_APP_URL as string | undefined;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const features = {
    supabase: Boolean(supabaseUrl && supabaseAnonKey),
    aiProxy: Boolean(supabaseUrl && supabaseAnonKey),
    maps: Boolean(import.meta.env.VITE_MAP_API_KEY),
    remoteLogs: import.meta.env.VITE_ENABLE_REMOTE_LOGS === 'true',
    productionGuards: import.meta.env.VITE_ENABLE_PRODUCTION_GUARDS === 'true',
  };

  if (!features.supabase) warnings.push('Supabase env is incomplete; app will use graceful client fallbacks.');
  if (!features.aiProxy) warnings.push('AI proxy unavailable; AI requests will fail gracefully.');
  if (!features.maps) warnings.push('Map API key missing; OSM fallback previews will be used.');
  if (!validModes.includes(requestedMode as EnvironmentStatus['mode'])) warnings.push(`Unknown VITE_APP_ENV "${requestedMode}"; using development safeguards.`);

  if (import.meta.env.PROD && mode !== 'production' && mode !== 'staging') {
    errors.push(`Production build is running with VITE_APP_ENV=${mode}.`);
  }

  if ((mode === 'production' || mode === 'staging') && !features.productionGuards) {
    errors.push('Production guards must be enabled for hosted environments.');
  }

  if ((mode === 'production' || mode === 'staging') && appUrl && !appUrl.startsWith('https://')) {
    errors.push('Hosted VITE_APP_URL must use HTTPS.');
  }

  if ((mode === 'production' || mode === 'staging') && [appUrl, supabaseUrl, supabaseAnonKey].some((value) => placeholderPattern.test(value || ''))) {
    errors.push('Hosted environment contains placeholder values.');
  }

  if (supabaseUrl && mode === 'production' && /staging|localhost|127\.0\.0\.1/i.test(supabaseUrl)) {
    errors.push('Production environment appears to point at staging/local Supabase.');
  }

  if (supabaseUrl && mode === 'staging' && /localhost|127\.0\.0\.1/i.test(supabaseUrl)) {
    errors.push('Staging environment appears to point at local Supabase.');
  }

  return { ok: features.supabase && errors.length === 0, mode, warnings, errors, features };
}

export function reportEnvironmentStatus() {
  const status = validateEnvironment();
  for (const warning of status.warnings) console.warn(`[env] ${warning}`);
  for (const error of status.errors) console.error(`[env] ${error}`);
  return status;
}
