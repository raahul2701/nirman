import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

type StudyRequest = {
  document_id: string;
  workspace_id: string;
  project_id: string;
};

type ExtractedBoqItem = {
  item_number?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  rate?: number | string | null;
  amount?: number | string | null;
  technical_specification?: string | null;
};

type AgreementStudy = {
  extracted_boq?: ExtractedBoqItem[];
  technical_specifications?: unknown[];
  milestones?: unknown[];
  bg_terms?: Record<string, unknown>;
  sd_terms?: Record<string, unknown>;
  dlp_terms?: Record<string, unknown>;
  payment_terms?: Record<string, unknown>;
  completion_schedule?: Record<string, unknown>;
  important_clauses?: unknown[];
  confidence_score?: number | string | null;
};

type GeminiPart =
  | { text: string }
  | { file_data: { mime_type: string; file_uri: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: unknown }>;
    };
  }>;
  error?: { message?: string };
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_UPLOAD_ENDPOINT = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stripCodeFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractJson(text: string): AgreementStudy {
  const trimmed = stripCodeFence(text);
  try {
    return JSON.parse(trimmed) as AgreementStudy;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response parsing failed: no JSON object returned.");
    }

    try {
      return JSON.parse(match[0]) as AgreementStudy;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`AI response parsing failed: invalid JSON returned. ${details}`);
    }
  }
}

function extractGeminiText(response: GeminiResponse) {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error(`AI response parsing failed: Gemini response did not include candidates[0].content.parts. ${response.error?.message || ""}`.trim());
  }

  const text = parts.map((part) => typeof part.text === "string" ? part.text : "").join("\n").trim();
  if (!text) {
    throw new Error("AI response parsing failed: Gemini response did not include text content.");
  }
  return text;
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

async function buildGeminiStudyParts(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  mimeType: string | null | undefined,
  prompt: string,
  signal: AbortSignal,
): Promise<GeminiPart[]> {
  if (isTextDocument(path, mimeType)) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw new Error(`File not found or storage permission issue: ${error.message}`);
    if (!data) throw new Error("File not found: Supabase storage returned no file data.");

    const text = await data.text();
    if (!text.trim()) throw new Error("Parsing failed: uploaded document is empty.");
    return [{ text: prompt }, { text: text.slice(0, 28000) }];
  }

  if (isPdfDocument(path, mimeType)) {
    const name = path.split('/').pop() || path;
    const resolvedMimeType = resolveMimeType(path, mimeType);
    const fileUri = await uploadPdfToGemini(supabase, bucket, path, name, resolvedMimeType, signal);
    return [{ text: prompt }, { file_data: { mime_type: resolvedMimeType, file_uri: fileUri } }];
  }

  throw new Error("Unsupported file type/parser. AI Study currently supports PDF, CSV, and TXT. DOC/DOCX/XLS/XLSX need a production document parser before AI Study can read file contents.");
}

async function uploadPdfToGemini(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  name: string,
  mimeType: string,
  signal: AbortSignal,
) {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) throw new Error("Gemini API key is not configured on the server.");

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`File not found or storage permission issue: ${error.message}`);
  if (!data) throw new Error("File not found: Supabase storage returned no file data.");

  const bytes = new Uint8Array(await data.arrayBuffer());
  if (!bytes.length) throw new Error("Uploaded document is empty.");

  const initResponse = await fetch(`${GEMINI_UPLOAD_ENDPOINT}?key=${encodeURIComponent(geminiApiKey)}`, {
    method: "POST",
    signal,
    headers: {
      "x-goog-api-key": geminiApiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: name } }),
  });
  const initText = await initResponse.text().catch(() => "");
  if (!initResponse.ok) {
    throw new Error(`Gemini file upload init failed: ${initResponse.status} ${initText}`);
  }

  const uploadUrl = initResponse.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini file upload init did not return an upload URL.");

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    signal,
    headers: {
      "Content-Length": String(bytes.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });
  const uploadText = await uploadResponse.text().catch(() => "");
  if (!uploadResponse.ok) {
    throw new Error(`Gemini file upload failed: ${uploadResponse.status} ${uploadText}`);
  }

  const uploadJson = JSON.parse(uploadText) as { file?: { uri?: string } };
  const fileUri = uploadJson.file?.uri;
  if (!fileUri) throw new Error("Gemini file upload failed to return file_data.file_uri.");

  return fileUri;
}

async function runGeminiStudy(parts: GeminiPart[], signal: AbortSignal) {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) throw new Error("Gemini API key is not configured on the server.");

  const response = await fetch(`${GEMINI_API_BASE}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1800,
      },
    }),
  });
  const responseText = await response.text().catch(() => "");
  const responseJson = responseText ? JSON.parse(responseText) as GeminiResponse : {};
  if (!response.ok) {
    throw new Error(`Gemini generateContent failed: ${response.status} ${responseJson.error?.message || responseText}`);
  }

  return extractGeminiText(responseJson);
}

function normalizeBoqItems(items: unknown): ExtractedBoqItem[] {
  return asArray(items).map((item) => {
    const row = asObject(item);
    return {
      item_number: typeof row.item_number === "string" ? row.item_number : null,
      description: typeof row.description === "string" && row.description.trim() ? row.description : "Extracted BOQ item",
      unit: typeof row.unit === "string" && row.unit.trim() ? row.unit : "unit",
      quantity: toNumber(row.quantity),
      rate: toNumber(row.rate),
      amount: toNumber(row.amount),
      technical_specification: typeof row.technical_specification === "string" ? row.technical_specification : null,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "agreement study failed", details: "Supabase function environment is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let documentId: string | null = null;

  try {
    const input = await req.json() as StudyRequest;
    documentId = input.document_id;
    if (!input.document_id || !input.workspace_id || !input.project_id) {
      return jsonResponse({ error: "document_id, workspace_id and project_id are required" }, 400);
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

    const prompt = [
      "Extract an Indian public works agreement/BOQ into strict JSON.",
      "Return keys: extracted_boq, technical_specifications, milestones, bg_terms, sd_terms, dlp_terms, payment_terms, completion_schedule, important_clauses, confidence_score.",
      "extracted_boq must contain item_number, description, quantity, unit, rate, amount, technical_specification.",
      "AI is advisory only. Final approval is subject to EE/department verification.",
      "Read the attached document or pasted text and return only JSON.",
    ].join("\n\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("Gemini agreement study timeout"), 45000);
    const responseText = await (async () => {
      try {
        const parts = await buildGeminiStudyParts(supabase, "project-files", storagePath, document.mime_type, prompt, controller.signal);
        return await runGeminiStudy(parts, controller.signal);
      } finally {
        clearTimeout(timeout);
      }
    })();

    const study = extractJson(responseText);
    const extractedBoq = normalizeBoqItems(study.extracted_boq);

    const { data: aiStudy, error: studyError } = await supabase
      .from("ai_project_study")
      .insert({
        workspace_id: input.workspace_id,
        project_id: input.project_id,
        agreement_document_id: input.document_id,
        extracted_boq: extractedBoq,
        technical_specifications: asArray(study.technical_specifications),
        milestones: asArray(study.milestones),
        bg_terms: asObject(study.bg_terms),
        sd_terms: asObject(study.sd_terms),
        dlp_terms: asObject(study.dlp_terms),
        payment_terms: asObject(study.payment_terms),
        completion_schedule: asObject(study.completion_schedule),
        important_clauses: asArray(study.important_clauses),
        confidence_score: toNumber(study.confidence_score),
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
        quantity: toNumber(item.quantity),
        rate: toNumber(item.rate),
        amount: toNumber(item.amount),
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

