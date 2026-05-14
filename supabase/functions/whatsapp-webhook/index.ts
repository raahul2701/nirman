import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createSupabaseClient();
    const lower = message.trim().toLowerCase();
    const parsed: Record<string, unknown> = { raw: message };
    let actionTaken = 'none';
    let reportId: string | null = null;
    let responseText = 'Unable to parse message. Use the format: report <site> <mistri> <labour> <jcb> <casting>';

    if (lower.startsWith('report')) {
      const tokens = lower.split(/\s+/);
      if (tokens.length >= 6) {
        const siteName = tokens[1];
        const mistri = Number(tokens[2]);
        const labour = Number(tokens[3]);
        const jcb = Number(tokens[4]);
        const casting = Number(tokens[5]);
        const totalWorkers = (Number.isFinite(mistri) ? mistri : 0) + (Number.isFinite(labour) ? labour : 0);

        const { data: siteData } = await supabase.from('sites').select('id, project_id').ilike('name', `%${siteName}%`).limit(1).single();
        const siteId = siteData?.id || null;
        const projectId = siteData?.project_id || null;

        const reportData = {
          project_id: projectId,
          site_id: siteId,
          report_date: new Date().toISOString().split('T')[0],
          supervisor_name: 'WhatsApp Bot',
          labor_count: labour,
          equipment_count: jcb,
          work_description: `Daily report for ${siteName} with casting ${casting}`,
          materials_used: `Casting volume ${casting}`,
          issues_faced: 'No issues reported',
          weather_conditions: 'Not specified',
          total_workers: totalWorkers,
          report_data: { mistri, labour, jcb, casting, site: siteName },
          created_at: new Date().toISOString(),
        };

        const { data: created, error: createError } = await supabase.from('daily_reports').insert([reportData]).select().single();
        if (createError) throw createError;
        reportId = created.id;
        parsed.report_id = reportId;
        parsed.site_name = siteName;
        parsed.mistri = mistri;
        parsed.labour = labour;
        parsed.jcb = jcb;
        parsed.casting = casting;
        actionTaken = 'report_saved';
        responseText = '✅ Report saved.';
      }
    }

    await supabase.from('whatsapp_messages').insert([{ phone, message_in: message, message_out: responseText, parsed_data: parsed, action_taken: actionTaken, report_created_id: reportId, status: 'processed', received_at: new Date().toISOString() }]);

    return new Response(JSON.stringify({ success: true, message: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
