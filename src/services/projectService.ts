import { supabase } from '../lib/supabase';
import type { BudgetProgressSnapshot, WeatherLog, DailyReport } from '../types';

export async function fetchBudgetSnapshots(projectId: string) {
  const { data, error } = await supabase
    .from('budget_progress_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false });

  if (error) throw error;
  return (data as BudgetProgressSnapshot[]) || [];
}

export async function fetchWeatherLogs(projectId: string) {
  const { data, error } = await supabase
    .from('weather_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (data as WeatherLog[]) || [];
}

export async function fetchDailyReports(projectId: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('project_id', projectId)
    .order('report_date', { ascending: false });

  if (error) throw error;
  return (data as DailyReport[]) || [];
}

export async function fetchDisputes(projectId: string) {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchHindrances(projectId: string) {
  const { data, error } = await supabase
    .from('hindrance_register')
    .select('*')
    .eq('project_id', projectId)
    .order('hindrance_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchBankGuarantees(projectId: string) {
  const { data, error } = await supabase
    .from('bank_guarantees')
    .select('*')
    .eq('project_id', projectId)
    .order('expiry_date', { ascending: true });

  if (error) throw error;
  return data || [];
}
