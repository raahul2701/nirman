import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface FraudMonitoringRecord {
  id: string;
  site_id: string | null;
  fraud_risk_score: number;
  estimated_losses: string;
  suspicious_patterns: string[];
  persons_involved: string[];
  created_at: string;
}

export function useFraudMonitoring() {
  const [records, setRecords] = useState<FraudMonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('fraud_monitoring').select('*').order('created_at', { ascending: false }).limit(30);
      if (!mounted) return;
      setRecords((data ?? []) as FraudMonitoringRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  return { records, loading };
}
