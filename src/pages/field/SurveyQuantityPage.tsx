import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, CheckCircle2, FileText, Loader2, Ruler } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { getActiveWorkspaceId } from '../../services/businessHierarchyService';
import { loadProjectOptionsForAssignments, type ProjectOption } from '../../services/assignedProjectsService';

type FormState = {
  boqItemId: string;
  workPackageRef: string;
  mbNumber: string;
  chainage: string;
  tbmReference: string;
  benchmarkRl: string;
  backsight: string;
  intermediateSight: string;
  foresight: string;
  length: string;
  width: string;
  depth: string;
  remarks: string;
};

type BoqItem = {
  id: string;
  item_number: string | null;
  item_code: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  completed_quantity: number;
};

type Scope = { scope_type: string; work_package_ref: string | null; project_table: string | null };

const initialForm: FormState = {
  boqItemId: '', workPackageRef: '', mbNumber: '', chainage: '', tbmReference: '',
  benchmarkRl: '', backsight: '', intermediateSight: '', foresight: '',
  length: '', width: '', depth: '', remarks: '',
};

function optionalNumber(value: string) {
  return value.trim() === '' ? null : Number(value);
}

function projectLabel(project: ProjectOption) {
  return project.code ? `${project.label} (${project.code})` : project.label;
}

