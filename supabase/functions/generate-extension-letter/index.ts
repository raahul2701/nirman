import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getClaudeKey } from '../_shared/supabaseClient.ts';

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

    const claudeKey = getClaudeKey();
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

    return new Response(JSON.stringify({ letter: result.letter }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
