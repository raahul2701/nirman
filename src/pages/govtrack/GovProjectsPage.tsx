import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Plus, Search, Landmark, MapPin, Calendar,
  IndianRupee, ChevronRight, X, Building2, User
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { useToast } from '../../components/ui/useToast';
import { GovProject } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { featureFlags } from '../../lib/featureFlags';
import { loadAssignedGovProjects } from '../../services/assignedProjectsService';
import { resolveActiveWorkspaceForWrite } from '../../services/businessHierarchyService';
import { GOV_PROJECT_IDENTITY_BLOCKED_MESSAGE, resolveGovProjectEngineerIdentity } from '../../services/govProjectIdentity';

const projectTypes = [
  { value: 'highway', label: 'Highway' },
  { value: 'building', label: 'Building' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'dam', label: 'Dam' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'railway', label: 'Railway' },
  { value: 'other', label: 'Other' },
];

const departments = [
  { value: 'PWD', label: 'Public Works Department' },
  { value: 'NHAI', label: 'NHAI' },
  { value: 'CPWD', label: 'CPWD' },
  { value: 'MES', label: 'Military Engineer Services' },
  { value: 'IRRIGATION', label: 'Irrigation Department' },
  { value: 'RAILWAYS', label: 'Indian Railways' },
  { value: 'OTHER', label: 'Other' },
];

const typeColors: Record<string, string> = {
  highway: '#FF6B00', building: '#3B82F6', bridge: '#8B5CF6',
  dam: '#0891B2', irrigation: '#00D4AA', railway: '#F59E0B', other: '#6B7280',
};


