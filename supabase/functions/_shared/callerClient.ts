import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ---------------------------------------------------------------------------
// Caller-scoped client factory.
//
// createSupabaseClient() returns a SERVICE-ROLE client in which auth.uid()
// is NULL (the service role is not an authenticated user). Any SQL function
// that relies on auth.uid() — e.g. lab_technician_allows() — MUST therefore
// be invoked through a caller-scoped client so the JWT is forwarded and
// auth.uid() resolves to the real caller.
//
// Standard Supabase Edge Function env vars:
//   SUPABASE_URL        — auto-injected
//   SUPABASE_ANON_KEY   — auto-injected (public/anon key)
//
// The Authorization header from the incoming request carries the caller's
// bearer JWT. We forward it so auth.uid() inside SECURITY DEFINER helpers
// evaluates to the actual caller.
// ---------------------------------------------------------------------------

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY is not configured');
}

/**
 * Creates a Supabase client bound to the calling user's JWT.
 *
 * @param authHeader  The raw Authorization header value, e.g. "Bearer <jwt>".
 * @returns A client whose auth.uid() resolves to the caller.
 */
export function createCallerClient(authHeader?: string | null) {
  // Strip the "Bearer " prefix so we pass just the JWT token.
  const token = authHeader
    ? authHeader.replace(/^Bearer\s+/i, '').trim()
    : '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    },
  });
}

/**
 * Extracts the caller's user ID from the bearer JWT.
 *
 * Uses the service-role client (which can verify any JWT) to call
 * supabase.auth.getUser(). This decodes the caller's token and returns
 * their user identity — it does NOT impersonate the caller for RLS
 * purposes on regular table operations (use createCallerClient for that).
 *
 * @param supabase  A service-role client (from createSupabaseClient).
 * @param authHeader The raw Authorization header.
 * @returns The caller's user ID, or throws if unauthenticated.
 */
export async function resolveCallerId(
  supabase: ReturnType<typeof createClient>,
  authHeader?: string | null,
): Promise<string> {
  const token = authHeader
    ? authHeader.replace(/^Bearer\s+/i, '').trim()
    : '';

  if (!token) {
    throw new Error('Missing Authorization header');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error(`Invalid or expired token: ${error?.message ?? 'unknown'}`);
  }

  return data.user.id;
}
