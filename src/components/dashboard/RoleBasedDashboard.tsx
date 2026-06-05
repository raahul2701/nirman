import { AlertTriangle, ClipboardCheck, FileText, FolderOpen, IndianRupee, Package, Users } from '../../lib/icons';
import { Card, StatCard } from '../ui/Card';
import { executionProjects, getDashboardRole, materialAdvanceDemo } from '../../services/executionDemoData';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-[#EFE8D4]">
      <div className="h-2 rounded-full bg-[#005F56]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof executionProjects)[number] }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C7568]">{project.code}</p>
          <h3 className="mt-1 text-sm font-bold text-[#12332D]">{project.name}</h3>
          <p className="mt-1 text-xs text-[#6C7568]">{project.ae} / {project.je}</p>
        </div>
        <span className="rounded-md bg-[#005F56]/10 px-2 py-1 text-xs font-bold text-[#005F56]">{project.progress}%</span>
      </div>
      <div className="mt-4 space-y-3">
        {project.components.map((component) => (
          <div key={`${project.id}-${component.name}`}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[#12332D]">{component.name}</span>
              <span className="text-[#6C7568]">{component.progress}%</span>
            </div>
            <ProgressBar value={component.progress} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function RoleBasedDashboard({ role }: { role?: string | null }) {
  const dashboardRole = getDashboardRole(role);
  const assignedProjects = dashboardRole === 'assistant_engineer'
    ? executionProjects.filter((project) => project.ae === 'Er. Nidhi Singh')
    : dashboardRole === 'junior_engineer'
      ? executionProjects.slice(0, 1)
      : dashboardRole === 'contractor'
        ? executionProjects.filter((project) => project.contractor === 'Mithila Infra Pvt Ltd')
        : executionProjects;

  if (dashboardRole === 'contractor') {
    const totalSubmitted = materialAdvanceDemo.reduce((sum, item) => sum + item.submittedValue, 0);
    const possibleBilling = assignedProjects.reduce((sum, project) => sum + project.budget * (project.progress / 100), 0);
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Assigned Projects" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" />
          <StatCard label="Possible Billing" value={formatMoney(possibleBilling)} icon={<IndianRupee size={18} />} color="#C89B3C" />
          <StatCard label="Material Advance" value={formatMoney(totalSubmitted)} icon={<Package size={18} />} color="#0B8B7D" />
          <StatCard label="Pending Payment" value={formatMoney(420000)} icon={<ClipboardCheck size={18} />} color="#B42318" />
        </div>
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">Contractor Dashboard</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {assignedProjects.map((project) => (
              <div key={project.id} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4">
                <p className="text-sm font-bold text-[#12332D]">{project.name}</p>
                <p className="mt-1 text-xs text-[#6C7568]">Agreement summary, BOQ reading, executed and remaining quantities linked.</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <span>Executed: {project.progress}%</span>
                  <span>RA bill: under review</span>
                  <span>Milestone: WMM</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (dashboardRole === 'junior_engineer') {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Daily Progress" value="86%" icon={<ClipboardCheck size={18} />} color="#005F56" />
          <StatCard label="Labour" value="42" icon={<Users size={18} />} color="#0B8B7D" />
          <StatCard label="Materials" value="5" icon={<Package size={18} />} color="#C89B3C" />
          <StatCard label="Issues" value="3" icon={<AlertTriangle size={18} />} color="#B42318" />
        </div>
        <Card>
          <h3 className="text-sm font-bold text-[#12332D]">JE Field Dashboard</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Site photos', 'Measurements', 'Inspection entries', 'Equipment log'].map((item) => (
              <div key={item} className="rounded-lg border border-[#EFE8D4] bg-[#F9F7EF] p-4 text-sm font-semibold text-[#12332D]">{item}</div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (dashboardRole === 'assistant_engineer') {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard label="Assigned Projects" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" />
          <StatCard label="JE Submissions" value="18" icon={<FileText size={18} />} color="#0B8B7D" />
          <StatCard label="Contractor Submissions" value="7" icon={<ClipboardCheck size={18} />} color="#C89B3C" />
          <StatCard label="Pending Inspections" value="3" icon={<AlertTriangle size={18} />} color="#B42318" />
          <StatCard label="Progress Issues" value="4" icon={<AlertTriangle size={18} />} color="#2F6B9A" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{assignedProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Workspace Projects" value={assignedProjects.length} icon={<FolderOpen size={18} />} color="#005F56" />
        <StatCard label="Open Issues" value={assignedProjects.reduce((sum, project) => sum + project.issues, 0)} icon={<AlertTriangle size={18} />} color="#B42318" />
        <StatCard label="Pending Inspections" value={assignedProjects.reduce((sum, project) => sum + project.pendingInspections, 0)} icon={<ClipboardCheck size={18} />} color="#C89B3C" />
        <StatCard label="Budget Under Command" value={formatMoney(assignedProjects.reduce((sum, project) => sum + project.budget, 0))} icon={<IndianRupee size={18} />} color="#0B8B7D" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{assignedProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
    </div>
  );
}
