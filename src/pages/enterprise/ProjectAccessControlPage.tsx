import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LockKeyhole, Shield, UserCheck } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EMPTY_WORKSPACE_SUMMARY, getMyWorkspaceSummary, normalizeWorkspaceSummary, WorkspaceSummary } from '../../services/businessHierarchyService';

function shortId(value: string | null | undefined, fallback = '-') {
  return value ? String(value).slice(0, 8) : fallback;
}

export function ProjectAccessControlPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyWorkspaceSummary()
      .then((data) => {
        if (!cancelled) setSummary(normalizeWorkspaceSummary(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project access');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const safeSummary = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY);

  return (
    <AppLayout title="Project Access Control" subtitle="Project-level RBAC, licence locking, and document boundaries">
      {error && (
        <Card className="mb-6 border-red-500/20">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <Shield size={22} className="text-[#00D4AA]" />
            <div>
              <p className="text-white font-semibold">EE Boundary</p>
              <p className="text-[#808080] text-xs">Workspace ID {shortId(safeSummary.workspace?.id, 'not assigned')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <UserCheck size={22} className="text-[#3B82F6]" />
            <div>
              <p className="text-white font-semibold">Government Free</p>
              <p className="text-[#808080] text-xs">EE, AE, and JE users are not billed</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <LockKeyhole size={22} className="text-[#F59E0B]" />
            <div>
              <p className="text-white font-semibold">Contractor Locked</p>
              <p className="text-[#808080] text-xs">Expired licences can lock project access</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold">Project Assignments</h2>
            <p className="text-[#606060] text-xs">Contractors only see their assigned project rows; documents are filtered by workspace and project.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => navigate('/enterprise/start-pilot')}>Start New Pilot Assignment</Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/enterprise/assign-project')}>Create/Edit Project Assignment</Button>
            <Badge color="#FF6B00">RLS enforced</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#808080] border-b border-[#2A2A2A]">
                <th className="py-3 pr-4 font-medium">Project</th>
                <th className="py-3 pr-4 font-medium">AE</th>
                <th className="py-3 pr-4 font-medium">JE</th>
                <th className="py-3 pr-4 font-medium">Contractor</th>
                <th className="py-3 pr-4 font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              {safeSummary.projects.map((project) => (
                <tr key={project.id} className="border-b border-[#232323] text-[#D0D0D0]">
                  <td className="py-3 pr-4 text-white">{shortId(project.project_id)}</td>
                  <td className="py-3 pr-4">{shortId(project.assistant_engineer_id)}</td>
                  <td className="py-3 pr-4">{shortId(project.junior_engineer_id)}</td>
                  <td className="py-3 pr-4">{project.contractor_company_name || shortId(project.contractor_id)}</td>
                  <td className="py-3 pr-4"><StatusBadge status={project.access_status || 'unknown'} /></td>
                </tr>
              ))}
              {safeSummary.projects.length === 0 && (
                <tr>
                  <td className="py-6 text-[#808080]" colSpan={5}>No project assignments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
