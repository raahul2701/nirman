import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const { data: projects, error: projectsError } = await supabase
      .from('gov_projects')
      .select('id, project_name, total_contract_value, progress_percent')
      .eq('status', 'active');

    if (projectsError) throw projectsError;

    const projectIds = (projects || []).map((project) => project.id);
    const { data: assignments, error: assignmentsError } = projectIds.length
      ? await supabase
        .from('project_assignments')
        .select('project_id, executive_engineer_id, assistant_engineer_id, junior_engineer_id')
        .eq('project_table', 'gov_projects')
        .in('access_status', ['active', 'pilot'])
        .in('project_id', projectIds)
      : { data: [], error: null };

    if (assignmentsError) throw assignmentsError;

    const assignmentByProjectId = new Map(
      (assignments || []).map((assignment) => [assignment.project_id, assignment]),
    );

    const alerts: Array<Record<string, unknown>> = [];
    const snapshots: Array<Record<string, unknown>> = [];

    for (const project of projects || []) {
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('budget_progress_snapshots')
        .select('*')
        .eq('project_id', project.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (snapshotError && snapshotError.code !== 'PGRST116') throw snapshotError;
      const financialProgress = snapshotData?.financial_progress_percent ?? 0;
      const physicalProgress = project.progress_percent ?? 0;
      const gap = Number(financialProgress) - Number(physicalProgress);
      const riskFlag = gap > 15;

      snapshots.push({
        project_id: project.id,
        snapshot_date: new Date().toISOString().split('T')[0],
        total_contract_value: project.total_contract_value,
        total_paid_amount: snapshotData?.total_paid_amount ?? 0,
        financial_progress_percent: financialProgress,
        physical_progress_percent: physicalProgress,
        gap_percentage: gap,
        gap_alert_sent: riskFlag,
        ai_analysis: `Calculated gap of ${gap.toFixed(2)} points between financial and physical progress.`,
        risk_flag: riskFlag,
        created_at: new Date().toISOString(),
      });

      if (riskFlag) {
        const assignment = assignmentByProjectId.get(project.id);
        alerts.push({
          user_id: assignment?.assistant_engineer_id || assignment?.junior_engineer_id || assignment?.executive_engineer_id || null,
          title: `Budget Gap Alert: ${project.project_name}`,
          message: `The project has a budget gap of ${gap.toFixed(2)}% between financial and physical progress.`,
          type: 'warning',
          category: 'budget_gap',
          read: false,
          action_url: `/budget-progress`,
          created_at: new Date().toISOString(),
        });

        await supabase.from('gov_projects').update({ risk_flag: true }).eq('id', project.id);
      }
    }

    if (snapshots.length > 0) {
      await supabase.from('budget_progress_snapshots').insert(snapshots);
    }

    if (alerts.length > 0) {
      await supabase.from('notifications').insert(alerts.filter((alert) => alert.user_id));
    }

    return new Response(JSON.stringify({ success: true, snapshots_created: snapshots.length, alerts_created: alerts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
