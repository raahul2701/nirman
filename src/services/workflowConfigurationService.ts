import { supabase } from '../lib/supabase';
import type { Json } from '../types/database';

export type WorkflowDefinitionRow = {
  id: string;
  workflow_key: string;
  display_name: string;
  description: string | null;
  entity_type: string;
  is_active: boolean;
};

export type WorkflowStateRow = {
  id: string;
  workflow_definition_id: string;
  state_key: string;
  display_name: string;
  sequence: number;
  is_initial: boolean;
  is_terminal: boolean;
  metadata: Json | null;
};

export type WorkflowTransitionRow = {
  id: string;
  workflow_definition_id: string;
  from_state: string;
  to_state: string;
  allowed_role: string;
  allowed_action: string;
  requires_signature: boolean;
  requires_attachment: boolean;
  requires_remarks: boolean;
  metadata: Json | null;
};

export async function getWorkflowDefinitionByKey(workflowKey: string) {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('id,workflow_key,display_name,description,entity_type,is_active')
    .eq('workflow_key', workflowKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as WorkflowDefinitionRow | null;
}

export async function getWorkflowDefinitionById(workflowDefinitionId: string) {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('id,workflow_key,display_name,description,entity_type,is_active')
    .eq('id', workflowDefinitionId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as WorkflowDefinitionRow | null;
}

export async function getWorkflowStates(workflowDefinitionId: string) {
  const { data, error } = await supabase
    .from('workflow_states')
    .select('id,workflow_definition_id,state_key,display_name,sequence,is_initial,is_terminal,metadata')
    .eq('workflow_definition_id', workflowDefinitionId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data || []) as WorkflowStateRow[];
}

export async function getWorkflowTransitions(workflowDefinitionId: string) {
  const { data, error } = await supabase
    .from('workflow_transitions')
    .select('id,workflow_definition_id,from_state,to_state,allowed_role,allowed_action,requires_signature,requires_attachment,requires_remarks,metadata')
    .eq('workflow_definition_id', workflowDefinitionId)
    .order('from_state', { ascending: true });

  if (error) throw error;
  return (data || []) as WorkflowTransitionRow[];
}

export async function getConfiguredTransition(input: {
  workflowDefinitionId: string;
  fromState: string;
  actionType: string;
  actorRole: string;
}) {
  const transitions = await getWorkflowTransitions(input.workflowDefinitionId);
  return transitions.find((transition) => {
    const roleMatches = transition.allowed_role === 'any' || transition.allowed_role === input.actorRole;
    return transition.from_state === input.fromState && transition.allowed_action === input.actionType && roleMatches;
  }) || null;
}
