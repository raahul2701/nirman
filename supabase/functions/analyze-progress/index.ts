import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { project_id, days = 7 } = await req.json()

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get Claude API key
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Claude API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch recent daily reports
    const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('project_id', project_id)
      .gte('report_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('report_date', { ascending: false })

    if (reportsError) throw reportsError

    // Fetch BOQ data
    const { data: boqData, error: boqError } = await supabase
      .from('project_boq')
      .select(`
        *,
        boq_items (*)
      `)
      .eq('project_id', project_id)
      .single()

    if (boqError && boqError.code !== 'PGRST116') throw boqError

    // Prepare analysis data
    const analysisData = {
      project_id,
      analysis_period_days: days,
      total_reports: reports?.length || 0,
      reports_summary: reports?.map(r => ({
        date: r.report_date,
        manpower: r.total_workers,
        work_done: r.work_description,
        quantity: r.work_quantity,
        unit: r.work_unit,
        materials_used: r.materials_used,
        equipment_used: r.equipment_used,
        issues: r.issues_faced,
        weather: r.weather_conditions
      })) || [],
      boq_items: boqData?.boq_items || []
    }

    // Create AI analysis prompt
    const prompt = `You are an expert construction project manager and quantity surveyor. Analyze the following ${days}-day progress data and BOQ targets.

PROJECT PROGRESS ANALYSIS REQUIREMENTS:

1. **Work Progress Assessment**: Compare actual work completed vs BOQ targets
2. **Efficiency Analysis**: Evaluate manpower utilization and productivity
3. **Material Consumption**: Analyze material usage patterns
4. **Schedule Performance**: Assess if project is on track
5. **Risk Identification**: Identify potential delays or issues
6. **Recommendations**: Provide specific actionable recommendations

DATA PROVIDED:
${JSON.stringify(analysisData, null, 2)}

RESPONSE FORMAT: Return a JSON object with this exact structure:
{
  "overall_progress_percentage": number (0-100),
  "efficiency_score": number (1-10),
  "schedule_status": "ahead|on_track|delayed|critical_delay",
  "manpower_utilization": number (percentage),
  "material_efficiency": number (percentage),
  "key_findings": string[] (3-5 bullet points),
  "risks_identified": string[] (identified risks),
  "recommendations": string[] (actionable recommendations),
  "next_week_targets": string[] (specific targets),
  "estimated_completion_date": "YYYY-MM-DD" (based on current progress),
  "confidence_level": number (1-10, how confident in this analysis)
}

Respond ONLY with valid JSON, no additional text.`

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    })

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const aiAnalysis = JSON.parse(claudeData.content[0].text)

    // Save analysis to database
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
      raw_data: analysisData
    }

    const { data: savedAnalysis, error: saveError } = await supabase
      .from('ai_progress_reports')
      .insert([analysisRecord])
      .select()
      .single()

    if (saveError) throw saveError

    return new Response(
      JSON.stringify({
        success: true,
        analysis: aiAnalysis,
        saved_record: savedAnalysis
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('analyze-progress function error:', error)

    return new Response(
      JSON.stringify({
        error: 'Progress analysis failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})