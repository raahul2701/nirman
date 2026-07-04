import { loadAssignedDashboardProjects } from './dashboardService';
import type { DashboardProject } from './dashboard';

export interface ContractorKpis {
  totalContractValue: number;
  workCompletedPercent: number;
  runningBills: number | string;
  pendingApprovals: number | string;
  materialPending: number | string;
  todaysProgress: number | string;
}

/**
 * Fetches all data required for the Contractor Dashboard.
 * This service layer abstracts the data fetching logic from the UI component.
 * Currently, it uses the old schema (`gov_projects.contractor_id`).
 * In Milestone 2, this will be updated to use the new `project_contracts` schema
 * without requiring any changes to the `ContractorDashboard.tsx` component.
 */
export async function getContractorDashboardData(userId: string): Promise<{ projects: DashboardProject[], kpis: ContractorKpis }> {
  if (!userId) {
    return { projects: [], kpis: getEmptyKpis() };
  }

  // This service currently uses a generic project loader.
  // It will be made more specific as the data model evolves.
  const projects = await loadAssignedDashboardProjects('contractor', { userId });

  const totalValue = projects.reduce((sum, p) => sum + p.budget, 0);
  const avgProgress = projects.length > 0
    ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
    : 0;

  const kpis: ContractorKpis = {
    totalContractValue: totalValue,
    workCompletedPercent: Math.round(avgProgress),
    // These KPIs are not yet supported by the schema.
    // Displaying a placeholder instead of fake numbers.
    runningBills: '--',
    pendingApprovals: '--',
    materialPending: '--',
    todaysProgress: '--',
  };

  return { projects, kpis };
}

function getEmptyKpis(): ContractorKpis {
  return {
    totalContractValue: 0,
    workCompletedPercent: 0,
    runningBills: 0,
    pendingApprovals: 0,
    materialPending: 0,
    todaysProgress: 0,
  };
}
