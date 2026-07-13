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
    const { disputeId, agreementText, boq, disputeDescription, claimAmount, contractClauses } = body;

    if (!disputeId || !agreementText || !disputeDescription || typeof claimAmount !== 'number') {
      return new Response(JSON.stringify({ error: 'Missing required dispute fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an expert legal AI for Indian government construction dispute resolution.

Agreement Text:
${agreementText}

Dispute Description:
${disputeDescription}

Claim Amount: INR ${claimAmount}

BOQ Summary:
${boq || 'Not provided'}

Contract Clauses:
${(contractClauses || []).join('\n')}

Analyze validity, contract compliance, risk and arbitration probability. Return strict JSON with:
{
  "valid_amount": number,
  "invalid_amount": number,
  "confidence_score": number,
  "arbitration_risk": "low|medium|high|critical",
  "referenced_clauses": [{ "clause": "string", "page": number, "text": "string" }],
  "recommendation": "string",
  "reasoning": "string"
}
Respond ONLY with valid JSON.`;

    const result = await runGeminiJson<Record<string, unknown>>(prompt, { maxTokens: 1400, temperature: 0.2 });

    const supabase = createSupabaseClient();
    await supabase.from('disputes').update({
      ai_contract_analysis: result.reasoning,
      ai_valid_claim_amount: result.valid_amount,
      ai_invalid_claim_amount: result.invalid_amount,
      ai_confidence_score: result.confidence_score,
      ai_contract_references: result.referenced_clauses,
      ai_recommendation: result.recommendation,
      resolution_status: 'ai_review',
    }).eq('id', disputeId);

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