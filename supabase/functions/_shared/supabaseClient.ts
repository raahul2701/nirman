import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  return createClient(supabaseUrl, supabaseKey);
}


export function getOpenWeatherKey() {
  const key = Deno.env.get('OPENWEATHER_API_KEY');
  if (!key) {
    throw new Error('OpenWeatherMap API key not configured');
  }
  return key;
}

