import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { runGeminiJson } from '../_shared/gemini.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, days = 7 } = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: project_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createSupabaseClient();
    const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('project_id', project_id)
      .gte('report_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('report_date', { ascending: false });

    if (reportsError) throw reportsError;

    const { data: boqData, error: boqError } = await supabase
      .from('project_boq')
      .select(`
        *,
        boq_items (*)
      `)
      .eq('project_id', project_id)
      .single();

    if (boqError && boqError.code !== 'PGRST116') throw boqError;

    const analysisData = {
      project_id,
      analysis_period_days: days,
      total_reports: reports?.length || 0,
      reports_summary: reports?.map((r) => ({
        date: r.report_date,
        manpower: r.total_workers,
        work_done: r.work_description,
        quantity: r.work_quantity,
        unit: r.work_unit,
        materials_used: r.materials_used,
        equipment_used: r.equipment_used,
        issues: r.issues_faced,
        weather: r.weather_conditions,
      })) || [],
      boq_items: boqData?.boq_items || [],
    };

    const prompt = `You are an expert construction project manager and quantity surveyor. Analyze the following ${days}-day progress data and BOQ targets.

PROJECT PROGRESS ANALYSIS REQUIREMENTS:
1. Work Progress Assessment: Compare actual work completed vs BOQ targets
2. Efficiency Analysis: Evaluate manpower utilization and productivity
3. Material Consumption: Analyze material usage patterns
4. Schedule Performance: Assess if project is on track
5. Risk Identification: Identify potential delays or issues
6. Recommendations: Provide specific actionable recommendations

DATA PROVIDED:
${JSON.stringify(analysisData, null, 2)}

RESPONSE FORMAT: Return a JSON object with this exact structure:
{
  "overall_progress_percentage": number,
  "efficiency_score": number,
  "schedule_status": "ahead|on_track|delayed|critical_delay",
  "manpower_utilization": number,
  "material_efficiency": number,
  "key_findings": ["string"],
  "risks_identified": ["string"],
  "recommendations": ["string"],
  "next_week_targets": ["string"],
  "estimated_completion_date": "YYYY-MM-DD",
  "confidence_level": number
}

Respond ONLY with valid JSON, no additional text.`;

    const aiAnalysis = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 4000, temperature: 0.1 });

    const analysisRecord = {
      project_id,
      analysis_period_days: days,
      total_reports_analyzed: reports?.length || 0,
      ai_overall_progress: aiAnalysis.overall_progress_percentage,
      ai_efficiency_score: aiAnalysis.efficiency_score,
      ai_schedule_status: aiAnalysis.schedule_status,
      ai_manpower_utilization: aiAnalysis.manpower_utilization,
      ai_material_efficiency: aiAnalysis.material_efficiency,
      ai_key_findings: aiAnalysis.key_findings,
      ai_risks_identified: aiAnalysis.risks_identified,
      ai_recommendations: aiAnalysis.recommendations,
      ai_next_week_targets: aiAnalysis.next_week_targets,
      ai_estimated_completion: aiAnalysis.estimated_completion_date,
      ai_confidence_level: aiAnalysis.confidence_level,
      raw_data: analysisData,
    };

    const { data: savedAnalysis, error: saveError } = await supabase
      .from('ai_progress_reports')
      .insert([analysisRecord])
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ success: true, analysis: aiAnalysis, saved_record: savedAnalysis }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('analyze-progress function error:', error);
    return new Response(
      JSON.stringify({ error: 'Progress analysis failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});