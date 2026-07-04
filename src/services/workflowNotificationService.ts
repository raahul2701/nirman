import { supabase } from '../lib/supabase';
import type { Json } from '../types/database';

export type DispatchWorkflowNotificationInput = {
  workflowId: string;
  recipientId: string;
  channel?: 'in_app' | 'email' | 'sms' | 'whatsapp' | null;
  subject?: string | null;
  body: string;
  status?: 'pending' | 'sent' | 'failed' | null;
  metadata?: Json | null;
};

export async function dispatchWorkflowNotification(input: DispatchWorkflowNotificationInput) {
  const { data, error } = await supabase
    .from('workflow_notifications')
    .insert({
      workflow_id: input.workflowId,
      recipient_id: input.recipientId,
      channel: input.channel ?? 'in_app',
      subject: input.subject ?? null,
      body: input.body,
      status: input.status ?? 'pending',
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