export function SurveyQuantityPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const projectId = searchParams.get('projectId');
  const projectTable = searchParams.get('projectTable');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadContext() {
      setLoading(true);
      setError(null);
      try {
        if (!user?.id) throw new Error('Your session has expired. Please sign in again.');
        if (!projectId) throw new Error('Select a project before entering a measurement.');
        const activeWorkspaceId = await getActiveWorkspaceId();
        if (!activeWorkspaceId) throw new Error('An active workspace is required to record measurements.');
        const [scopeResult, boqResult] = await Promise.all([
          supabase.from('project_user_scopes').select('scope_type, work_package_ref, project_table').eq('workspace_id', activeWorkspaceId).eq('project_id', projectId).eq('user_id', user.id).eq('role', 'surveyor').eq('active', true),
          supabase.from('project_boq').select('id, boq_items(id, item_number, item_code, description, unit, quantity, rate, completed_quantity)').eq('project_id', projectId).maybeSingle(),
        ]);
        if (scopeResult.error) throw scopeResult.error;
        if (boqResult.error) throw boqResult.error;
        const loadedScopes = (scopeResult.data || []) as Scope[];
        if (!loadedScopes.length) throw new Error('No active Surveyor scope is available for this project in your active workspace.');
        const scopeProjectTable = loadedScopes.find((scope) => scope.project_table)?.project_table || projectTable;
        const projects = await loadProjectOptionsForAssignments([{ project_id: projectId, project_table: scopeProjectTable }]);
        const selectedProject = projects.find((row) => row.id === projectId);
        if (!selectedProject) throw new Error('The selected project could not be loaded.');
        if (!cancelled) {
          setWorkspaceId(activeWorkspaceId);
          setProject(selectedProject);
          setBoqItems((boqResult.data?.boq_items || []) as BoqItem[]);
          setScopes(loadedScopes);
          const firstWorkPackage = loadedScopes.find((scope) => scope.scope_type !== 'entire_project' && scope.work_package_ref)?.work_package_ref || '';
          setForm((current) => ({ ...current, workPackageRef: firstWorkPackage }));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load measurement context.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadContext();
    return () => { cancelled = true; };
  }, [projectId, projectTable, user?.id]);

  const selectedBoqItem = boqItems.find((item) => item.id === form.boqItemId);
  const calculatedQuantity = useMemo(() => {
    const dimensions = [form.length, form.width, form.depth].map(Number);
    return dimensions.every((value) => Number.isFinite(value) && value > 0) ? dimensions[0] * dimensions[1] * dimensions[2] : null;
  }, [form.length, form.width, form.depth]);
  const hasEntireProjectScope = scopes.some((scope) => scope.scope_type === 'entire_project');
  const workPackageOptions = scopes.filter((scope) => scope.scope_type !== 'entire_project' && scope.work_package_ref);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveDraft() {
    setSaveError(null);
    setSavedDraft(null);
    if (!workspaceId || !projectId || !project || !form.boqItemId || !form.mbNumber.trim() || !form.chainage.trim()) {
      setSaveError('Project, BOQ item, MB number, and chainage are required.');
      return;
    }
    if (!hasEntireProjectScope && !form.workPackageRef) {
      setSaveError('Select an authorized work package before saving.');
      return;
    }
    const dimensions = [form.length, form.width, form.depth].map(Number);
    if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
      setSaveError('Length, width, and depth must be positive numbers.');
      return;
    }
    setSaving(true);
    try {
      const workPackageRef = form.workPackageRef === '' ? null : form.workPackageRef;
      const { data, error: rpcError } = await supabase.rpc('capture_survey_measurement_draft', {
        p_workspace_id: workspaceId,
        p_project_id: projectId,
        p_boq_item_id: form.boqItemId,
        p_work_package_ref: workPackageRef,
        p_mb_number: form.mbNumber.trim(),
        p_chainage: form.chainage.trim(),
        p_length: dimensions[0],
        p_width: dimensions[1],
        p_depth: dimensions[2],
        p_source_type: 'manual',
        p_tbm_reference: form.tbmReference.trim() || null,
        p_benchmark_rl: optionalNumber(form.benchmarkRl),
        p_backsight: optionalNumber(form.backsight),
        p_intermediate_sight: optionalNumber(form.intermediateSight),
        p_foresight: optionalNumber(form.foresight),
        p_remarks: form.remarks.trim() || null,
      });
      if (rpcError) throw rpcError;
      setSavedDraft((data || {}) as Record<string, unknown>);
    } catch (rpcError) {
      setSaveError(rpcError instanceof Error ? rpcError.message : 'Measurement draft could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Survey & Quantity" subtitle="Create a measurement-book draft from controlled survey evidence and dimensions.">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Project" value={project ? projectLabel(project) : 'Loading'} icon={<FileText size={18} />} color="#005F56" loading={loading} />
        <StatCard label="BOQ Items" value={boqItems.length} icon={<Ruler size={18} />} color="#C89B3C" loading={loading} />
        <StatCard label="Calculated Quantity" value={calculatedQuantity === null ? 'Enter dimensions' : calculatedQuantity.toFixed(3)} icon={<ClipboardCheck size={18} />} color="#0B8B7D" />
      </div>

      {loading && <Card className="mt-5"><p className="text-sm text-[#6C7568]">Loading project, BOQ, and surveyor scope...</p></Card>}
      {error && <Card className="mt-5 border-red-200"><p className="text-sm text-[#B42318]">{error}</p></Card>}

      {!loading && !error && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Card><h3 className="text-sm font-bold text-[#12332D]">Project Context</h3><p className="mt-2 text-sm text-[#6C7568]">{project ? projectLabel(project) : 'Project unavailable'}</p><p className="mt-1 text-xs text-[#6C7568]">Measurement date: {new Date().toLocaleDateString()}</p></Card>
            <Card>
              <h3 className="text-sm font-bold text-[#12332D]">BOQ / Work Package</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Select label="BOQ Item" value={form.boqItemId} onChange={(event) => updateField('boqItemId', event.target.value)} options={[{ value: '', label: boqItems.length ? 'Select BOQ item' : 'No BOQ items available' }, ...boqItems.map((item) => ({ value: item.id, label: `${item.item_number || item.item_code || 'Item'} - ${item.description} (${item.unit})` }))]} disabled={!boqItems.length} />
                <Select label="Work Package / Scope" value={form.workPackageRef} onChange={(event) => updateField('workPackageRef', event.target.value)} options={[{ value: '', label: hasEntireProjectScope ? 'Entire project scope' : 'Select work package' }, ...workPackageOptions.map((scope) => ({ value: scope.work_package_ref as string, label: scope.work_package_ref as string }))]} disabled={hasEntireProjectScope && !workPackageOptions.length} />
              </div>
              {selectedBoqItem && <p className="mt-3 text-xs text-[#6C7568]">Available: {selectedBoqItem.quantity} {selectedBoqItem.unit} · Completed: {selectedBoqItem.completed_quantity} {selectedBoqItem.unit} · Rate: {selectedBoqItem.rate}</p>}
              {!scopes.length && <p className="mt-3 text-sm text-[#B42318]">No active Surveyor scope is available for this project.</p>}
            </Card>
            <Card>
              <h3 className="text-sm font-bold text-[#12332D]">Survey Evidence</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Input label="MB Number" value={form.mbNumber} onChange={(event) => updateField('mbNumber', event.target.value)} placeholder="Measurement book number" />
                <Input label="Chainage" value={form.chainage} onChange={(event) => updateField('chainage', event.target.value)} placeholder="e.g. 0+500 to 0+850" />
                <Input label="TBM Reference" value={form.tbmReference} onChange={(event) => updateField('tbmReference', event.target.value)} placeholder="TBM reference" />
                <Input label="Benchmark RL" type="number" step="any" value={form.benchmarkRl} onChange={(event) => updateField('benchmarkRl', event.target.value)} />
                <Input label="Backsight" type="number" step="any" value={form.backsight} onChange={(event) => updateField('backsight', event.target.value)} />
                <Input label="Intermediate Sight" type="number" step="any" value={form.intermediateSight} onChange={(event) => updateField('intermediateSight', event.target.value)} />
                <Input label="Foresight" type="number" step="any" value={form.foresight} onChange={(event) => updateField('foresight', event.target.value)} />
                <Select label="Measurement Source" value="manual" options={[{ value: 'manual', label: 'Manual TBM' }]} disabled />
              </div>
              <Textarea className="mt-3" label="Remarks" value={form.remarks} onChange={(event) => updateField('remarks', event.target.value)} placeholder="Survey remarks" />
            </Card>
            <Card>
              <h3 className="text-sm font-bold text-[#12332D]">Measurement Dimensions</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Input label="Length" type="number" min="0" step="any" value={form.length} onChange={(event) => updateField('length', event.target.value)} />
                <Input label="Width" type="number" min="0" step="any" value={form.width} onChange={(event) => updateField('width', event.target.value)} />
                <Input label="Depth" type="number" min="0" step="any" value={form.depth} onChange={(event) => updateField('depth', event.target.value)} />
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <h3 className="text-sm font-bold text-[#12332D]">Review Calculated Quantity</h3>
              <p className="mt-3 text-xs text-[#6C7568]">Server formula: length × width × depth</p>
              <p className="mt-2 text-3xl font-bold text-[#005F56]">{calculatedQuantity === null ? '--' : calculatedQuantity.toFixed(3)}</p>
              <p className="mt-1 text-xs text-[#6C7568]">The RPC result is authoritative.</p>
              {saveError && <p className="mt-4 text-sm text-[#B42318]">{saveError}</p>}
              <Button className="mt-5 w-full" variant="primary" icon={saving ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />} onClick={saveDraft} disabled={saving || !project || !boqItems.length || !scopes.length}>{saving ? 'Saving Draft...' : 'Save Measurement Draft'}</Button>
            </Card>
            {savedDraft && <Card className="border-[#0B8B7D]/30"><div className="flex items-center gap-2 text-sm font-bold text-[#005F56]"><CheckCircle2 size={16} /> Measurement draft saved</div><dl className="mt-4 space-y-2 text-xs text-[#6C7568]"><div className="flex justify-between gap-3"><dt>ID</dt><dd className="font-mono text-right">{String(savedDraft.id || 'Unavailable')}</dd></div><div className="flex justify-between gap-3"><dt>Status</dt><dd className="font-bold text-[#005F56]">{String(savedDraft.status || 'draft')}</dd></div><div className="flex justify-between gap-3"><dt>Quantity</dt><dd>{String(savedDraft.calculated_quantity || calculatedQuantity || '')}</dd></div><div className="flex justify-between gap-3"><dt>Source</dt><dd>{String(savedDraft.measurement_source || 'manual')}</dd></div></dl></Card>}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
