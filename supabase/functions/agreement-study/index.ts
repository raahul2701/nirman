import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type StudyRequest = {
  workspace_id: string;
  project_id: string;
  file_name: string;
  file_url?: string;
  storage_path?: string;
  mime_type?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input = await req.json() as StudyRequest;
    if (!input.workspace_id || !input.project_id || !input.file_name) {
      return new Response(JSON.stringify({ error: "workspace_id, project_id and file_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: document, error: documentError } = await supabase
      .from("agreement_documents")
      .insert({
        workspace_id: input.workspace_id,
        project_id: input.project_id,
        file_name: input.file_name,
        file_url: input.file_url || null,
        storage_path: input.storage_path || null,
        mime_type: input.mime_type || null,
        document_status: "processing",
      })
      .select()
      .single();

    if (documentError) throw documentError;

    const study = {
      extracted_boq: [
        { item_number: "AI-001", description: "Agreement BOQ extraction pending document parser", quantity: 0, rate: 0, amount: 0 },
      ],
      technical_specifications: [],
      milestones: ["AI parser queued", "Department verification required"],
      bg_terms: {},
      sd_terms: {},
      dlp_terms: {},
      payment_terms: {},
      completion_schedule: {},
      important_clauses: [
        "AI output is advisory and must be verified by EE/department before approval or billing use.",
      ],
      confidence_score: 0,
    };

    const { data: aiStudy, error: studyError } = await supabase
      .from("ai_project_study")
      .insert({
        workspace_id: input.workspace_id,
        project_id: input.project_id,
        agreement_document_id: document.id,
        ...study,
      })
      .select()
      .single();

    if (studyError) throw studyError;

    await supabase
      .from("agreement_documents")
      .update({ document_status: "extracted" })
      .eq("id", document.id);

    return new Response(JSON.stringify({ success: true, document, study: aiStudy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "agreement study failed", details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
