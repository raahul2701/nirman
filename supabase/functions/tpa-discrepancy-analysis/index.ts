import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getClaudeKey } from '../_shared/supabaseClient.ts';

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
    const claudeKey = getClaudeKey();

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1200,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API returned ${response.status}`);
    const payload = await response.json();
    const text = payload.content?.[0]?.text || payload.completion?.[0]?.text || '';
    const result = JSON.parse(text);

    return new Response(JSON.stringify({ success: true, analysis: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
