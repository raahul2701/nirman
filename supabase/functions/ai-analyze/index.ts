import { runGeminiJson, runGeminiText } from '../_shared/gemini.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    let prompt = "";
    let responseData: Record<string, unknown> = {};

    if (type === "problem") {
      const { category, description, title } = body;
      prompt = `You are an expert construction site safety and quality engineer.

A construction site problem has been reported:
- Title: ${title || "Not provided"}
- Category: ${category}
- Description: ${description || "Not provided"}

Analyze this problem and respond with a JSON object containing:
{
  "title": "concise problem title (max 10 words)",
  "severity": "critical|high|medium|low",
  "description": "detailed professional description (2-3 sentences)",
  "ai_analysis": "technical analysis of the root cause and implications (3-4 sentences)",
  "ai_action_steps": "numbered list of immediate action steps",
  "ai_resolution_time": "estimated resolution time"
}

Respond ONLY with valid JSON, no markdown.`;
      responseData = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1024, temperature: 0.2 });
    } else if (type === "survey") {
      const { survey_type, notes } = body;
      prompt = `You are an expert drone survey analyst for construction sites.

A ${survey_type} survey has been conducted with these notes: ${notes || "No additional notes"}

Generate a professional survey analysis report in JSON:
{
  "report": "comprehensive 4-5 sentence analysis covering progress assessment, key observations, identified issues, and recommendations",
  "findings_count": 3,
  "progress_estimate": 75
}

Respond ONLY with valid JSON, no markdown.`;
      responseData = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1024, temperature: 0.2 });
    } else if (type === "design") {
      const { project_type, area_sqft, budget_min, budget_max, floors, location, soil_type, requirements } = body;
      prompt = `You are a senior construction architect and project consultant in India.

Generate a comprehensive design brief for this project:
- Type: ${project_type}
- Area: ${area_sqft} sq ft
- Floors: ${floors}
- Location: ${location || "India"}
- Soil Type: ${soil_type}
- Budget: INR ${budget_min || 0}L to INR ${budget_max || 0}L
- Requirements: ${requirements || "Standard construction"}

Create a detailed design brief covering:
1. DESIGN CONCEPT & OVERVIEW
2. ROOM LAYOUT RECOMMENDATIONS
3. MATERIAL SPECIFICATIONS & QUANTITIES
4. COST ESTIMATE BREAKDOWN (foundation, structure, finishing, electrical, plumbing)
5. CONSTRUCTION TIMELINE (week by week)
6. NBC CODE COMPLIANCE CHECKLIST
7. SUSTAINABILITY RECOMMENDATIONS
8. RISK ASSESSMENT

Format as clean readable text with section headers. Be specific with numbers and quantities.`;
      responseData = { output: await runGeminiText(prompt, { maxTokens: 4096, temperature: 0.2 }) };
    } else if (type === "milestone") {
      const { milestone_name, description, payment_amount, completion_percentage } = body;
      prompt = `You are a government project payment verification engineer in India.

A payment milestone is being assessed:
- Milestone: ${milestone_name}
- Description: ${description || "Not provided"}
- Payment Amount: INR ${payment_amount}
- Completion Reported: ${completion_percentage}%

Analyze and respond with JSON:
{
  "safe_amount": <number - recommended safe payment amount in INR>,
  "hold_amount": <number - amount to hold back in INR>,
  "risk_level": "high|medium|low|safe",
  "analysis": "2-3 sentence professional assessment of milestone completion quality and payment risk"
}

Respond ONLY with valid JSON, no markdown.`;
      responseData = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1024, temperature: 0.2 });
    } else if (type === "work_upload") {
      const { work_category, description } = body;
      prompt = `You are a construction quality inspector for government projects in India.

Work has been uploaded for verification:
- Category: ${work_category}
- Description: ${description || "Not provided"}

Analyze and respond with JSON:
{
  "quality_score": <number 0-100>,
  "analysis": "2-3 sentence quality assessment",
  "issues": [{"type": "string", "severity": "low|medium|high", "description": "string", "location": "string"}]
}

If no issues found, return empty issues array. Respond ONLY with valid JSON.`;
      responseData = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1024, temperature: 0.2 });
    } else if (type === "payment") {
      const { claimed_amount, project_id } = body;
      prompt = `You are a government payment verification AI for construction projects in India.

A payment request has been submitted:
- Claimed Amount: INR ${claimed_amount}
- Project ID: ${project_id}

Analyze and respond with JSON:
{
  "recommended_amount": <number - safe recommended payment>,
  "hold_amount": <number - amount to hold>,
  "risk_level": "high|medium|low|safe",
  "report": "3-4 sentence payment verification report covering work verification, amount reasonableness, and risk assessment"
}

Respond ONLY with valid JSON, no markdown.`;
      responseData = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1024, temperature: 0.2 });
    } else if (type === "inspection") {
      const { inspection_type, notes } = body;
      prompt = `You are a senior government construction inspector in India.

An inspection has been conducted:
- Type: ${inspection_type}
- Notes: ${notes || "Standard inspection"}

Generate a professional inspection report in JSON:
{
  "quality_score": <number 0-100>,
  "report": "4-5 sentence comprehensive inspection report covering structural quality, workmanship, compliance, and safety",
  "recommendation": "approve|partial|hold|reject"
}

Respond ONLY with valid JSON.`;
      responseData = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1024, temperature: 0.2 });
    } else {
      responseData = { error: "Unknown analysis type" };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});