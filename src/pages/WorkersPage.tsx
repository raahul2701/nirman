import { useEffect, useRef, useState } from 'react';
import { Edit3, Plus, Users, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../contexts/useAuth';
import { logger } from '../lib/logger';
import {
  loadProjectOptionsForAssignments,
  loadVisibleProjectAssignments,
  type ProjectAssignmentAccessRow,
  type ProjectOption,
} from '../services/assignedProjectsService';
import { createWorker, listWorkers, updateWorker, type WorkerScope } from '../services/workersService';
import { createSubcontractor, listSubcontractors, updateSubcontractor, type Subcontractor } from '../services/subcontractorsService';
import type { Worker } from '../types';

function projectKey(projectTable: string | null, projectId: string | null) {
  return projectTable && projectId ? `${projectTable}:${projectId}` : '';
}

type WorkerFormValues = {
  full_name: string;
  phone: string;
  email: string;
  skill: string;
  daily_wage: string;
  emergency_contact: string;
  address: string;
  joining_date: string;
  is_active: boolean;
  aadhaar_number: string;
};

const initialWorkerForm: WorkerFormValues = {
  full_name: '', phone: '', email: '', skill: '', daily_wage: '', emergency_contact: '', address: '', joining_date: '', is_active: true, aadhaar_number: '',
};
type SubcontractorFormValues = {
  company_name: string; contact_person: string; phone: string; email: string; work_type: string; work_description: string; status: string; start_date: string; end_date: string;
};
const initialSubcontractorForm: SubcontractorFormValues = { company_name: '', contact_person: '', phone: '', email: '', work_type: '', work_description: '', status: 'active', start_date: '', end_date: '' };

function assignmentScope(assignment: ProjectAssignmentAccessRow | null): WorkerScope | null {
  if (!assignment || !assignment.workspace_id || !assignment.project_id || !assignment.contractor_id || (assignment.project_table !== 'projects' && assignment.project_table !== 'gov_projects')) return null;
  return { workspace_id: assignment.workspace_id, project_id: assignment.project_id, project_table: assignment.project_table, contractor_id: assignment.contractor_id };
}

export function WorkersPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const requestRef = useRef(0);
  const subcontractorRequestRef = useRef(0);
  const [assignments, setAssignments] = useState<ProjectAssignmentAccessRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState('');
  const [projectsState, setProjectsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersState, setWorkersState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [workerRefreshVersion, setWorkerRefreshVersion] = useState(0);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState<WorkerFormValues>(initialWorkerForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [subcontractorsState, setSubcontractorsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [subcontractorRefreshVersion, setSubcontractorRefreshVersion] = useState(0);
  const [showAddSubcontractor, setShowAddSubcontractor] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [subcontractorForm, setSubcontractorForm] = useState<SubcontractorFormValues>(initialSubcontractorForm);
  const [subcontractorFormError, setSubcontractorFormError] = useState('');
  const [subcontractorSubmitting, setSubcontractorSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    requestRef.current += 1;
    setAssignments([]); setProjects([]); setWorkers([]); setSelectedProjectKey('');
    if (!userId) { setProjectsState('ready'); return () => { cancelled = true; }; }
    const currentUserId = userId;
    async function loadProjects() {
      setProjectsState('loading');
      try {
        const visibleAssignments = await loadVisibleProjectAssignments(currentUserId);
        const assignmentKeys = visibleAssignments.map((assignment) => projectKey(assignment.project_table, assignment.project_id));
        if (assignmentKeys.some((key) => !key) || new Set(assignmentKeys).size !== assignmentKeys.length) throw new Error('Assigned project context is invalid.');
        const projectOptions = await loadProjectOptionsForAssignments(visibleAssignments);
        if (!cancelled) {
          setAssignments(visibleAssignments); setProjects(projectOptions); setProjectsState('ready');
          if (visibleAssignments.length === 1 && projectOptions.length === 1) setSelectedProjectKey(projectKey(visibleAssignments[0].project_table, visibleAssignments[0].project_id));
        }
      } catch (error) {
        logger.error('Unable to load workforce project assignments', { error, userId });
        if (!cancelled) setProjectsState('error');
      }
    }
    void loadProjects();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setWorkers([]);
    if (!selectedProjectKey) { setWorkersState('idle'); return; }
    const matches = assignments.filter((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey);
    const scope = assignmentScope(matches.length === 1 ? matches[0] : null);
    if (!scope) { logger.error('Unable to resolve workforce project scope', { selectedProjectKey, matchCount: matches.length }); setWorkersState('error'); return; }
    const resolvedScope = scope;
    async function loadWorkers() {
      setWorkersState('loading');
      try {
        const loadedWorkers = await listWorkers(resolvedScope);
        if (requestRef.current === requestId) { setWorkers(loadedWorkers); setWorkersState('ready'); }
      } catch (error) {
        logger.error('Unable to load scoped workforce', { error, selectedProjectKey });
        if (requestRef.current === requestId) setWorkersState('error');
      }
    }
    void loadWorkers();
  }, [assignments, selectedProjectKey, workerRefreshVersion]);


useEffect(() => {
    setShowAddWorker(false); setWorkerForm(initialWorkerForm); setFormError(''); setSelectedWorker(null); setEditingWorker(null); setShowAddSubcontractor(false); setSelectedSubcontractor(null); setEditingSubcontractor(null); setSubcontractorForm(initialSubcontractorForm); setSubcontractorFormError(''); setSubcontractors([]); setSubcontractorsState('idle'); subcontractorRequestRef.current += 1;
  }, [selectedProjectKey]);

  useEffect(() => {
    const requestId = ++subcontractorRequestRef.current;
    setSubcontractors([]);
    if (!selectedProjectKey) { setSubcontractorsState('idle'); return; }
    const matches = assignments.filter((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey);
    const scope = assignmentScope(matches.length === 1 ? matches[0] : null);
    if (!scope) { setSubcontractorsState('error'); return; }
    const resolvedScope = scope;
    async function loadScopedSubcontractors() {
      setSubcontractorsState('loading');
      try {
        const loaded = await listSubcontractors(resolvedScope);
        if (subcontractorRequestRef.current === requestId) { setSubcontractors(loaded); setSubcontractorsState('ready'); }
      } catch (error) {
        logger.error('Unable to load scoped subcontractors', { error, selectedProjectKey });
        if (subcontractorRequestRef.current === requestId) setSubcontractorsState('error');
      }
    }
    void loadScopedSubcontractors();
  }, [assignments, selectedProjectKey, subcontractorRefreshVersion]);


  const selectedProject = projects.find((project) => `${project.table}:${project.id}` === selectedProjectKey) || null;
  const canSelectProject = projectsState === 'ready' && projects.length > 0;
  const selectedAssignments = assignments.filter((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey);
  const selectedScope = assignmentScope(selectedAssignments.length === 1 ? selectedAssignments[0] : null);
  const canAddWorker = Boolean(selectedProject && selectedScope && workersState !== 'error');
  const canManageSubcontractors = Boolean(selectedProject && selectedScope && subcontractorsState !== 'error');

  function updateWorkerForm<K extends keyof WorkerFormValues>(field: K, value: WorkerFormValues[K]) { setWorkerForm((current) => ({ ...current, [field]: value })); }
  function closeWorkerForm() { if (!submitting) { setShowAddWorker(false); setWorkerForm(initialWorkerForm); setFormError(''); } }
  function openDetails(worker: Worker) { setSelectedWorker(worker); setFormError(''); }
  function openEdit(worker: Worker) { setSelectedWorker(null); setEditingWorker(worker); setWorkerForm({ full_name: worker.full_name || '', phone: worker.phone || '', email: worker.email || '', skill: worker.skill || '', daily_wage: worker.daily_wage == null ? '' : String(worker.daily_wage), emergency_contact: worker.emergency_contact || '', address: worker.address || '', joining_date: worker.joining_date || '', is_active: worker.is_active !== false, aadhaar_number: worker.aadhaar_number || '' }); setFormError(''); }
  function closeEdit() { if (!submitting) { setEditingWorker(null); setWorkerForm(initialWorkerForm); setFormError(''); } }

  function updateSubcontractorForm<K extends keyof SubcontractorFormValues>(field: K, value: SubcontractorFormValues[K]) { setSubcontractorForm((current) => ({ ...current, [field]: value })); }
  function openSubcontractorDetails(item: Subcontractor) { setSelectedSubcontractor(item); setSubcontractorFormError(''); }
  function openSubcontractorEdit(item: Subcontractor) { setSelectedSubcontractor(null); setEditingSubcontractor(item); setSubcontractorForm({ company_name: item.company_name || '', contact_person: item.contact_person || '', phone: item.phone || '', email: item.email || '', work_type: item.work_type || '', work_description: item.work_description || '', status: item.status || 'active', start_date: item.start_date || '', end_date: item.end_date || '' }); setSubcontractorFormError(''); }
  function closeSubcontractorForm() { if (!subcontractorSubmitting) { setShowAddSubcontractor(false); setSubcontractorForm(initialSubcontractorForm); setSubcontractorFormError(''); } }
  function closeSubcontractorEdit() { if (!subcontractorSubmitting) { setEditingSubcontractor(null); setSubcontractorForm(initialSubcontractorForm); setSubcontractorFormError(''); } }
  function validateSubcontractorForm() {
    const companyName = subcontractorForm.company_name.trim(); const email = subcontractorForm.email.trim();
    if (!companyName) return { error: 'Company name is required.' };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
    if (!['active', 'inactive', 'completed'].includes(subcontractorForm.status)) return { error: 'Select a valid status.' };
    return { companyName, email };
  }
  function currentSubcontractorScope() { const matches = assignments.filter((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey); return assignmentScope(matches.length === 1 ? matches[0] : null); }
  async function submitSubcontractor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (subcontractorSubmitting) return; const validation = validateSubcontractorForm(); if (validation.error) { setSubcontractorFormError(validation.error); return; } const scope = currentSubcontractorScope(); if (!scope) { setSubcontractorFormError('Select a valid assigned project before adding a subcontractor.'); return; }
    setSubcontractorSubmitting(true); setSubcontractorFormError('');
    try { await createSubcontractor({ ...scope, company_name: validation.companyName || '', contact_person: subcontractorForm.contact_person.trim() || undefined, phone: subcontractorForm.phone.trim() || undefined, email: validation.email || undefined, work_type: subcontractorForm.work_type.trim() || undefined, work_description: subcontractorForm.work_description.trim() || undefined, status: subcontractorForm.status, start_date: subcontractorForm.start_date || undefined, end_date: subcontractorForm.end_date || undefined }); setShowAddSubcontractor(false); setSubcontractorForm(initialSubcontractorForm); setSubcontractorFormError(''); setSubcontractorRefreshVersion((version) => version + 1); }
    catch (error) { logger.error('Unable to create scoped subcontractor', { error, selectedProjectKey }); setSubcontractorFormError('Unable to add subcontractor. Please try again.'); } finally { setSubcontractorSubmitting(false); }
  }
  async function submitSubcontractorEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (subcontractorSubmitting || !editingSubcontractor) return; const validation = validateSubcontractorForm(); if (validation.error) { setSubcontractorFormError(validation.error); return; } const scope = currentSubcontractorScope(); if (!scope) { setSubcontractorFormError('Select a valid assigned project before editing a subcontractor.'); return; }
    setSubcontractorSubmitting(true); setSubcontractorFormError('');
    try { await updateSubcontractor(editingSubcontractor.id, scope, { company_name: validation.companyName || '', contact_person: subcontractorForm.contact_person.trim() || undefined, phone: subcontractorForm.phone.trim() || undefined, email: validation.email || undefined, work_type: subcontractorForm.work_type.trim() || undefined, work_description: subcontractorForm.work_description.trim() || undefined, status: subcontractorForm.status, start_date: subcontractorForm.start_date || undefined, end_date: subcontractorForm.end_date || undefined }); setEditingSubcontractor(null); setSubcontractorForm(initialSubcontractorForm); setSubcontractorFormError(''); setSubcontractorRefreshVersion((version) => version + 1); }
    catch (error) { logger.error('Unable to update scoped subcontractor', { error, selectedProjectKey, subcontractorId: editingSubcontractor.id }); setSubcontractorFormError('Unable to update subcontractor. Please try again.'); } finally { setSubcontractorSubmitting(false); }
  }
  async function submitWorker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const fullName = workerForm.full_name.trim();
    const email = workerForm.email.trim();
    const dailyWageText = workerForm.daily_wage.trim();
    const dailyWage = dailyWageText === '' ? undefined : Number(dailyWageText);
    if (!fullName) { setFormError('Full name is required.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Enter a valid email address.'); return; }
    if (dailyWage !== undefined && (!Number.isFinite(dailyWage) || dailyWage < 0)) { setFormError('Daily wage must be a non-negative number.'); return; }
    const matches = assignments.filter((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey);
    const scope = assignmentScope(matches.length === 1 ? matches[0] : null);
    if (!scope) { setFormError('Select a valid assigned project before adding a worker.'); return; }
    setSubmitting(true); setFormError('');
    try {
      await createWorker({
        ...scope, full_name: fullName, phone: workerForm.phone.trim() || undefined, email: email || undefined, skill: workerForm.skill.trim() || undefined,
        daily_wage: dailyWage, emergency_contact: workerForm.emergency_contact.trim() || undefined, address: workerForm.address.trim() || undefined,
        joining_date: workerForm.joining_date || undefined, is_active: workerForm.is_active, aadhaar_number: workerForm.aadhaar_number.trim() || undefined,
      });
      setShowAddWorker(false); setWorkerForm(initialWorkerForm); setWorkerRefreshVersion((version) => version + 1);
    } catch (error) {
      logger.error('Unable to create scoped worker', { error, selectedProjectKey });
      setFormError('Unable to add worker. Please try again.');
    } finally { setSubmitting(false); }
  }

async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !editingWorker) return;
    const fullName = workerForm.full_name.trim(); const email = workerForm.email.trim(); const dailyWageText = workerForm.daily_wage.trim(); const dailyWage = dailyWageText === '' ? undefined : Number(dailyWageText);
    if (!fullName) { setFormError('Full name is required.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Enter a valid email address.'); return; }
    if (dailyWage !== undefined && (!Number.isFinite(dailyWage) || dailyWage < 0)) { setFormError('Daily wage must be a non-negative number.'); return; }
    const matches = assignments.filter((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey); const scope = assignmentScope(matches.length === 1 ? matches[0] : null);
    if (!scope) { setFormError('Select a valid assigned project before editing a worker.'); return; }
    setSubmitting(true); setFormError('');
    try { await updateWorker(editingWorker.id, { ...scope, full_name: fullName, phone: workerForm.phone.trim() || undefined, email: email || undefined, skill: workerForm.skill.trim() || undefined, daily_wage: dailyWage, emergency_contact: workerForm.emergency_contact.trim() || undefined, address: workerForm.address.trim() || undefined, joining_date: workerForm.joining_date || undefined, is_active: workerForm.is_active, aadhaar_number: workerForm.aadhaar_number.trim() || undefined }); setEditingWorker(null); setWorkerForm(initialWorkerForm); setWorkerRefreshVersion((version) => version + 1); }
    catch (error) { logger.error('Unable to update scoped worker', { error, selectedProjectKey, workerId: editingWorker.id }); setFormError('Unable to update worker. Please try again.'); }
    finally { setSubmitting(false); }
  }
  return (
    <AppLayout title="Workforce Tracker" subtitle="Manage your assigned project workforce">
      <div className="mb-6 rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <label className="mb-2 block text-sm font-medium text-white" htmlFor="workforce-project">Project</label>
        <select id="workforce-project" value={selectedProjectKey} disabled={!canSelectProject} onChange={(event) => setSelectedProjectKey(event.target.value)} className="w-full rounded-xl border border-[#2A2A2A] px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60" style={{ background: '#111111' }}>
          <option value="">Select Assigned Project</option>
          {projects.map((project) => <option key={`${project.table}:${project.id}`} value={`${project.table}:${project.id}`}>{project.label} · {project.table}</option>)}
        </select>
        {projectsState === 'loading' && <p className="mt-2 text-sm text-[#A0A0A0]">Loading projects...</p>}
        {projectsState === 'error' && <p className="mt-2 text-sm text-red-400">Unable to load projects.</p>}
        {projectsState === 'ready' && assignments.length === 0 && <p className="mt-2 text-sm text-[#A0A0A0]">No assigned projects.</p>}
      </div>

      <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-white">Workers</h2>{selectedProject && <p className="mt-1 text-xs text-[#A0A0A0]">{selectedProject.label} · {selectedProject.table}</p>}</div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[#A0A0A0]">{workers.length}</span>
            {assignments.length > 0 && <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={!canAddWorker} title={canAddWorker ? 'Add Worker' : 'Select a project first'} onClick={() => setShowAddWorker(true)}>Add Worker</Button>}
          </div>
        </div>
        {!selectedProjectKey && projectsState === 'ready' && assignments.length > 0 && <EmptyWorkforce message="Select a project to view workforce." />}
        {workersState === 'loading' && <EmptyWorkforce message="Loading workforce..." />}
        {workersState === 'error' && <EmptyWorkforce message="Unable to load workforce." />}
        {workersState === 'ready' && workers.length === 0 && <EmptyWorkforce message="No workers found for this project." />}
        {workersState === 'ready' && workers.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[#232323] text-xs uppercase text-[#606060]"><tr><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Phone</th><th className="pb-3 pr-4">Skill</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Joining Date</th><th className="pb-3">Actions</th></tr></thead><tbody>{workers.map((worker) => <tr key={worker.id} className="border-b border-[#232323] text-[#D0D0D0] last:border-0"><td className="py-3 pr-4 font-medium text-white">{worker.full_name}</td><td className="py-3 pr-4">{worker.phone || '—'}</td><td className="py-3 pr-4">{worker.skill || '—'}</td><td className="py-3 pr-4">{worker.is_active ? 'Active' : 'Inactive'}</td><td className="py-3">{worker.joining_date ? new Date(worker.joining_date).toLocaleDateString('en-IN') : '—'}</td><td className="py-3"><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openDetails(worker)}>View</Button><Button type="button" size="sm" variant="ghost" icon={<Edit3 size={12} />} onClick={() => openEdit(worker)}>Edit</Button></div></td></tr>)}</tbody></table></div>}
      </div>

<div className="mt-6 rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">Sub-Contractors / Agencies</h2>{selectedProject && <p className="mt-1 text-xs text-[#A0A0A0]">{selectedProject.label} · {selectedProject.table}</p>}</div><div className="flex items-center gap-3"><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[#A0A0A0]">{subcontractors.length}</span>{assignments.length > 0 && <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={!canManageSubcontractors} title={canManageSubcontractors ? 'Add Sub-Contractor' : 'Select a project first'} onClick={() => setShowAddSubcontractor(true)}>Add Sub-Contractor</Button>}</div></div>
        {!selectedProjectKey && projectsState === 'ready' && assignments.length > 0 && <EmptyWorkforce message="Select a project to view subcontractors." />}
        {subcontractorsState === 'loading' && <EmptyWorkforce message="Loading subcontractors..." />}
        {subcontractorsState === 'error' && <EmptyWorkforce message="Unable to load subcontractors." />}
        {subcontractorsState === 'ready' && subcontractors.length === 0 && <EmptyWorkforce message="No subcontractors found for this project." />}
        {subcontractorsState === 'ready' && subcontractors.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[#232323] text-xs uppercase text-[#606060]"><tr><th className="pb-3 pr-4">Company</th><th className="pb-3 pr-4">Contact Person</th><th className="pb-3 pr-4">Phone</th><th className="pb-3 pr-4">Work Type</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4">Start Date</th><th className="pb-3 pr-4">End Date</th><th className="pb-3">Actions</th></tr></thead><tbody>{subcontractors.map((item) => <tr key={item.id} className="border-b border-[#232323] text-[#D0D0D0] last:border-0"><td className="py-3 pr-4 font-medium text-white">{item.company_name}</td><td className="py-3 pr-4">{item.contact_person || 'Not available'}</td><td className="py-3 pr-4">{item.phone || 'Not available'}</td><td className="py-3 pr-4">{item.work_type || 'Not available'}</td><td className="py-3 pr-4">{item.status}</td><td className="py-3 pr-4">{item.start_date ? new Date(item.start_date).toLocaleDateString('en-IN') : 'Not available'}</td><td className="py-3 pr-4">{item.end_date ? new Date(item.end_date).toLocaleDateString('en-IN') : 'Not available'}</td><td className="py-3"><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => openSubcontractorDetails(item)}>View</Button><Button type="button" size="sm" variant="ghost" icon={<Edit3 size={12} />} onClick={() => openSubcontractorEdit(item)}>Edit</Button></div></td></tr>)}</tbody></table></div>}
      </div>

      {selectedSubcontractor && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="w-full max-w-lg rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }} role="dialog" aria-modal="true" aria-labelledby="subcontractor-details-title"><div className="mb-5 flex items-start justify-between"><h2 id="subcontractor-details-title" className="text-lg font-bold text-white">Sub-Contractor Details</h2><button type="button" onClick={() => setSelectedSubcontractor(null)} className="text-[#606060] hover:text-white" aria-label="Close subcontractor details"><X size={18} /></button></div><div className="grid gap-3 text-sm sm:grid-cols-2">{[['Company Name', selectedSubcontractor.company_name], ['Contact Person', selectedSubcontractor.contact_person || 'Not available'], ['Phone', selectedSubcontractor.phone || 'Not available'], ['Email', selectedSubcontractor.email || 'Not available'], ['Work Type', selectedSubcontractor.work_type || 'Not available'], ['Work Description', selectedSubcontractor.work_description || 'Not available'], ['Status', selectedSubcontractor.status], ['Start Date', selectedSubcontractor.start_date ? new Date(selectedSubcontractor.start_date).toLocaleDateString('en-IN') : 'Not available'], ['End Date', selectedSubcontractor.end_date ? new Date(selectedSubcontractor.end_date).toLocaleDateString('en-IN') : 'Not available'], ['Created At', selectedSubcontractor.created_at ? new Date(selectedSubcontractor.created_at).toLocaleString('en-IN') : 'Not available'], ['Updated At', selectedSubcontractor.updated_at ? new Date(selectedSubcontractor.updated_at).toLocaleString('en-IN') : 'Not available']].map(([label, value]) => <div key={label}><p className="text-xs text-[#808080]">{label}</p><p className="mt-1 break-words text-[#D0D0D0]">{value}</p></div>)}</div><div className="mt-6 flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={() => setSelectedSubcontractor(null)}>Close</Button><Button type="button" variant="primary" className="flex-1" icon={<Edit3 size={14} />} onClick={() => openSubcontractorEdit(selectedSubcontractor)}>Edit</Button></div></div></div>}

      {editingSubcontractor && <SubcontractorFormDialog title="Edit Sub-Contractor" form={subcontractorForm} error={subcontractorFormError} submitting={subcontractorSubmitting} onChange={updateSubcontractorForm} onClose={closeSubcontractorEdit} onSubmit={submitSubcontractorEdit} />}
      {showAddSubcontractor && <SubcontractorFormDialog title="Add Sub-Contractor" form={subcontractorForm} error={subcontractorFormError} submitting={subcontractorSubmitting} onChange={updateSubcontractorForm} onClose={closeSubcontractorForm} onSubmit={submitSubcontractor} />}
{selectedWorker && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="w-full max-w-lg rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }} role="dialog" aria-modal="true" aria-labelledby="worker-details-title">
        <div className="mb-5 flex items-start justify-between"><h2 id="worker-details-title" className="text-lg font-bold text-white">Worker Details</h2><button type="button" onClick={() => setSelectedWorker(null)} className="text-[#606060] hover:text-white" aria-label="Close worker details"><X size={18} /></button></div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">{[['Full Name', selectedWorker.full_name], ['Phone', selectedWorker.phone || '—'], ['Email', selectedWorker.email || '—'], ['Skill / Role', selectedWorker.skill || '—'], ['Daily Wage', selectedWorker.daily_wage == null ? '—' : `₹${selectedWorker.daily_wage}`], ['Joining Date', selectedWorker.joining_date ? new Date(selectedWorker.joining_date).toLocaleDateString('en-IN') : '—'], ['Emergency Contact', selectedWorker.emergency_contact || '—'], ['Address', selectedWorker.address || '—'], ['Aadhaar', selectedWorker.aadhaar_number ? `XXXX XXXX ${selectedWorker.aadhaar_number.slice(-4)}` : '—'], ['Status', selectedWorker.is_active ? 'Active' : 'Inactive']].map(([label, value]) => <div key={label}><p className="text-xs text-[#808080]">{label}</p><p className="mt-1 break-words text-[#D0D0D0]">{value}</p></div>)}</div>
        <div className="mt-6 flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={() => setSelectedWorker(null)}>Close</Button><Button type="button" variant="primary" className="flex-1" icon={<Edit3 size={14} />} onClick={() => openEdit(selectedWorker)}>Edit</Button></div>
      </div></div>}

      {editingWorker && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }} role="dialog" aria-modal="true" aria-labelledby="edit-worker-title">
        <div className="mb-5 flex items-start justify-between"><h2 id="edit-worker-title" className="text-lg font-bold text-white">Edit Worker</h2><button type="button" onClick={closeEdit} disabled={submitting} className="text-[#606060] hover:text-white" aria-label="Close edit worker form"><X size={18} /></button></div>
        <form onSubmit={submitEdit} className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><Input label="Full Name" value={workerForm.full_name} onChange={(event) => updateWorkerForm('full_name', event.target.value)} required /><Input label="Phone" type="tel" value={workerForm.phone} onChange={(event) => updateWorkerForm('phone', event.target.value)} /><Input label="Email" type="email" value={workerForm.email} onChange={(event) => updateWorkerForm('email', event.target.value)} /><Input label="Skill / Role" value={workerForm.skill} onChange={(event) => updateWorkerForm('skill', event.target.value)} /><Input label="Daily Wage" type="number" min="0" step="any" value={workerForm.daily_wage} onChange={(event) => updateWorkerForm('daily_wage', event.target.value)} /><Input label="Joining Date" type="date" value={workerForm.joining_date} onChange={(event) => updateWorkerForm('joining_date', event.target.value)} /><Input label="Emergency Contact" type="tel" value={workerForm.emergency_contact} onChange={(event) => updateWorkerForm('emergency_contact', event.target.value)} /><Textarea label="Address" rows={3} value={workerForm.address} onChange={(event) => updateWorkerForm('address', event.target.value)} /><Input label="Aadhaar Number" type="password" autoComplete="off" value={workerForm.aadhaar_number} onChange={(event) => updateWorkerForm('aadhaar_number', event.target.value)} /></div><label className="flex items-center gap-2 text-sm text-[#D0D0D0]"><input type="checkbox" checked={workerForm.is_active} onChange={(event) => updateWorkerForm('is_active', event.target.checked)} />Active worker</label>{formError && <p className="text-sm text-red-400">{formError}</p>}<div className="flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={closeEdit} disabled={submitting}>Cancel</Button><Button type="submit" variant="primary" className="flex-1" loading={submitting}>Save</Button></div></form>
      </div></div>}
      {showAddWorker && selectedScope && <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }} role="dialog" aria-modal="true" aria-labelledby="add-worker-title">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="add-worker-title" className="text-lg font-bold text-white">Add Worker</h2>{selectedProject && <p className="mt-1 text-xs text-[#A0A0A0]">{selectedProject.label}</p>}</div><button type="button" onClick={closeWorkerForm} disabled={submitting} className="text-[#606060] hover:text-white disabled:cursor-not-allowed" aria-label="Close add worker form"><X size={18} /></button></div>
        <form onSubmit={submitWorker} className="space-y-5">
          <section><h3 className="mb-3 text-sm font-semibold text-white">Worker Details</h3><div className="grid gap-3 sm:grid-cols-2"><Input label="Full Name" value={workerForm.full_name} onChange={(event) => updateWorkerForm('full_name', event.target.value)} required /><Input label="Phone" type="tel" value={workerForm.phone} onChange={(event) => updateWorkerForm('phone', event.target.value)} /><Input label="Email" type="email" value={workerForm.email} onChange={(event) => updateWorkerForm('email', event.target.value)} /><Input label="Skill / Role" value={workerForm.skill} onChange={(event) => updateWorkerForm('skill', event.target.value)} /></div></section>
          <section><h3 className="mb-3 text-sm font-semibold text-white">Employment</h3><div className="grid gap-3 sm:grid-cols-2"><Input label="Daily Wage" type="number" min="0" step="any" value={workerForm.daily_wage} onChange={(event) => updateWorkerForm('daily_wage', event.target.value)} /><Input label="Joining Date" type="date" value={workerForm.joining_date} onChange={(event) => updateWorkerForm('joining_date', event.target.value)} /></div><label className="mt-3 flex items-center gap-2 text-sm text-[#D0D0D0]"><input type="checkbox" checked={workerForm.is_active} onChange={(event) => updateWorkerForm('is_active', event.target.checked)} />Active worker</label></section>
          <section><h3 className="mb-3 text-sm font-semibold text-white">Contact</h3><div className="grid gap-3 sm:grid-cols-2"><Input label="Emergency Contact" type="tel" value={workerForm.emergency_contact} onChange={(event) => updateWorkerForm('emergency_contact', event.target.value)} /><Textarea label="Address" rows={3} value={workerForm.address} onChange={(event) => updateWorkerForm('address', event.target.value)} /></div></section>
          <section><h3 className="mb-3 text-sm font-semibold text-white">Identity</h3><Input label="Aadhaar Number" type="password" autoComplete="off" value={workerForm.aadhaar_number} onChange={(event) => updateWorkerForm('aadhaar_number', event.target.value)} /></section>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex gap-3 pt-1"><Button type="button" variant="secondary" className="flex-1" onClick={closeWorkerForm} disabled={submitting}>Cancel</Button><Button type="submit" variant="primary" className="flex-1" loading={submitting}>Add Worker</Button></div>
        </form>
      </div></div>}
    </AppLayout>
  );
}

function EmptyWorkforce({ message }: { message: string }) {
  return <div className="flex flex-col items-center justify-center py-14 text-center"><Users size={40} className="mb-3 text-[#2A2A2A]" /><p className="text-sm text-[#A0A0A0]">{message}</p></div>;
}
function SubcontractorFormDialog({ title, form, error, submitting, onChange, onClose, onSubmit }: { title: string; form: SubcontractorFormValues; error: string; submitting: boolean; onChange: <K extends keyof SubcontractorFormValues>(field: K, value: SubcontractorFormValues[K]) => void; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }} role="dialog" aria-modal="true" aria-labelledby="subcontractor-form-title"><div className="mb-5 flex items-start justify-between"><h2 id="subcontractor-form-title" className="text-lg font-bold text-white">{title}</h2><button type="button" onClick={onClose} disabled={submitting} className="text-[#606060] hover:text-white" aria-label="Close subcontractor form"><X size={18} /></button></div><form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Input label="Company Name" required value={form.company_name} onChange={(event) => onChange('company_name', event.target.value)} /><Input label="Contact Person" value={form.contact_person} onChange={(event) => onChange('contact_person', event.target.value)} /><Input label="Phone" type="tel" value={form.phone} onChange={(event) => onChange('phone', event.target.value)} /><Input label="Email" type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} /><Input label="Work Type" value={form.work_type} onChange={(event) => onChange('work_type', event.target.value)} /><Input label="Start Date" type="date" value={form.start_date} onChange={(event) => onChange('start_date', event.target.value)} /><Input label="End Date" type="date" value={form.end_date} onChange={(event) => onChange('end_date', event.target.value)} /><Select label="Status" value={form.status} onChange={(event) => onChange('status', event.target.value)} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'completed', label: 'Completed' }]} /></div><Textarea label="Work Description" rows={3} value={form.work_description} onChange={(event) => onChange('work_description', event.target.value)} />{error && <p className="text-sm text-red-400">{error}</p>}<div className="flex gap-3"><Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" variant="primary" className="flex-1" loading={submitting}>{title.startsWith('Edit') ? 'Save' : 'Add Sub-Contractor'}</Button></div></form></div></div>;
}