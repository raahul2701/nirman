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
    const { projectId } = body;
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createSupabaseClient();
    const [{ data: reports }, { data: budgetSnapshots }] = await Promise.all([
      supabase.from('daily_reports').select('report_date, total_workers, work_description, issues_faced, weather_conditions').eq('project_id', projectId).order('report_date', { ascending: false }).limit(7),
      supabase.from('budget_progress_snapshots').select('snapshot_date, financial_progress_percent, physical_progress_percent, gap_percentage').eq('project_id', projectId).order('snapshot_date', { ascending: false }).limit(4),
    ]);

    const prompt = `You are an expert construction management AI. Create a concise weekly project report for project ${projectId} using the last 7 daily reports and summary of budget progress.

Daily reports:
${JSON.stringify(reports || [], null, 2)}

Budget snapshots:
${JSON.stringify(budgetSnapshots || [], null, 2)}

Return JSON:
{
  "summary": "string",
  "risks": ["string"],
  "recommendations": ["string"],
  "next_week_focus": ["string"]
}
Respond ONLY with valid JSON.`;

    const result = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1200, temperature: 0.2 });

    return new Response(JSON.stringify({ success: true, report: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});