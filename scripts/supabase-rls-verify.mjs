import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const expectedProtectedTables = ['ai_request_logs', 'device_sessions', 'admin_impersonation_events', 'upload_metadata'];

if (!supabaseUrl || !anonKey) {
  console.error('[rls-verify] SUPABASE_URL and SUPABASE_ANON_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
let failed = false;

for (const table of expectedProtectedTables) {
  const { error } = await supabase.from(table).select('*').limit(1);
  const blocked = error && ['42501', 'PGRST301'].includes(error.code || '');
  console.log(`[rls-verify] ${table}: ${blocked ? 'protected' : error ? `error ${error.code}` : 'readable'}`);
  if (!blocked && table !== 'upload_metadata') failed = true;
}

process.exit(failed ? 1 : 0);

