import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Plus, X, MapPin, DollarSign,
  TrendingUp
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { useToast } from '../components/ui/useToast';
import type { DashboardProject } from '../components/dashboard/dashboard';
import { loadAssignedDashboardProjects } from '../components/dashboard/dashboardService';
import { getDashboardRole } from '../services/executionDemoData';
import { formatCurrency } from '../lib/utils';
import { resolveActiveWorkspaceForWrite } from '../services/businessHierarchyService';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];


export function ProjectsPage() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const dashboardRole = getDashboardRole(profile?.role);
  const canUpdateProgress = ['executive_engineer', 'assistant_engineer', 'junior_engineer', 'admin'].includes(dashboardRole);
  const toast = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', status: 'active',
    start_date: '', end_date: '', budget: '', location: '',
  });

  const loadProjects = useCallback(async () => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const assignedProjects = await loadAssignedDashboardProjects(profile?.role, {
        userId,
        fullName: profile?.full_name,
        company: profile?.company,
      });
      setProjects(assignedProjects);
    } catch (error) {
      setProjects([]);
      toast(error instanceof Error ? error.message : 'Failed to load assigned projects', 'error');
    } finally {
      setLoading(false);
    }
  }, [profile?.company, profile?.full_name, profile?.role, toast, userId]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function addProject() {
    if (!userId) return;
    if (!form.name) { toast('Project name required', 'warning'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from('projects').insert({
      owner_id: userId,
      company: '',
      name: form.name,
      project_name: form.name,
      description: form.description,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: parseFloat(form.budget) || 0,
      location: form.location,
      progress_percent: 0,
    }).select().maybeSingle();
    setSubmitting(false);
    if (error) { toast('Failed to create project', 'error'); return; }
    if (!data?.id) { toast('Failed to create project', 'error'); return; }

    let activeWorkspace;
    try {
      activeWorkspace = await resolveActiveWorkspaceForWrite();
    } catch (workspaceError) {
      toast(workspaceError instanceof Error ? workspaceError.message : `Project created, but workspace assignment failed. Project ID: ${data.id}`, 'error');
      navigate(`/enterprise/assign-project?projectId=${data.id}&projectTable=projects`);
      return;
    }
    const workspaceId = activeWorkspace.workspace.id;
    const assignmentPayload = {
      workspace_id: workspaceId,
      project_id: data.id,
      project_table: 'projects',
      executive_engineer_id: userId,
      access_status: 'active',
    };
    const existingAssignment = await supabase
      .from('project_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('project_id', data.id)
      .eq('project_table', 'projects')
      .maybeSingle();

    if (existingAssignment.error) {
      setSubmitting(false);
      toast(`Project created, but assignment lookup failed. Project ID: ${data.id}`, 'error');
      navigate(`/enterprise/assign-project?workspaceId=${workspaceId}&projectId=${data.id}&projectTable=projects`);
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
      toast(`Project created, but assignment failed. Project ID: ${data.id}`, 'error');
      navigate(`/enterprise/assign-project?workspaceId=${workspaceId}&projectId=${data.id}&projectTable=projects`);
      return;
    }

    await loadProjects();
    setShowForm(false);
    setForm({ name: '', description: '', status: 'active', start_date: '', end_date: '', budget: '', location: '' });
    toast(`Project "${form.name}" created!`, 'success');
  }

  async function updateProgress(id: string, progress: number) {
    if (!canUpdateProgress) return;
    const { error } = await supabase.from('projects').update({ progress_percent: progress }).eq('id', id);
    if (error) {
      toast('Progress update was not authorized', 'error');
      return;
    }
    setProjects(prev => prev.map((project) => project.id === id ? { ...project, progress } : project));
  }

  return (
    <AppLayout title="Projects" subtitle="Workspace execution projects">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: '#22c55e10', color: '#22c55e', border: '1px solid #22c55e25' }}>
            <span>{projects.length}</span>
            <span>Assigned projects</span>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Project</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">New Project</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="Project Name *" placeholder="Greenfield Residential Complex" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <Textarea label="Description" placeholder="Brief description of the project..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} options={statusOptions} />
                <Input label="Budget (₹)" type="number" placeholder="50000000" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} icon={<DollarSign size={13} />} />
                <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
                <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
              <Input label="Location" placeholder="Pune, Maharashtra" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} icon={<MapPin size={13} />} />
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} onClick={addProject}>Create Project</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No projects yet</p>
          <p className="text-[#606060] text-sm mb-4">No active project assignments are available for your role.</p>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => {
            const Icon = TrendingUp;
            const color = '#22c55e';
            return (
              <div key={p.id} className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={13} style={{ color }} />
                      <span className="text-xs capitalize font-medium" style={{ color }}>{p.projectTable.replace('_', ' ')}</span>
                    </div>
                    <h3 className="text-white font-bold truncate">{p.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="text-[#606060]" />
                      <span className="text-[#606060] text-xs">{p.code} · {p.assignmentRole?.replace('_', ' ') || 'assigned'}</span>
                    </div>
                  </div>
                  {p.budget > 0 && (
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[#606060] text-[10px]">Budget</p>
                      <p className="text-white text-sm font-bold">{formatCurrency(p.budget)}</p>
                    </div>
                  )}
                </div>


                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#606060] text-xs">Progress</span>
                    <span className="text-white text-xs font-semibold">{p.progress == null ? 'Not available' : `${Math.round(p.progress)}%`}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progress || 0}%`, background: `linear-gradient(90deg, #FF6B00, #FF8C00)` }} />
                  </div>
                  {canUpdateProgress && p.projectTable === 'projects' && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {[0, 25, 50, 75, 100].map((value) => (
                        <button key={value} onClick={() => updateProgress(p.id, value)}
                          className="px-2 py-0.5 rounded text-[9px] transition-all"
                          style={{ background: p.progress === value ? 'rgba(255,107,0,0.2)' : '#111111', color: p.progress === value ? '#FF6B00' : '#606060', border: `1px solid ${p.progress === value ? 'rgba(255,107,0,0.3)' : '#1F1F1F'}` }}>
                          {value}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
