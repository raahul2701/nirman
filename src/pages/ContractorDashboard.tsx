import {
  Activity,
  AlertTriangle,
  FileText,
  IndianRupee,
  Package,
  TrendingUp,
} from '../lib/icons';
import { StatCard } from '../components/ui/Card';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { DashboardSectionSkeleton } from '../components/dashboard/DashboardSectionSkeleton';
import { loadAssignedGovProjects } from '../services/assignedProjectsService';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

type ContractorProjectKpiRow = {
  total_contract_value?: number | null;
  progress_percent?: number | null;
  physical_progress_percentage?: number | null;
};

export function ContractorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalContractValue: 0,
    workCompletedPercent: 0,
    runningBills: 0,
    pendingApprovals: 0,
    materialPending: 0,
    todaysProgress: 0,
  });

  useEffect(() => {
    async function fetchKpis() {
      if (!user) {
        setLoading(false);
        return;
      }

      const projectRows = (await loadAssignedGovProjects(user.id)) as ContractorProjectKpiRow[];
      const totalValue = projectRows.reduce((sum, p) => sum + (p.total_contract_value || 0), 0);
      const avgProgress = projectRows.length > 0
          ? projectRows.reduce((sum, p) => sum + (p.physical_progress_percentage ?? p.progress_percent ?? 0), 0) / projectRows.length
          : 0;

      // Mocking some KPIs as the schema doesn't support them yet.
      setKpis({
        totalContractValue: totalValue,
        workCompletedPercent: Math.round(avgProgress),
        runningBills: projectRows.length,
        pendingApprovals: projectRows.length * 2,
        materialPending: projectRows.length + 1,
        todaysProgress: 0.1,
      });

      setLoading(false);
    }

    fetchKpis();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Contract Value" value={formatCurrency(kpis.totalContractValue)} icon={<IndianRupee size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Work Completed" value={`${kpis.workCompletedPercent}%`} icon={<TrendingUp size={18} />} color="#0B8B7D" loading={loading} />
        <StatCard label="Running Bills" value={kpis.runningBills} icon={<FileText size={18} />} color="#2F6B9A" loading={loading} />
        <StatCard label="Pending Approvals" value={kpis.pendingApprovals} icon={<AlertTriangle size={18} />} color="#B42318" loading={loading} />
        <StatCard label="Material Pending" value={kpis.materialPending} icon={<Package size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Today's Progress" value={`${kpis.todaysProgress}%`} icon={<Activity size={18} />} color="#005F56" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DashboardSectionSkeleton />
          <DashboardSectionSkeleton />
        </div>
        <div className="space-y-6">
          <DashboardSectionSkeleton />
          <DashboardSectionSkeleton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSectionSkeleton />
        <DashboardSectionSkeleton />
      </div>
    </div>
  );
}
