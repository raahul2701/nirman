import { supabase } from '../lib/supabase';

export type WorkflowTimelineEntry = {
  id: string;
  workflow_id: string;
  actor_id: string | null;
  action_type: string;
  remarks: string | null;
  created_at: string;
};

export async function getWorkflowTimeline(workflowId: string) {
  const { data, error } = await supabase
    .from('workflow_actions')
    .select('id,workflow_id,actor_id,action_type,remarks,created_at')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as WorkflowTimelineEntry[];
}
