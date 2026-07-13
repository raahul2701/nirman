import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { runGeminiJson } from '../_shared/gemini.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { file_url, file_type, project_id } = await req.json();

    if (!file_url || !file_type || !project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: file_url, file_type, project_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createSupabaseClient();

    let fileContent = '';
    if (file_type === 'pdf') {
      fileContent = 'PDF content extraction would be implemented here';
    } else if (file_type === 'xlsx' || file_type === 'xls') {
      fileContent = 'Excel content extraction would be implemented here';
    }

    const prompt = `You are an expert quantity surveyor and construction estimator. Extract and structure Bill of Quantities (BOQ) data from the following document.

DOCUMENT TYPE: ${String(file_type).toUpperCase()}
PROJECT CONTEXT: Construction project BOQ extraction
SOURCE FILE URL: ${file_url}

EXTRACTION REQUIREMENTS:
1. Identify all work items with quantities, units, and rates
2. Categorize items by work type (civil, electrical, plumbing, etc.)
3. Calculate total amounts where missing
4. Ensure all items have complete information
5. Group similar items logically

DOCUMENT CONTENT:
${fileContent}

RESPONSE FORMAT: Return a JSON object with this exact structure:
{
  "extraction_success": boolean,
  "total_items": number,
  "total_estimated_value": number,
  "items": [
    {
      "item_code": "string (e.g., CIVIL-001)",
      "description": "string (detailed description)",
      "category": "civil|electrical|plumbing|structural|finishing|other",
      "work_type": "earthwork|concrete|masonry|plastering|flooring|electrical|plumbing|finishing|other",
      "unit": "sqm|cum|kg|nos|rmt|ls",
      "quantity": number,
      "rate": number,
      "amount": number,
      "notes": "string (optional additional notes)"
    }
  ],
  "summary": {
    "civil_works_value": number,
    "electrical_works_value": number,
    "plumbing_works_value": number,
    "other_works_value": number,
    "total_value": number
  },
  "confidence_score": number
}

If extraction fails or document is unreadable, set extraction_success to false and provide error details.
Respond ONLY with valid JSON, no additional text.`;

    const extractionResult = await runGeminiJson<{ extraction_success?: boolean; items?: Array<Record<string, unknown>>; total_estimated_value?: number; confidence_score?: number }>(prompt, { maxTokens: 6000, temperature: 0.1 });

    if (!extractionResult.extraction_success) {
      return new Response(
        JSON.stringify({ success: false, error: 'BOQ extraction failed', details: extractionResult }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const boqResult = await supabase
      .from('project_boq')
      .select('id')
      .eq('project_id', project_id)
      .single();
    let boqData = boqResult.data;
    const boqError = boqResult.error;

    if (boqError && boqError.code === 'PGRST116') {
      const { data: newBoq, error: createError } = await supabase
        .from('project_boq')
        .insert([{ project_id }])
        .select('id')
        .single();

      if (createError) throw createError;
      boqData = newBoq;
    } else if (boqError) {
      throw boqError;
    }

    if (!boqData?.id) {
      throw new Error('Unable to resolve project BOQ row');
    }

    const boqItems = (extractionResult.items || []).map((item) => ({
      boq_id: boqData.id,
      item_code: item.item_code,
      description: item.description,
      category: item.category,
      work_type: item.work_type,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      completed_quantity: 0,
      completion_percentage: 0,
      notes: item.notes || null,
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from('boq_items')
      .insert(boqItems)
      .select();

    if (insertError) throw insertError;

    await supabase
      .from('project_boq')
      .update({
        total_estimated_value: extractionResult.total_estimated_value,
        extraction_confidence: extractionResult.confidence_score,
        extracted_at: new Date().toISOString(),
        source_file_url: file_url,
      })
      .eq('id', boqData.id);

    return new Response(
      JSON.stringify({
        success: true,
        extraction: extractionResult,
        inserted_items_count: insertedItems?.length || 0,
        boq_id: boqData.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('extract-boq function error:', error);
    return new Response(
      JSON.stringify({ error: 'BOQ extraction failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});