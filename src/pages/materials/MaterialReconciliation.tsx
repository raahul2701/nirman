import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { useAuth } from '../../contexts/useAuth';
import { useMaterialVariance } from '../../hooks/useMaterialVariance';
import {
  loadProjectOptionsForAssignments,
  loadVisibleProjectAssignments,
  type ProjectAssignmentAccessRow,
  type ProjectOption,
} from '../../services/assignedProjectsService';
import {
  listContractorMaterials,
  listContractorStockTransactions,
  recordMaterialEntry,
  type ContractorMaterialRecord,
  type ContractorStockTransaction,
} from '../../services/contractorMaterialsService';
import type { WorkerScope } from '../../services/workersService';

function projectKey(projectTable: string | null, projectId: string | null) {
  return projectTable && projectId ? `${projectTable}:${projectId}` : '';
}

function assignmentScope(assignment: ProjectAssignmentAccessRow | undefined): WorkerScope | null {
  if (!assignment?.workspace_id || !assignment.project_id || !assignment.contractor_id || (assignment.project_table !== 'projects' && assignment.project_table !== 'gov_projects')) return null;
  return {
    workspace_id: assignment.workspace_id,
    project_id: assignment.project_id,
    project_table: assignment.project_table,
    contractor_id: assignment.contractor_id,
  };
}

function attachMaterialDetails(
  transactions: ContractorStockTransaction[],
  materials: ContractorMaterialRecord[],
): ContractorStockTransaction[] {
  const materialsById = new Map(materials.map((material) => [material.id, material]));
  return transactions.map((transaction) => {
    const material = transaction.material_id ? materialsById.get(transaction.material_id) : undefined;
    return {
      ...transaction,
      materials: material ? { material_name: material.material_name, unit: material.unit } : null,
    };
  });
}

