import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface LabourPaymentRecord {
  id: string;
  worker_id: string | null;
  payment_amount: number;
  payment_status: string;
  payment_date: string;
  payment_mode: string;
}

export interface LabourAdvanceRecord {
  id: string;
  worker_id: string | null;
  advance_amount: number;
  status: string;
  advance_date: string;
}

export interface LabourSettlementRecord {
  id: string;
  worker_id: string | null;
  settlement_amount: number;
  settlement_status: string;
  settlement_date: string;
}

export function useLabourPayments() {
  const [payments, setPayments] = useState<LabourPaymentRecord[]>([]);
  const [advances, setAdvances] = useState<LabourAdvanceRecord[]>([]);
  const [settlements, setSettlements] = useState<LabourSettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [{ data: paymentData }, { data: advanceData }, { data: settlementData }] = await Promise.all([
        supabase.from('labour_payments').select('*').order('payment_date', { ascending: false }).limit(40),
        supabase.from('labour_advances').select('*').order('advance_date', { ascending: false }).limit(40),
        supabase.from('labour_settlements').select('*').order('settlement_date', { ascending: false }).limit(40),
      ]);
      if (!mounted) return;
      setPayments((paymentData ?? []) as LabourPaymentRecord[]);
      setAdvances((advanceData ?? []) as LabourAdvanceRecord[]);
      setSettlements((settlementData ?? []) as LabourSettlementRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const pendingDue = payments.filter((p) => p.payment_status !== 'paid').length;
  return { payments, advances, settlements, pendingDue, loading };
}
