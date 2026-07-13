import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { runGeminiJson } from '../_shared/gemini.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { projectId, extensionRequest } = body;

    if (!projectId || !extensionRequest) {
      return new Response(JSON.stringify({ error: 'projectId and extensionRequest are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are an expert Indian construction contracts manager. Generate a formal extension of time application letter for this request.

Project ID: ${projectId}

Request details:
${JSON.stringify(extensionRequest, null, 2)}

Include:
1. Reference to original contract
2. Summary of hindrance events
3. Analysis of entitlement
4. Extension granted
5. New completion date
6. Conditions and closing

Return the letter as plain text in a JSON object: { "letter": "..." }
Respond ONLY with valid JSON.`;

    const result = await runGeminiJson<{ letter?: string }>(prompt, { maxTokens: 1200, temperature: 0.2 });

    return new Response(JSON.stringify({ letter: result.letter || '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});