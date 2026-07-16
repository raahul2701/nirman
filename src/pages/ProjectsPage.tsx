import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Plus, X, Calendar, MapPin, DollarSign,
  TrendingUp, CheckCircle, Clock, PauseCircle, XCircle
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { useToast } from '../components/ui/useToast';
import { Project } from '../types';
import { formatCurrency } from '../lib/utils';
import { resolveActiveWorkspaceForWrite } from '../services/businessHierarchyService';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusColors: Record<string, string> = {
  active: '#22c55e', completed: '#00D4AA', on_hold: '#F59E0B', cancelled: '#ef4444'
};

const statusIcons: Record<string, typeof CheckCircle> = {
  active: TrendingUp, completed: CheckCircle, on_hold: PauseCircle, cancelled: XCircle
};

export function ProjectsPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const toast = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', status: 'active',
    start_date: '', end_date: '', budget: '', location: '',
  });

  const loadProjects = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('projects').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    if (data) setProjects(data as Project[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadProjects();
  }, [loadProjects, userId]);

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

    if (data) setProjects(prev => [data as Project, ...prev]);
    setShowForm(false);
    setForm({ name: '', description: '', status: 'active', start_date: '', end_date: '', budget: '', location: '' });
    toast(`Project "${form.name}" created!`, 'success');
  }

  async function updateProgress(id: string, progress: number) {
    await supabase.from('projects').update({ progress_percent: progress }).eq('id', id);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, progress_percent: progress } : p));
  }

  return (
    <AppLayout title="Projects" subtitle="Workspace execution projects">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          {['active', 'completed', 'on_hold'].map(s => (
            <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: `${statusColors[s]}10`, color: statusColors[s], border: `1px solid ${statusColors[s]}25` }}>
              <span>{projects.filter(p => p.status === s).length}</span>
              <span className="capitalize">{s.replace('_', ' ')}</span>
            </div>
          ))}
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
          <p className="text-[#606060] text-sm mb-4">Create your first construction project</p>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => {
            const Icon = statusIcons[p.status] || TrendingUp;
            const color = statusColors[p.status] || '#808080';
            return (
              <div key={p.id} className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={13} style={{ color }} />
                      <span className="text-xs capitalize font-medium" style={{ color }}>{p.status.replace('_', ' ')}</span>
                    </div>
                    <h3 className="text-white font-bold truncate">{p.name}</h3>
                    {p.location && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-[#606060]" />
                        <span className="text-[#606060] text-xs">{p.location}</span>
                      </div>
                    )}
                  </div>
                  {p.budget > 0 && (
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[#606060] text-[10px]">Budget</p>
                      <p className="text-white text-sm font-bold">{formatCurrency(p.budget)}</p>
                    </div>
                  )}
                </div>

                {p.description && <p className="text-[#808080] text-xs mb-4 line-clamp-2">{p.description}</p>}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#606060] text-xs">Progress</span>
                    <span className="text-white text-xs font-semibold">{p.progress_percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progress_percent}%`, background: `linear-gradient(90deg, #FF6B00, #FF8C00)` }} />
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {[0, 25, 50, 75, 100].map(v => (
                      <button key={v} onClick={() => updateProgress(p.id, v)}
                        className="px-2 py-0.5 rounded text-[9px] transition-all"
                        style={{ background: p.progress_percent === v ? 'rgba(255,107,0,0.2)' : '#111111', color: p.progress_percent === v ? '#FF6B00' : '#606060', border: `1px solid ${p.progress_percent === v ? 'rgba(255,107,0,0.3)' : '#1F1F1F'}` }}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-[#232323]">
                  {p.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar size={10} className="text-[#606060]" />
                      <span className="text-[#606060] text-[10px]">{new Date(p.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  )}
                  {p.end_date && (
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-[#606060]" />
                      <span className="text-[#606060] text-[10px]">Due {new Date(p.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
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