export function MaterialReconciliation() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const isContractor = profile?.role === 'contractor';
  const { reconciliations, totalVariance, activeAlerts, loading } = useMaterialVariance();

  const requestRef = useRef(0);
  const [assignments, setAssignments] = useState<ProjectAssignmentAccessRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsState, setProjectsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedProjectKey, setSelectedProjectKey] = useState('');

  const [materials, setMaterials] = useState<ContractorMaterialRecord[]>([]);
  const [transactions, setTransactions] = useState<ContractorStockTransaction[]>([]);
  const [entriesState, setEntriesState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    material_name: '',
    quantity: '',
    unit: '',
    unit_price: '',
    entry_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!userId || !isContractor) return;
    const requestId = ++requestRef.current;
    let cancelled = false;
    setProjectsState('loading');
    loadVisibleProjectAssignments(userId)
      .then((loadedAssignments) => Promise.all([loadedAssignments, loadProjectOptionsForAssignments(loadedAssignments)] as const))
      .then(([loadedAssignments, loadedProjects]) => {
        if (cancelled || requestId !== requestRef.current) return;
        setAssignments(loadedAssignments);
        setProjects(loadedProjects);
        if (loadedAssignments.length === 1) setSelectedProjectKey(projectKey(loadedAssignments[0].project_table, loadedAssignments[0].project_id));
        setProjectsState('ready');
      })
      .catch(() => {
        if (!cancelled && requestId === requestRef.current) setProjectsState('error');
      });
    return () => { cancelled = true; };
  }, [userId, isContractor]);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey),
    [assignments, selectedProjectKey],
  );
  const selectedProject = useMemo(
    () => projects.find((project) => projectKey(project.table, project.id) === selectedProjectKey),
    [projects, selectedProjectKey],
  );
  const selectedScope = useMemo(() => assignmentScope(selectedAssignment), [selectedAssignment]);

  useEffect(() => {
    if (!isContractor) return;
    const scope = assignmentScope(assignments.find((assignment) => projectKey(assignment.project_table, assignment.project_id) === selectedProjectKey));
    if (!scope) { setMaterials([]); setTransactions([]); setEntriesState('idle'); return; }
    let cancelled = false;
    setEntriesState('loading');
    Promise.all([listContractorMaterials(scope), listContractorStockTransactions(scope)])
      .then(([materialRows, transactionRows]) => {
        if (cancelled) return;
        setMaterials(materialRows);
        setTransactions(attachMaterialDetails(transactionRows, materialRows));
        setEntriesState('ready');
      })
      .catch(() => { if (!cancelled) setEntriesState('error'); });
    return () => { cancelled = true; };
  }, [isContractor, selectedProjectKey, assignments]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedScope) { setFormError('Select an assigned project.'); return; }
    const quantity = Number(form.quantity);
    if (!form.material_name.trim()) { setFormError('Material name is required.'); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) { setFormError('Quantity must be a positive number.'); return; }
    setSaving(true); setFormError(''); setMessage('');
    try {
      const result = await recordMaterialEntry(selectedScope, {
        material_name: form.material_name.trim(),
        quantity,
        unit: form.unit.trim(),
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        entry_date: form.entry_date,
        notes: form.notes.trim(),
      });
      const [materialRows, transactionRows] = await Promise.all([listContractorMaterials(selectedScope), listContractorStockTransactions(selectedScope)]);
      setMaterials(materialRows);
      setTransactions(attachMaterialDetails(transactionRows, materialRows));
      setForm({ material_name: '', quantity: '', unit: '', unit_price: '', entry_date: new Date().toISOString().slice(0, 10), notes: '' });
      setShowForm(false);
      setMessage(`Material entry saved. Current stock: ${result.current_quantity}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save material entry.');
    } finally {
      setSaving(false);
    }
  }

  const totalReceived = transactions.reduce((sum, transaction) => sum + (transaction.transaction_type === 'in' ? Number(transaction.quantity) : 0), 0);

  return (
    <AppLayout title="Materials" subtitle="Record project material movements and review reconciliation">
      {isContractor && (
        <div className="mb-6 rounded-2xl bg-slate-950 border border-slate-800 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <label htmlFor="material-project" className="mb-2 block text-sm font-medium text-white">Current project</label>
              {projectsState === 'loading' ? <p className="text-sm text-slate-500">Loading assigned projects...</p>
                : projectsState === 'error' ? <p className="text-sm text-red-400">Unable to load assigned projects.</p>
                : assignments.length === 0 ? <p className="text-sm text-slate-500">No assigned projects.</p>
                : (
                  <Select id="material-project" value={selectedProjectKey} onChange={(event) => { setSelectedProjectKey(event.target.value); setMessage(''); }}
                    options={projects.map((project) => ({ value: projectKey(project.table, project.id), label: `${project.label} · ${project.table}` }))} />
                )}
              {selectedProject && selectedScope && (
                <p className="mt-2 text-xs text-slate-400">
                  {selectedProject.label} · {selectedProject.table} · Contractor: {profile?.full_name || profile?.email || user?.email}
                </p>
              )}
            </div>
            <Button variant="primary" icon={<Plus size={14} />} disabled={!selectedScope} onClick={() => { setFormError(''); setMessage(''); setShowForm(true); }}>+ Add Material Entry</Button>
          </div>
          {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        </div>
      )}

      {isContractor && showForm && selectedScope && (
        <div className="mb-6 rounded-2xl bg-slate-950 border border-slate-800 p-5">
          <h2 className="text-lg font-semibold text-white">Add Material Entry</h2>
          <p className="mt-1 text-xs text-slate-400">Records a real stock receipt into the project material ledger for {selectedProject?.label}.</p>
          <form onSubmit={submitEntry} className="mt-4 grid gap-3 md:grid-cols-2">
            <Input label="Material" required value={form.material_name} onChange={(event) => setForm((current) => ({ ...current, material_name: event.target.value }))} />
            <Input label="Quantity" type="number" min="0.01" step="any" required value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
            <Input label="Unit" placeholder="MT, bags, cum" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
            <Input label="Unit price (₹)" type="number" min="0" step="any" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: event.target.value }))} />
            <Input label="Date" type="date" required value={form.entry_date} onChange={(event) => setForm((current) => ({ ...current, entry_date: event.target.value }))} />
            <div className="md:col-span-2"><Textarea label="Notes" rows={2} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></div>
            {formError && <p className="text-sm text-red-400 md:col-span-2">{formError}</p>}
            <div className="flex gap-3 md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>Save Material Entry</Button>
            </div>
          </form>
        </div>
      )}
      {isContractor && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 mb-6">
          <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
            <p className="text-slate-400 text-xs uppercase">Material masters</p>
            <p className="mt-3 text-3xl text-white font-bold">{materials.length}</p>
          </div>
          <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
            <p className="text-slate-400 text-xs uppercase">Movements</p>
            <p className="mt-3 text-3xl text-white font-bold">{transactions.length}</p>
          </div>
          <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
            <p className="text-slate-400 text-xs uppercase">Quantity received</p>
            <p className="mt-3 text-3xl text-white font-bold">{totalReceived.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
            <p className="text-slate-400 text-xs uppercase">Current stock</p>
            <p className="mt-3 text-3xl text-white font-bold">{materials.reduce((sum, material) => sum + Number(material.current_quantity), 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {isContractor && (
        <div className="mb-6 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
          <div className="border-b border-slate-800 px-5 py-3 text-xs uppercase text-slate-400">
            Recent material entries {selectedProject ? `· ${selectedProject.label}` : ''}
          </div>
          {entriesState === 'loading' ? <div className="p-6 text-slate-500">Loading material entries...</div>
            : entriesState === 'error' ? <div className="p-6 text-red-400">Unable to load material entries.</div>
            : !selectedScope ? <div className="p-6 text-slate-500">Select an assigned project to view material entries.</div>
            : transactions.length === 0 ? <div className="p-6 text-slate-500">No material entries recorded for this project.</div>
            : (
              <div className="divide-y divide-slate-800">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_120px_100px_1fr] md:items-center">
                    <div>
                      <p className="text-sm font-medium text-white">{transaction.materials?.material_name || 'Material'}</p>
                      <p className="text-xs text-slate-500">{transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleString() : 'No date'}</p>
                    </div>
                    <span className="text-slate-200">{transaction.quantity} {transaction.materials?.unit || ''}</span>
                    <span className="text-slate-400">{transaction.transaction_type}</span>
                    <span className="text-xs text-slate-400">{transaction.notes || 'No notes'}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mb-6">
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Variance records</p>
          <p className="mt-3 text-3xl text-white font-bold">{reconciliations.length}</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Average variance</p>
          <p className="mt-3 text-3xl text-white font-bold">{(reconciliations.length ? totalVariance / reconciliations.length : 0).toFixed(2)}%</p>
        </div>
        <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase">Active alerts</p>
          <p className="mt-3 text-3xl text-white font-bold">{activeAlerts}</p>
        </div>
      </div>
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
        <div className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-3 text-slate-400 text-xs uppercase border-b border-slate-800">
          <span>Material</span>
          <span className="text-center">Required</span>
          <span className="text-center">Used</span>
          <span className="text-center">Variance</span>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-6 text-slate-500">Loading material reconciliation...</div>
          ) : reconciliations.length === 0 ? (
            <div className="p-6 text-slate-500">No reconciliation records found.</div>
          ) : (
            reconciliations.slice(0, 10).map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_120px_120px] gap-3 px-5 py-4 items-center">
                <span className="text-white text-sm">{item.material_name}</span>
                <span className="text-center text-slate-200">{item.theoretical_required}</span>
                <span className="text-center text-slate-200">{item.actual_consumption}</span>
                <span className="text-center text-white">{item.variance_percent.toFixed(1)}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
