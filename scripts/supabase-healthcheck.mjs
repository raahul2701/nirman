const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('[supabase-health] SUPABASE_URL and SUPABASE_ANON_KEY are required');
  process.exit(1);
}

const checks = [
  ['rest', `${supabaseUrl}/rest/v1/`, { apikey: anonKey, Authorization: `Bearer ${anonKey}` }],
  ['auth', `${supabaseUrl}/auth/v1/settings`, { apikey: anonKey }],
  ['storage', `${supabaseUrl}/storage/v1/bucket`, { apikey: anonKey, Authorization: `Bearer ${anonKey}` }],
];

let failed = false;
for (const [label, url, headers] of checks) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers });
    const durationMs = Date.now() - started;
    console.log(`[supabase-health] ${label}: ${response.status} ${durationMs}ms`);
    if (response.status >= 500) failed = true;
  } catch (error) {
    failed = true;
    console.error(`[supabase-health] ${label}: ${error instanceof Error ? error.message : error}`);
  }
}

process.exit(failed ? 1 : 0);

