import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const startedAt = Date.now();
  try {
    const supabase = createSupabaseClient();
    const checks: Record<string, unknown> = {
      aiProxyConfigured: Boolean(Deno.env.get('GEMINI_API_KEY')),
    };

    const { error } = await supabase.from('ai_request_logs').select('id').limit(1);
    checks.database = error ? `warning:${error.code || error.message}` : 'ok';

    return json({ ok: true, status: checks, durationMs: Date.now() - startedAt });
  } catch (error) {
    return json({
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown health error',
      durationMs: Date.now() - startedAt,
    }, 503);
  }
});
