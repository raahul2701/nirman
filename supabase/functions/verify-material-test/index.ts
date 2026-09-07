import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { createCallerClient, resolveCallerId } from '../_shared/callerClient.ts';
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

    // AUTHORIZATION: verify the caller is an active lab_technician
    // for the project that owns the material test.
    //
    // Verified facts:
    //   - material_tests has NO workspace_id; test project = project_id
    //   - neither project table nor material_tests has workspace_id;
    //     project_user_scopes carries the caller's workspace relationship
    //   - lab_technician_allows() uses auth.uid() → must be called via
    //     a CALLER-SCOPED client (anon key + bearer JWT), NOT service-role
    const authHeader = req.headers.get('Authorization');
    const supabase = createSupabaseClient(); // service-role: bypass RLS for reads/writes

    let callerId: string;
    try {
      callerId = await resolveCallerId(supabase, authHeader);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: `Authentication required: ${(e as Error).message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Load the material test → its project_id
    const { data: testRow, error: testErr } = await supabase
      .from('material_tests')
      .select('project_id')
      .eq('id', testId)
      .single();
    if (testErr || !testRow?.project_id) {
      return new Response(
        JSON.stringify({ error: 'Material test not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const projectId = testRow.project_id as string;

    // Resolve the workspace through the caller-scoped client. The RPC below
    // performs the authoritative three-table authorization check again.
    const callerClient = createCallerClient(authHeader);
    const { data: scopes, error: scopeErr } = await callerClient
      .from('project_user_scopes')
      .select('workspace_id')
      .eq('project_id', projectId)
      .eq('user_id', callerId)
      .eq('role', 'lab_technician')
      .eq('active', true);

    if (scopeErr) {
      return new Response(
        JSON.stringify({ error: `Scope lookup failed: ${scopeErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    // Authorize via lab_technician_allows() → caller-scoped client (auth.uid() = caller)
    const workspaceIds = Array.from(
      new Set((scopes ?? []).map((scope) => scope.workspace_id).filter(Boolean)),
    );
    let authorized = false;

    for (const workspaceId of workspaceIds) {
      const { data: allowed, error: authErr } = await callerClient.rpc('lab_technician_allows', {
        target_workspace_id: workspaceId,
        target_project_id: projectId,
      });

      if (authErr) {
        return new Response(
          JSON.stringify({ error: `Authorization lookup failed: ${authErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (allowed === true) {
        authorized = true;
        break;
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Not authorized: no active authorized lab_technician scope for this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // AI ANALYSIS (only after authorization passes)

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

    await supabase.from('material_tests').update({
      ai_report_verified: result.verified,
      ai_verification_notes: result.recommendation,
      ai_authenticity_score: result.authenticity_score,
      blocks_payment: !result.verified,
      reviewed_by: callerId,
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