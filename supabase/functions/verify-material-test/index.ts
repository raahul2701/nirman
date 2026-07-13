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
    const { testId, materialType, testType, requiredValue, achievedValue, labName, labCertificateNumber, reportUrl } = body;

    if (!testId || !materialType || !testType || !requiredValue || !achievedValue) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a senior materials engineer and construction quality auditor. Verify this material test record using Indian standards.

Material Type: ${materialType}
Test Type: ${testType}
Required Value: ${requiredValue}
Achieved Value: ${achievedValue}
Laboratory: ${labName}
Lab Certificate Number: ${labCertificateNumber || 'not provided'}
Report URL: ${reportUrl || 'none'}

Evaluate:
- Lab accreditation
- Test values and consistency
- Date mismatch and suspicious report timing
- Fake or inconsistent signatures and formatting
- IS code references
- Duplicate or previously submitted reports
- Suspicious formatting or unrealistic values

Return strict JSON:
{
  "verified": boolean,
  "authenticity_score": number,
  "suspicious_flags": ["string"],
  "recommendation": "string"
}

Respond ONLY with valid JSON.`;

    const result = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1200, temperature: 0.2 });

    const supabase = createSupabaseClient();
    await supabase.from('material_tests').update({
      ai_report_verified: result.verified,
      ai_verification_notes: result.recommendation,
      ai_authenticity_score: result.authenticity_score,
      blocks_payment: !result.verified,
      ai_verification_flags: result.suspicious_flags,
      reviewed_by: null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', testId);

    return new Response(JSON.stringify({ success: true, result, response: JSON.stringify(result) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});