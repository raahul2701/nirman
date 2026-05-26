import { supabase } from '../../lib/supabase';

export interface WhatsAppCommandPayload {
  command: string;
  senderPhone: string;
  projectId?: string;
  siteId?: string;
}

export interface WhatsAppCommandResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export async function sendWhatsAppCommand(payload: WhatsAppCommandPayload): Promise<WhatsAppCommandResponse> {
  const { data, error } = await supabase.functions.invoke<WhatsAppCommandResponse>('whatsapp-command', {
    body: payload,
  });
  if (error) {
    throw error;
  }
  return data as WhatsAppCommandResponse;
}

export function formatWhatsAppRequest(command: string, senderPhone: string, projectId?: string, siteId?: string): WhatsAppCommandPayload {
  return { command, senderPhone, projectId, siteId };
}
