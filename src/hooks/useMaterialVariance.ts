import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MaterialReconciliationRecord {
  id: string;
  site_id: string | null;
  project_id: string;
  material_name: string;
  material_received: number;
  material_used: number;
  theoretical_required: number;
  actual_consumption: number;
  variance_percent: number;
  possible_theft: boolean;
  possible_wastage: boolean;
  status: string;
  report_date: string;
}

export interface WastageAlertRecord {
  id: string;
  project_id: string;
  material_name: string;
  alert_type: string;
  variance_percent: number;
  estimated_loss: number;
  ai_reason: string | null;
  resolved: boolean;
}

export function useMaterialVariance() {
  const [reconciliations, setReconciliations] = useState<MaterialReconciliationRecord[]>([]);
  const [alerts, setAlerts] = useState<WastageAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: recData }, { data: alertsData }] = await Promise.all([
        supabase.from('material_reconciliation').select('*').order('report_date', { ascending: false }).limit(30),
        supabase.from('wastage_alerts').select('*').order('created_at', { ascending: false }).limit(30),
      ]);
      if (!mounted) return;
      setReconciliations((recData ?? []) as MaterialReconciliationRecord[]);
      setAlerts((alertsData ?? []) as WastageAlertRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const totalVariance = reconciliations.reduce((sum, item) => sum + Number(item.variance_percent || 0), 0);
  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;

  return { reconciliations, alerts, totalVariance, activeAlerts, loading };
}
