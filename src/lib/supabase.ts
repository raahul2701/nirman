import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (response.status < 500 || attempt === 2) return response;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(400 * 2 ** attempt, 1600)));
  }
  throw lastError instanceof Error ? lastError : new Error('Supabase request failed');
}

const globalScope = globalThis as typeof globalThis & {
  __NIRMAN_SUPABASE_CLIENT__?: SupabaseClient<Database>;
};

let supabaseClient = globalScope.__NIRMAN_SUPABASE_CLIENT__ ?? null;
if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: 'nirman-auth-token',
    },
    global: {
      headers: {},
      fetch: fetchWithRetry,
    },
  });
  globalScope.__NIRMAN_SUPABASE_CLIENT__ = supabaseClient;
}

const missingMsg = 'Supabase not configured: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
const noopThrower = new Proxy({}, {
  get() {
    return () => {
      throw new Error(missingMsg);
    };
  },
}) as unknown as SupabaseClient<Database>;

// Export with loose typing for table operations to avoid TypeScript strict mode issues
// while maintaining runtime functionality
export const supabase = (supabaseClient ?? noopThrower) as any;
