import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getOpenWeatherKey } from '../_shared/supabaseClient.ts';

function determineWeatherType(weatherMain: string, rain: number, windSpeed: number) {
  if (weatherMain.toLowerCase().includes('storm') || weatherMain.toLowerCase().includes('thunderstorm')) return 'storm';
  if (weatherMain.toLowerCase().includes('rain')) return rain > 15 ? 'heavy_rain' : 'light_rain';
  if (weatherMain.toLowerCase().includes('snow')) return 'flood';
  if (weatherMain.toLowerCase().includes('fog') || weatherMain.toLowerCase().includes('mist')) return 'fog';
  if (weatherMain.toLowerCase().includes('clear') && rain === 0 && windSpeed > 20) return 'extreme_heat';
  if (rain >= 50) return 'flood';
  return 'normal';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const apiKey = getOpenWeatherKey();

    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, project_id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (sitesError) throw sitesError;

    const entries: Array<Record<string, unknown>> = [];
    for (const site of sites || []) {
      const lat = Number(site.lat);
      const lon = Number(site.lng);
      if (!lat || !lon) continue;

      const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
      if (!weatherResponse.ok) continue;
      const weatherData = await weatherResponse.json();

      const rainfall = Number(weatherData.rain?.['1h'] || weatherData.rain?.['3h'] || 0);
      const temperature = Number(weatherData.main?.temp || 0);
      const windSpeed = Number(weatherData.wind?.speed || 0);
      const weatherType = determineWeatherType(weatherData.weather?.[0]?.main || 'normal', rainfall, windSpeed);
      const workStopped = rainfall > 15 || weatherType === 'storm' || weatherType === 'flood';

      entries.push({
        site_id: site.id,
        project_id: site.project_id,
        weather_type: weatherType,
        work_stopped: workStopped,
        hours_lost: workStopped ? 8 : 0,
        reason_details: weatherType === 'storm' ? 'Severe weather halted work' : weatherType === 'flood' ? 'Flood warning' : 'Automatic weather sync',
        auto_fetched: true,
        temperature,
        rainfall_mm: rainfall,
        wind_speed: windSpeed,
        weather_api_data: weatherData,
        photos: [],
        reported_by: null,
        created_at: new Date().toISOString(),
      });
    }

    if (entries.length > 0) {
      await supabase.from('weather_logs').insert(entries);
    }

    return new Response(JSON.stringify({ success: true, entries_created: entries.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
