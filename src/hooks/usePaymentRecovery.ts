import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PaymentFollowupRecord {
  id: string;
  project_id: string;
  department: string;
  last_followup_date: string;
  next_followup_date: string | null;
  escalation_level: string;
}

export interface DepartmentVisitRecord {
  id: string;
  followup_id: string;
  visit_type: string;
  visit_date: string;
}

export function usePaymentRecovery() {
  const [followups, setFollowups] = useState<PaymentFollowupRecord[]>([]);
  const [visits, setVisits] = useState<DepartmentVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: followupData }, { data: visitData }] = await Promise.all([
        supabase.from('payment_followups').select('*').order('last_followup_date', { ascending: false }).limit(40),
        supabase.from('department_visits').select('*').order('visit_date', { ascending: false }).limit(40),
      ]);
      if (!mounted) return;
      setFollowups((followupData ?? []) as PaymentFollowupRecord[]);
      setVisits((visitData ?? []) as DepartmentVisitRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const overdueFollowups = followups.filter((item) => item.next_followup_date && new Date(item.next_followup_date) < new Date()).length;

  return { followups, visits, overdueFollowups, loading };
}
