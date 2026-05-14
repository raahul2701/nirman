import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export function getClaudeKey() {
  const key = Deno.env.get('CLAUDE_API_KEY');
  if (!key) {
    throw new Error('Claude API key not configured');
  }
  return key;
}

export function getOpenWeatherKey() {
  const key = Deno.env.get('OPENWEATHER_API_KEY');
  if (!key) {
    throw new Error('OpenWeatherMap API key not configured');
  }
  return key;
}
