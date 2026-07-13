import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { runGeminiJson } from '../_shared/gemini.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { projectId, reportIds } = body;

    if (!projectId || !Array.isArray(reportIds)) {
      return new Response(JSON.stringify({ error: 'projectId and reportIds are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createSupabaseClient();
    const { data: reports, error } = await supabase
      .from('daily_reports')
      .select('*')
      .in('id', reportIds);
    if (error) throw error;

    const prompt = `You are an expert third-party auditor for government construction projects.

Analyze discrepancies between the following daily reports and project expectations:
${JSON.stringify(reports || [], null, 2)}

Identify inconsistencies, workmanship risks, productivity gaps, and recommended corrective actions. Return JSON:
{
  "discrepancies": [{"issue":"string","severity":"low|medium|high|critical","recommendation":"string"}],
  "summary":"string"
}
Respond ONLY with valid JSON.`;

    const result = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1200, temperature: 0.2 });

    return new Response(JSON.stringify({ success: true, analysis: result, response: JSON.stringify(result) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});