import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: bgRecords, error } = await supabase
      .from('bank_guarantees')
      .select(`id, project_id, contractor_id, bg_number, expiry_date, alert_30_days_sent, alert_7_days_sent, alert_expired_sent`)
      .in('status', ['active', 'expired'])
      .order('expiry_date', { ascending: true });

    if (error) throw error;

    const notifications = [];
    const updates: Array<{ id: string; alert_30_days_sent?: boolean; alert_7_days_sent?: boolean; alert_expired_sent?: boolean }> = [];

    for (const record of bgRecords || []) {
      if (!record.expiry_date) continue;
      const daysToExpiry = Math.ceil((new Date(record.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      let type: string | null = null;
      let message = '';

      if (daysToExpiry <= 0 && !record.alert_expired_sent) {
        type = 'expired';
        message = `Bank Guarantee ${record.bg_number} has expired and payment release must be blocked.`;
        updates.push({ id: record.id, alert_expired_sent: true });
      } else if (daysToExpiry <= 7 && !record.alert_7_days_sent) {
        type = '7-day';
        message = `Bank Guarantee ${record.bg_number} expires in ${daysToExpiry} days.`;
        updates.push({ id: record.id, alert_7_days_sent: true });
      } else if (daysToExpiry <= 30 && !record.alert_30_days_sent) {
        type = '30-day';
        message = `Bank Guarantee ${record.bg_number} expires in ${daysToExpiry} days.`;
        updates.push({ id: record.id, alert_30_days_sent: true });
      }

      if (type) {
        notifications.push({
          user_id: record.contractor_id ?? null,
          title: `BG Alert: ${record.bg_number}`,
          message,
          type: daysToExpiry <= 0 ? 'critical' : 'warning',
          category: 'bank_guarantee',
          read: false,
          action_url: `/bank-guarantees`,
          created_at: new Date().toISOString(),
        });
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications.filter((item) => item.user_id !== null));
    }

    for (const update of updates) {
      await supabase.from('bank_guarantees').update(update).eq('id', update.id);
      if (update.alert_expired_sent) {
        await supabase.from('gov_projects').update({ risk_flag: true }).eq('id', bgRecords?.find((record) => record.id === update.id)?.project_id);
      }
    }

    return new Response(JSON.stringify({ success: true, alerts_sent: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
