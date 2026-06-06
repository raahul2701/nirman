import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type StudyRequest = {
  document_id: string;
  workspace_id: string;
  project_id: string;
};

type ExtractedBoqItem = {
  item_number?: string;
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  technical_specification?: string;
};

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response parsing failed: no JSON object returned");
  return JSON.parse(match[0]);
}

function isTextDocument(path: string, mimeType?: string | null) {
  const lowerPath = path.toLowerCase();
  return (mimeType || "").startsWith("text/") || lowerPath.endsWith(".txt") || lowerPath.endsWith(".csv");
}

function isPdfDocument(path: string, mimeType?: string | null) {
  return mimeType === "application/pdf" || path.toLowerCase().endsWith(".pdf");
}

function resolveMimeType(path: string, mimeType?: string | null) {
  if (mimeType) return mimeType;
  if (path.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (path.toLowerCase().endsWith(".csv")) return "text/csv";
  if (path.toLowerCase().endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function buildDocumentParts(supabase: ReturnType<typeof createClient>, bucket: string, path: string, mimeType?: string | null): Promise<GeminiPart[]> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`File not found or storage permission issue: ${error.message}`);

  if (isTextDocument(path, mimeType)) {
    const text = await data.text();
    if (!text.trim()) throw new Error("Parsing failed: uploaded document is empty.");
    return [{ text: text.slice(0, 28000) }];
  }

  if (isPdfDocument(path, mimeType)) {
    return [{
      inlineData: {
        mimeType: resolveMimeType(path, mimeType),
        data: await blobToBase64(data),
      },
    }];
  }

  throw new Error("Unsupported file type/parser. AI Study currently supports PDF, CSV, and TXT. DOC/DOCX/XLS/XLSX need a production document parser before AI Study can read file contents.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let documentId: string | null = null;

  try {
    const input = await req.json() as StudyRequest;
    documentId = input.document_id;
    if (!input.document_id || !input.workspace_id || !input.project_id) {
      return jsonResponse({ error: "document_id, workspace_id and project_id are required" }, 400);
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("Missing server-side Gemini/API key. Configure GEMINI_API_KEY in Supabase Edge Function secrets.");
    }

    const { data: document, error: documentError } = await supabase
      .from("agreement_documents")
      .select("*")
      .eq("id", input.document_id)
      .eq("workspace_id", input.workspace_id)
      .eq("project_id", input.project_id)
      .maybeSingle();

    if (documentError) throw documentError;
    if (!document) throw new Error("Agreement document row not found for this workspace/project.");

    await supabase
      .from("agreement_documents")
      .update({ document_status: "processing", ai_processing_status: "running", ai_error_message: null, updated_at: new Date().toISOString() })
      .eq("id", input.document_id);

    const storagePath = document.supabase_path || document.storage_path;
    if (!storagePath) throw new Error("File not found: agreement document has no Supabase storage path.");

    const documentParts = await buildDocumentParts(supabase, "project-files", storagePath, document.mime_type);

    const prompt = [
      "Extract an Indian public works agreement/BOQ into strict JSON.",
      "Return keys: extracted_boq, technical_specifications, milestones, bg_terms, sd_terms, dlp_terms, payment_terms, completion_schedule, important_clauses, confidence_score.",
      "extracted_boq must contain item_number, description, quantity, unit, rate, amount, technical_specification.",
      "AI is advisory only. Final approval is subject to EE/department verification.",
      "Read the attached document or pasted text and return only JSON.",
    ].join("\n\n");

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...documentParts] }] }),
    });

    const geminiBody = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      throw new Error(`Edge Function AI provider error: ${geminiBody.error?.message || geminiResponse.statusText}`);
    }

    const responseText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("AI response parsing failed: empty Gemini response.");
    const study = extractJson(responseText);
    const extractedBoq = Array.isArray(study.extracted_boq) ? study.extracted_boq as ExtractedBoqItem[] : [];

    const { data: aiStudy, error: studyError } = await supabase
      .from("ai_project_study")
      .insert({
        workspace_id: input.workspace_id,
        project_id: input.project_id,
        agreement_document_id: input.document_id,
        extracted_boq: extractedBoq,
        technical_specifications: study.technical_specifications || [],
        milestones: study.milestones || [],
        bg_terms: study.bg_terms || {},
        sd_terms: study.sd_terms || {},
        dlp_terms: study.dlp_terms || {},
        payment_terms: study.payment_terms || {},
        completion_schedule: study.completion_schedule || {},
        important_clauses: study.important_clauses || [],
        confidence_score: Number(study.confidence_score || 0),
      })
      .select()
      .single();

    if (studyError) throw studyError;

    if (extractedBoq.length > 0) {
      const { error: boqError } = await supabase.from("boq_items").insert(extractedBoq.map((item) => ({
        workspace_id: input.workspace_id,
        project_id: input.project_id,
        agreement_document_id: input.document_id,
        item_number: item.item_number || null,
        description: item.description || "Extracted BOQ item",
        unit: item.unit || "unit",
        quantity: Number(item.quantity || 0),
        rate: Number(item.rate || 0),
        amount: Number(item.amount || 0),
        technical_specification: item.technical_specification || null,
      })));
      if (boqError) throw boqError;
    }

    await supabase
      .from("agreement_documents")
      .update({ document_status: "extracted", ai_processing_status: "completed", ai_error_message: null, updated_at: new Date().toISOString() })
      .eq("id", input.document_id);

    return jsonResponse({ success: true, document_id: input.document_id, study: aiStudy });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (documentId) {
      await supabase
        .from("agreement_documents")
        .update({ document_status: "failed", ai_processing_status: "failed", ai_error_message: details, updated_at: new Date().toISOString() })
        .eq("id", documentId);
    }
    return jsonResponse({ error: "agreement study failed", details }, 500);
  }
});
