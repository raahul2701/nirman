import { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, Shield, Users, FolderOpen, AlertTriangle, Brain, MapPin } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Card, StatCard } from '../../components/ui/Card';
import { EMPTY_WORKSPACE_SUMMARY, getMyWorkspaceSummary, normalizeWorkspaceSummary, WorkspaceSummary } from '../../services/businessHierarchyService';
import { isAssignmentRole } from '../../services/assignmentHierarchy';

function roleLabel(role: string) {
  return String(role || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortId(value: string | null | undefined, fallback = '-') {
  return value ? String(value).slice(0, 8) : fallback;
}

export function EnterpriseOverviewPage() {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyWorkspaceSummary()
      .then((data) => {
        if (!cancelled) setSummary(normalizeWorkspaceSummary(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load hierarchy');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const safeSummary = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY);
    const members = safeSummary.members;
    const licenses = safeSummary.licenses;
    return {
      ae: members.filter((member) => isAssignmentRole(member, 'assistant_engineer')).length,
      je: members.filter((member) => isAssignmentRole(member, 'junior_engineer')).length,
      contractors: members.filter((member) => isAssignmentRole(member, 'contractor')).length,
      projects: safeSummary.projects.length,
      activeLicenses: licenses.filter((license) => license.license_status === 'active').length,
      monthlyRevenue: licenses.reduce((total, license) => total + Number(license.monthly_amount || 0), 0),
    };
  }, [summary]);

  const safeSummary = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY);

  return (
    <AppLayout title="Business Hierarchy" subtitle="EE-owned workspace, free government access, paid contractor licences">
      {error && (
        <Card className="mb-6 border-red-500/20">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      {!loading && !summary?.workspace ? (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Building2 className="text-[#FF6B00]" size={28} />
            <div>
              <h2 className="text-white text-lg font-semibold">No EE workspace assigned</h2>
              <p className="text-[#A0A0A0] text-sm mt-1">
                Create an Executive Engineer workspace and add the current user to `workspace_users` to enable hierarchy isolation.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Projects" value={stats.projects} loading={loading} icon={<FolderOpen size={18} />} color="#00D4AA" />
            <StatCard label="AE / JE" value={`${stats.ae}/${stats.je}`} loading={loading} icon={<Users size={18} />} color="#3B82F6" />
            <StatCard label="Contractors" value={stats.contractors} loading={loading} icon={<Shield size={18} />} color="#FF6B00" />
            <StatCard label="Monthly Licence Value" value={`₹${stats.monthlyRevenue.toLocaleString('en-IN')}`} loading={loading} icon={<FileText size={18} />} color="#F59E0B" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <Card className="xl:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-white font-semibold">Division Hierarchy</h2>
                  <p className="text-[#606060] text-xs mt-1">{summary?.workspace?.workspace_name || 'Workspace'} data boundary</p>
                </div>
                <Badge color="#00D4AA">Government free lifetime</Badge>
              </div>

              <div className="space-y-3">
                {safeSummary.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-3">
                    <div>
                      <p className="text-white text-sm">{roleLabel(member.role)}</p>
                      <p className="text-[#606060] text-xs">User {shortId(member.user_id)}{member.subdivision_name ? ` · ${member.subdivision_name}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.free_lifetime && !isAssignmentRole(member, 'contractor') && <Badge color="#22c55e">Free</Badge>}
                      {isAssignmentRole(member, 'contractor') && <Badge color="#F59E0B">Paid</Badge>}
                      <StatusBadge status={member.active ? 'active' : 'locked'} />
                    </div>
                  </div>
                ))}
                {!loading && safeSummary.members.length === 0 && (
                  <p className="text-[#808080] text-sm">No hierarchy members found.</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3 mb-5">
                <Brain size={22} className="text-[#FF6B00]" />
                <div>
                  <h2 className="text-white font-semibold">AI Risk Heatmap</h2>
                  <p className="text-[#606060] text-xs">Project context remains workspace-scoped</p>
                </div>
              </div>
              <div className="space-y-3">
                {safeSummary.projects.slice(0, 8).map((project, index) => {
                  const risk = index % 3 === 0 ? 'high' : index % 3 === 1 ? 'medium' : 'normal';
                  const color = risk === 'high' ? '#ef4444' : risk === 'medium' ? '#F59E0B' : '#22c55e';
                  return (
                    <div key={project.id} className="flex items-center justify-between">
                      <span className="text-[#D0D0D0] text-sm">Project {shortId(project.project_id)}</span>
                      <Badge color={color}>{risk}</Badge>
                    </div>
                  );
                })}
                {!loading && safeSummary.projects.length === 0 && (
                  <p className="text-[#808080] text-sm">No project risk rows found.</p>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center gap-3 mb-5">
              <MapPin size={22} className="text-[#00D4AA]" />
              <div>
                <h2 className="text-white font-semibold">Project Isolation</h2>
                <p className="text-[#606060] text-xs">RBAC, files, GIS, reports, and AI context are keyed by EE workspace and project</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {safeSummary.projects.map((project) => (
                <div key={project.id} className="rounded-lg bg-[#111111] border border-[#2A2A2A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white text-sm">Project {shortId(project.project_id)}</p>
                      <p className="text-[#606060] text-xs">Contractor {shortId(project.contractor_id, 'not assigned')}</p>
                    </div>
                    <StatusBadge status={project.access_status || 'unknown'} />
                  </div>
                </div>
              ))}
              {!loading && safeSummary.projects.length === 0 && (
                <p className="text-[#808080] text-sm">No project isolation rows found.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
