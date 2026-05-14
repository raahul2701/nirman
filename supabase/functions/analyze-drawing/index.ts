import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getClaudeKey } from '../_shared/supabaseClient.ts';

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function downloadBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return uint8ArrayToBase64(bytes);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { drawingUrl, sitePhotoUrl, projectId, drawingType, elementType, drawingSpec, siteObservation } = body;

    if (!drawingUrl || !sitePhotoUrl || !projectId) {
      return new Response(JSON.stringify({ error: 'drawingUrl, sitePhotoUrl, and projectId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claudeKey = getClaudeKey();
    const drawingBase64 = await downloadBase64(drawingUrl);
    const photoBase64 = await downloadBase64(sitePhotoUrl);

    const prompt = `You are an expert Indian government construction quality inspection AI.

Compare this engineering drawing with the actual site photograph.

Drawing type: ${drawingType}
Element type: ${elementType}
Drawing specification: ${drawingSpec}
Site observation: ${siteObservation}

Detect:
- Column mismatch
- Beam size mismatch
- Slab thickness mismatch
- Reinforcement issues
- Alignment issues
- Missing structural elements
- Honeycombing
- Poor workmanship

Return STRICT JSON:
{
  "compliance_score": number,
  "severity": "compliant/minor/major/critical",
  "elements": [{ "element": "string", "issue": "string", "severity": "string", "recommendation": "string" }],
  "critical_issues": ["string"],
  "recommendation": "string",
  "stop_work": boolean
}

If image analysis is needed, use the base64 dumps below.

DRAWING BASE64: ${drawingBase64.slice(0, 9000)}
SITE PHOTO BASE64: ${photoBase64.slice(0, 9000)}

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

    if (!response.ok) {
      throw new Error(`Claude error ${response.status}`);
    }

    const payload = await response.json();
    const text = payload.content?.[0]?.text || payload.completion?.[0]?.text || '';
    const result = JSON.parse(text);

    const supabase = createSupabaseClient();
    await supabase.from('drawing_comparisons').insert([{
      project_id: projectId,
      drawing_url: drawingUrl,
      site_photo_url: sitePhotoUrl,
      drawing_type: drawingType || 'drawing',
      element_type: elementType || 'structure',
      drawing_specification: drawingSpec || '',
      site_observation: siteObservation || '',
      ai_comparison_result: JSON.stringify(result),
      ai_deviation_found: result.severity !== 'compliant',
      ai_deviation_percentage: result.compliance_score ? 100 - result.compliance_score : 0,
      ai_severity: result.severity,
      ai_details: result.elements || [],
      action_required: result.recommendation,
      status: result.stop_work ? 'open' : 'accepted',
      compared_by: null,
    }]);

    return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
