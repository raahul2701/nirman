import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
type LooseDatabase = ReturnType<typeof JSON.parse>;
type BaseSupabaseClient = SupabaseClient<LooseDatabase>;
type LooseQueryData = ReturnType<typeof JSON.parse>;
type LooseQueryResult = {
  data: LooseQueryData;
  error: (Error & { code?: string }) | null;
  count: number | null;
  status?: number;
  statusText?: string;
};
type LooseQueryBuilder = PromiseLike<LooseQueryResult> & {
  select: (...args: unknown[]) => LooseQueryBuilder;
  insert: (...args: unknown[]) => LooseQueryBuilder;
  update: (...args: unknown[]) => LooseQueryBuilder;
  upsert: (...args: unknown[]) => LooseQueryBuilder;
  delete: (...args: unknown[]) => LooseQueryBuilder;
  eq: (...args: unknown[]) => LooseQueryBuilder;
  neq: (...args: unknown[]) => LooseQueryBuilder;
  gte: (...args: unknown[]) => LooseQueryBuilder;
  lte: (...args: unknown[]) => LooseQueryBuilder;
  gt: (...args: unknown[]) => LooseQueryBuilder;
  lt: (...args: unknown[]) => LooseQueryBuilder;
  ilike: (...args: unknown[]) => LooseQueryBuilder;
  in: (...args: unknown[]) => LooseQueryBuilder;
  is: (...args: unknown[]) => LooseQueryBuilder;
  or: (...args: unknown[]) => LooseQueryBuilder;
  order: (...args: unknown[]) => LooseQueryBuilder;
  limit: (...args: unknown[]) => LooseQueryBuilder;
  range: (...args: unknown[]) => LooseQueryBuilder;
  single: (...args: unknown[]) => LooseQueryBuilder;
  maybeSingle: (...args: unknown[]) => LooseQueryBuilder;
  on: (...args: unknown[]) => LooseQueryBuilder;
  subscribe: (...args: unknown[]) => unknown;
};
type LooseSupabaseClient = Omit<BaseSupabaseClient, 'from'> & {
  from: (relation: string) => LooseQueryBuilder;
};

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
  __NIRMAN_SUPABASE_CLIENT__?: LooseSupabaseClient;
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
  }) as unknown as LooseSupabaseClient;
  globalScope.__NIRMAN_SUPABASE_CLIENT__ = supabaseClient;
}

const missingMsg = 'Supabase not configured: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
const noopThrower = new Proxy({}, {
  get() {
    return () => {
      throw new Error(missingMsg);
    };
  },
}) as unknown as LooseSupabaseClient;

// Export the configured client while preserving a typed fallback for missing envs.
export const supabase = supabaseClient ?? noopThrower;