export function GovProjectsPage() {
  const { user, session, loading: authLoading, profile, profileLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<GovProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sessionReady = !authLoading && !profileLoading && Boolean(session && user && profile);
  const secureSessionMessage = authLoading || profileLoading ? 'Restoring your secure session...' : !session ? 'Your session has expired. Please sign in again.' : null;
  const [form, setForm] = useState({
    project_name: '', project_code: '', department: 'PWD',
    contractor_name: '', total_contract_value: '', start_date: '',
    end_date: '', location: '', project_type: 'highway',
  });

  const loadProjects = useCallback(async () => {
    if (authLoading || !session || !user) return;
    const data = await loadAssignedGovProjects(user.id);
    setProjects(data);
    setLoading(false);
  }, [authLoading, session, user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function createProject() {
    if (!form.project_name || !form.project_code || !form.department || !form.contractor_name || !form.total_contract_value || !form.start_date || !form.end_date) {
      toast('Project name, code, department, contractor, value, start date, and end date are required', 'warning'); return;
    }
    if (authLoading || profileLoading) {
      toast('Restoring your secure session...', 'warning'); return;
    }
    if (!session || !user) {
      toast('Your session has expired. Please sign in again.', 'warning'); return;
    }

    setSubmitting(true);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const activeSession = sessionData.session;
    const activeUserId = activeSession?.user.id;

    if (import.meta.env.DEV) {
      console.info('[govtrack] create project auth check', {
        sessionPresent: Boolean(activeSession),
        contextUserMatchesSession: Boolean(activeUserId && user.id === activeUserId),
        engineerIdMatchesSession: Boolean(activeUserId && user.id === activeUserId),
        requestStage: 'session_validation',
      });
    }

    if (sessionError || !activeSession || !activeUserId) {
      setSubmitting(false);
      toast('Your session has expired. Please sign in again.', 'error');
      return;
    }

    if (activeUserId !== user.id) {
      setSubmitting(false);
      toast('Secure session mismatch detected. Please sign in again.', 'error');
      return;
    }

    let engineerIdentity;
    try {
      engineerIdentity = await resolveGovProjectEngineerIdentity(activeUserId);
    } catch (identityError) {
      setSubmitting(false);
      toast(identityError instanceof Error ? identityError.message : 'Government project identity lookup failed.', 'error');
      return;
    }

    if (!engineerIdentity.engineerId || !engineerIdentity.compatibleWithAuthRls) {
      setSubmitting(false);
      toast(engineerIdentity.reason || GOV_PROJECT_IDENTITY_BLOCKED_MESSAGE, 'error');
      return;
    }

    const code = form.project_code.toUpperCase();
    const projectId = crypto.randomUUID();
    const payload = {
      id: projectId,
      project_name: form.project_name,
      project_code: code,
      department: form.department,
      contractor_name: form.contractor_name,
      engineer_id: engineerIdentity.engineerId,
      total_contract_value: parseFloat(form.total_contract_value) || 0,
      start_date: form.start_date,
      end_date: form.end_date,
      location: form.location,
      project_type: form.project_type,
      status: 'active',
    };
    const projectStage = 'project_insert';
    const { error } = await supabase.from('gov_projects').insert(payload);

    if (error) {
      setSubmitting(false);
      const duplicateCode = error.code === '23505' || /duplicate|unique/i.test(error.message || '');
      if (import.meta.env.DEV) console.warn('[govtrack] create project failed', { requestStage: projectStage, code: error.code, message: error.message });
      toast(duplicateCode ? `Project code ${code} is already in use` : `Project creation failed (${projectStage}): ${error.message || 'Unknown error'}`, 'error');
      return;
    }

    let activeWorkspace;
    try {
      activeWorkspace = await resolveActiveWorkspaceForWrite();
    } catch (workspaceError) {
      setSubmitting(false);
      toast(workspaceError instanceof Error ? workspaceError.message : `Project created, but no active workspace was found. Project ID: ${projectId}`, 'error');
      navigate(`/enterprise/assign-project?projectId=${projectId}&projectTable=gov_projects`);
      return;
    }
    const workspaceId = activeWorkspace.workspace.id;
    if (workspaceId) {
      const assignmentPayload = {
        workspace_id: workspaceId,
        project_id: projectId,
        project_table: 'gov_projects',
        executive_engineer_id: activeUserId,
        access_status: 'active',
      };
      const existingAssignment = await supabase
        .from('project_assignments')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('project_id', projectId)
        .eq('project_table', 'gov_projects')
        .maybeSingle();

      if (existingAssignment.error) {
        setSubmitting(false);
        toast(`Project created, but assignment lookup failed. Project ID: ${projectId}`, 'error');
        navigate(`/enterprise/assign-project?workspaceId=${workspaceId}&projectId=${projectId}&projectTable=gov_projects`);
        return;
      }

      const assignmentResult = existingAssignment.data?.id
        ? await supabase
          .from('project_assignments')
          .update(assignmentPayload)
          .eq('id', existingAssignment.data.id)
          .select()
          .maybeSingle()
        : await supabase
          .from('project_assignments')
          .insert(assignmentPayload)
          .select()
          .maybeSingle();

      if (assignmentResult.error) {
        setSubmitting(false);
        toast(`Project created, but workspace assignment failed. Project ID: ${projectId}`, 'error');
        navigate(`/enterprise/assign-project?workspaceId=${workspaceId}&projectId=${projectId}&projectTable=gov_projects`);
        return;
      }
    } else {
      setSubmitting(false);
      toast(`Project created, but no active workspace was found. Project ID: ${projectId}`, 'error');
      navigate(`/enterprise/assign-project?projectId=${projectId}&projectTable=gov_projects`);
      return;
    }

    setSubmitting(false);
    setProjects(prev => [{ ...payload, id: projectId, created_at: new Date().toISOString() } as GovProject, ...prev]);
    setShowForm(false);
    toast(`Project ${code} created!`, 'success');
  }

  const filtered = projects.filter(p => {
    const matchType = filterType === 'all' || p.project_type === filterType;
    const matchSearch = !search || p.project_name.toLowerCase().includes(search.toLowerCase()) || p.project_code.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <AppLayout title="GovTrack Projects — NIRMAN AI" subtitle="Government contract projects">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-[#404040] outline-none border border-[#2A2A2A] focus:border-[#00D4AA]/50" style={{ background: '#111111' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="rounded-xl px-3 py-2 text-sm text-white border border-[#2A2A2A] outline-none" style={{ background: '#111111' }}>
          <option value="all">All Types</option>
          {projectTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Project</Button>
        {featureFlags.pilotMode && (
          <Button variant="outline" icon={<FolderOpen size={14} />} onClick={() => navigate('/enterprise/assign-project')}>Assign Project</Button>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Landmark size={18} style={{ color: '#00D4AA' }} />
                <h2 className="text-white font-bold text-lg">New Government Project</h2>
              </div>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Project Name *" placeholder="NH-44 Four Lane Extension" value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} />
              </div>
              <Input label="Project Code *" placeholder="GP-2024-001" value={form.project_code} onChange={e => setForm(p => ({ ...p, project_code: e.target.value }))} />
              <Select label="Department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} options={departments} />
              <Input label="Contractor Name" placeholder="ABC Constructions Ltd." value={form.contractor_name} onChange={e => setForm(p => ({ ...p, contractor_name: e.target.value }))} icon={<User size={13} />} />
              <Input label="Contract Value (₹)" type="number" placeholder="50000000" value={form.total_contract_value} onChange={e => setForm(p => ({ ...p, total_contract_value: e.target.value }))} icon={<IndianRupee size={13} />} />
              <Select label="Project Type" value={form.project_type} onChange={e => setForm(p => ({ ...p, project_type: e.target.value }))} options={projectTypes} />
              <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} icon={<Calendar size={13} />} />
              <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} icon={<Calendar size={13} />} />
              <div className="col-span-2">
                <Input label="Location" placeholder="Nagpur, Maharashtra" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} icon={<MapPin size={13} />} />
              </div>
            </div>
            {secureSessionMessage && (
              <div className="mt-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-xs text-[#6B5A1E]">
                {secureSessionMessage}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} disabled={!sessionReady} onClick={createProject}>Create Project</Button>
            </div>
            {featureFlags.pilotMode && (
              <div className="mt-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-xs text-[#6B5A1E]">
                After creating the project, open Enterprise Assignment to map AE, JE, Contractor, and workspace ownership.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects list */}
      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Landmark size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No projects found</p>
          <p className="text-[#606060] text-sm mb-4">{search ? 'Try adjusting filters' : 'Create your first government project'}</p>
          {!search && <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Project</Button>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/govtrack/projects/${p.id}`)}
              className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:border-[#00D4AA]/20"
              style={{ background: '#1A1A1A', border: '1px solid #232323' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${typeColors[p.project_type || 'other'] || '#6B7280'}15`, border: `1px solid ${typeColors[p.project_type || 'other'] || '#6B7280'}25` }}>
                <Building2 size={18} style={{ color: typeColors[p.project_type || 'other'] || '#6B7280' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-semibold text-sm truncate">{p.project_name}</p>
                  <span className="text-[10px] font-mono text-[#606060] flex-shrink-0">{p.project_code}</span>
                </div>
                <div className="flex items-center gap-3 text-[#606060] text-[10px]">
                  <span>{p.department}</span>
                  <span>·</span>
                  <span>{p.contractor_name}</span>
                  {p.location && <><span>·</span><span className="flex items-center gap-0.5"><MapPin size={8} />{p.location}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-white text-sm font-bold">{formatCurrency(p.total_contract_value)}</p>
                  <p className="text-[#606060] text-[10px]">Contract Value</p>
                </div>
                <div className="w-24">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-[#606060]">Progress</span>
                    <span className="text-[9px] text-white font-semibold">Not available</span>
                  </div>
                </div>
                <Badge color={p.status === 'active' ? '#22c55e' : p.status === 'on_hold' ? '#F59E0B' : '#808080'}>
                  {p.status.replace('_', ' ')}
                </Badge>
                <ChevronRight size={14} className="text-[#404040]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
