import { supabase } from '../../lib/supabase';
import { loadAssignedDashboardProjects } from './dashboardService';
import type { DashboardProject } from './dashboard';

export interface ContractorKpis {
  totalContractValue: number;
  workCompletedPercent: number | string;
  runningBills: number | string;
  pendingApprovals: number | string;
  materialPending: number | string;
  todaysProgress: number | string;
}

export type ContractorDashboardResult = {
  projects: DashboardProject[];
  kpis: ContractorKpis;
  warnings: string[];
};

const UNAVAILABLE = 'Not available';

type SupabaseCountResult = {
  count: number | null;
  error: { message?: string | null } | null;
};

async function safeCount(label: string, query: PromiseLike<SupabaseCountResult>, warnings: string[]) {
  try {
    const result = await query;
    if (result.error) {
      warnings.push(`${label} unavailable: ${result.error.message || 'query failed'}`);
      return UNAVAILABLE;
    }
    return result.count ?? 0;
  } catch (error) {
    warnings.push(`${label} unavailable: ${error instanceof Error ? error.message : 'query failed'}`);
    return UNAVAILABLE;
  }
}

export async function getContractorDashboardData(userId: string): Promise<ContractorDashboardResult> {
  if (!userId) {
    return { projects: [], kpis: getEmptyKpis(), warnings: ['No authenticated user.'] };
  }

  const warnings: string[] = [];
  const projects = await loadAssignedDashboardProjects('contractor', { userId });
  const totalValue = projects.reduce((sum, project) => sum + project.budget, 0);
  const progressValues = projects.map((project) => project.progress).filter((value): value is number => value != null && Number.isFinite(value));
  const avgProgress = progressValues.length > 0
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : UNAVAILABLE;

  const govProjectIds = projects.filter((project) => project.projectTable === 'gov_projects').map((project) => project.id);
  const runningBills = govProjectIds.length > 0
    ? await safeCount(
      'Running bills',
      supabase
        .from('payment_requests')
        .select('id', { count: 'exact', head: true })
        .in('project_id', govProjectIds),
      warnings,
    )
    : UNAVAILABLE;
  const pendingApprovals = govProjectIds.length > 0
    ? await safeCount(
      'Pending approvals',
      supabase
        .from('payment_requests')
        .select('id', { count: 'exact', head: true })
        .in('project_id', govProjectIds)
        .is('final_status', null),
      warnings,
    )
    : UNAVAILABLE;

  return {
    projects,
    warnings,
    kpis: {
      totalContractValue: totalValue,
      workCompletedPercent: avgProgress,
      runningBills,
      pendingApprovals,
      materialPending: UNAVAILABLE,
      todaysProgress: UNAVAILABLE,
    },
  };
}

function getEmptyKpis(): ContractorKpis {
  return {
    totalContractValue: 0,
    workCompletedPercent: UNAVAILABLE,
    runningBills: UNAVAILABLE,
    pendingApprovals: UNAVAILABLE,
    materialPending: UNAVAILABLE,
    todaysProgress: UNAVAILABLE,
  };
}
