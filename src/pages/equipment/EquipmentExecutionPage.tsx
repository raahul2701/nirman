import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Fuel,
  Gauge,
  Plus,
  Route,
  Truck,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { useEquipmentExecution, type EquipmentViewTab } from '../../hooks/useEquipmentExecution';
import { EQUIPMENT_CODE_PATTERN, normalizeEquipmentCode, type EquipmentDeploymentRecord, type EquipmentExecutionLogRecord } from '../../services/contractorEquipmentService';

const TABS: { id: EquipmentViewTab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'assets', label: 'Assets' },
];

const EQUIPMENT_TYPES = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'jcb', label: 'JCB / Backhoe Loader' },
  { value: 'tipper', label: 'Tipper / Dumper' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'concrete_mixer', label: 'Concrete Mixer' },
  { value: 'vibrator', label: 'Needle Vibrator' },
  { value: 'roller', label: 'Road Roller' },
  { value: 'grader', label: 'Grader' },
  { value: 'crane', label: 'Crane' },
  { value: 'generator', label: 'Generator' },
  { value: 'water_tanker', label: 'Water Tanker' },
  { value: 'paver', label: 'Paver' },
  { value: 'other', label: 'Other' },
];

const EXECUTION_STATUSES = [
  { value: 'working', label: 'Working' },
  { value: 'idle', label: 'Idle' },
  { value: 'breakdown', label: 'Breakdown' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    working: 'text-emerald-300',
    idle: 'text-amber-300',
    breakdown: 'text-red-300',
    active: 'text-emerald-300',
    inactive: 'text-[#808080]',
    ended: 'text-[#808080]',
  };
  return <span className={styles[status] ?? 'text-[#A0A0A0]'}>{status}</span>;
}

function equipmentLabel(log: EquipmentExecutionLogRecord) {
  return log.equipment_assets?.name || 'Equipment';
}

function deploymentLabel(deployment: EquipmentDeploymentRecord) {
  return deployment.equipment_assets?.name || 'Equipment';
}

export function EquipmentExecutionPage() {
  const equipment = useEquipmentExecution();
  const [tab, setTab] = useState<EquipmentViewTab>('today');

  return (
    <AppLayout title="Plant & Equipment Execution" subtitle="Record daily equipment usage, running hours, KM and fuel for your assigned projects.">
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-end gap-3">
          <div className="w-full max-w-xs">
            <Select
              label="Project"
              value={equipment.selectedProjectId}
              onChange={(event) => equipment.setSelectedProjectId(event.target.value)}
              options={[
                { value: '', label: 'Select project' },
                ...equipment.projects.map((project) => ({ value: project.id, label: project.label })),
              ]}
            />
          </div>
        </header>

        {equipment.error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{equipment.error}</p>}

        <nav className="flex gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === item.id ? 'bg-[#005F56] text-white' : 'border border-[#303030] text-[#A0A0A0] hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {equipment.loading ? (
          <p className="py-10 text-center text-sm text-[#A0A0A0]">Loading equipment execution…</p>
        ) : !equipment.selectedProject ? (
          <div className="py-12 text-center text-[#A0A0A0]">
            <Truck className="mx-auto mb-3 text-[#606060]" size={38} />
            <p>No active or pilot project assignment is available for equipment execution.</p>
          </div>
        ) : tab === 'today' ? (
          <TodayView equipment={equipment} />
        ) : tab === 'history' ? (
          <HistoryView equipment={equipment} />
        ) : (
          <AssetsView equipment={equipment} />
        )}
      </div>
    </AppLayout>
  );
}

type EquipmentHook = ReturnType<typeof useEquipmentExecution>;

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-4">
      <div className="flex items-center gap-2 text-[#A0A0A0]"><span className="text-[#C89B3C]">{icon}</span><span className="text-xs uppercase tracking-wide">{label}</span></div>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

const emptyExecutionForm = {
  assetId: '',
  executionDate: todayStr(),
  startHour: '',
  endHour: '',
  startKm: '',
  endKm: '',
  fuel: '',
  operator: '',
  activity: '',
  status: 'working',
  chainageFrom: '',
  chainageTo: '',
  remarks: '',
};

function TodayView({ equipment }: { equipment: EquipmentHook }) {
  const [form, setForm] = useState(emptyExecutionForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const reading = form.assetId ? equipment.latestReadings.get(form.assetId) : undefined;

  function selectAsset(assetId: string) {
    const baseline = equipment.latestReadings.get(assetId);
    setForm((current) => ({
      ...current,
      assetId,
      startHour: baseline ? String(baseline.hourMeter) : current.startHour,
      startKm: baseline ? String(baseline.km) : current.startKm,
    }));
  }

  const loggedAssetIds = new Set(equipment.todayLogs.map((log) => log.equipment_asset_id));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError('');
    setSuccess('');
    const startHour = parseNumber(form.startHour);
    const endHour = parseNumber(form.endHour);
    const startKm = parseNumber(form.startKm);
    const endKm = parseNumber(form.endKm);
    const fuel = parseNumber(form.fuel);
    if (!form.assetId) { setFormError('Select deployed equipment.'); return; }
    if (!form.executionDate) { setFormError('Execution date is required.'); return; }
    if (form.executionDate > todayStr()) { setFormError('Execution date cannot be in the future.'); return; }
    if (startHour === null || endHour === null || startKm === null || endKm === null) { setFormError('Opening and closing hour meter and KM readings are required.'); return; }
    if (endHour < startHour) { setFormError('Closing hour meter cannot be behind the opening reading.'); return; }
    if (endKm < startKm) { setFormError('Closing KM cannot be behind the opening reading.'); return; }
    if (fuel !== null && fuel < 0) { setFormError('Fuel used cannot be negative.'); return; }

    setSubmitting(true);
    try {
      const photoUrls = photos.length > 0 ? await equipment.uploadPhotos(photos) : [];
      const result = await equipment.recordExecution({
        equipment_asset_id: form.assetId,
        execution_date: form.executionDate,
        start_hour_meter: startHour,
        end_hour_meter: endHour,
        start_km: startKm,
        end_km: endKm,
        fuel_used_litres: fuel,
        operator_name: form.operator.trim(),
        activity: form.activity.trim(),
        status: form.status as 'working' | 'idle' | 'breakdown',
        chainage_from: form.chainageFrom.trim(),
        chainage_to: form.chainageTo.trim(),
        remarks: form.remarks.trim(),
        photos: photoUrls,
      });
      setSuccess(`Execution recorded — running hours ${formatNumber(result.running_hours)}, KM travelled ${formatNumber(result.km_travelled)}.`);
      setForm({ ...emptyExecutionForm, executionDate: form.executionDate });
      setPhotos([]);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Could not record the execution.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<Truck size={14} />} label="Deployed" value={String(equipment.kpis.deployedCount)} />
        <KpiCard icon={<ClipboardList size={14} />} label="Logged today" value={String(equipment.kpis.loggedCount)} />
        <KpiCard icon={<Gauge size={14} />} label="Running hours" value={formatNumber(equipment.kpis.runningHours)} />
        <KpiCard icon={<Route size={14} />} label="KM travelled" value={formatNumber(equipment.kpis.kmTravelled)} />
        <KpiCard icon={<Fuel size={14} />} label="Fuel (L)" value={formatNumber(equipment.kpis.fuelUsed)} />
      </section>

      <section className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Deployed equipment</h2>
        {equipment.todayDeployments.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#A0A0A0]">No active deployments for this project. Deploy equipment from the Assets tab.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#303030] text-xs uppercase text-[#808080]">
                <tr><th className="pb-3 pr-4">Equipment</th><th className="pb-3 pr-4">Code</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Registration</th><th className="pb-3 pr-4">Deployed on</th><th className="pb-3 pr-4">Last meter (hrs / KM)</th><th className="pb-3">Today</th></tr>
              </thead>
              <tbody>
                {equipment.todayDeployments.map((deployment) => {
                  const baseline = equipment.latestReadings.get(deployment.equipment_asset_id);
                  return (
                    <tr key={deployment.id} className="border-b border-[#303030] text-[#D0D0D0] last:border-0">
                      <td className="py-3 pr-4 font-medium text-white">{deploymentLabel(deployment)}</td>
                      <td className="py-3 pr-4">{deployment.equipment_assets?.equipment_code || '—'}</td>
                      <td className="py-3 pr-4">{deployment.equipment_assets?.equipment_type || '—'}</td>
                      <td className="py-3 pr-4">{deployment.equipment_assets?.registration_number || '—'}</td>
                      <td className="py-3 pr-4">{deployment.deployed_on}</td>
                      <td className="py-3 pr-4">{baseline ? `${formatNumber(baseline.hourMeter)} / ${formatNumber(baseline.km)}` : '—'}</td>
                      <td className="py-3">{loggedAssetIds.has(deployment.equipment_asset_id) ? <span className="text-emerald-300">Logged</span> : <span className="text-amber-300">Pending</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Plus size={14} className="text-[#C89B3C]" /> Record execution</h2>
        {success && <p className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{success}</p>}
        {formError && <p className="mb-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{formError}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Equipment"
              value={form.assetId}
              onChange={(event) => selectAsset(event.target.value)}
              options={[
                { value: '', label: 'Select deployed equipment' },
                ...equipment.todayDeployments.map((deployment) => ({
                  value: deployment.equipment_asset_id,
                  label: deploymentLabel(deployment) + (loggedAssetIds.has(deployment.equipment_asset_id) ? ' (already logged today)' : ''),
                })),
              ]}
            />
            <Input label="Execution date" type="date" max={todayStr()} value={form.executionDate} onChange={(event) => setForm((current) => ({ ...current, executionDate: event.target.value }))} required />
            <Select label="Status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} options={EXECUTION_STATUSES} />
            <Input label={`Opening hour meter${reading ? ` (last ${formatNumber(reading.hourMeter)})` : ''}`} type="number" min="0" step="0.01" value={form.startHour} onChange={(event) => setForm((current) => ({ ...current, startHour: event.target.value }))} required />
            <Input label="Closing hour meter" type="number" min="0" step="0.01" value={form.endHour} onChange={(event) => setForm((current) => ({ ...current, endHour: event.target.value }))} required />
            <Input label={`Opening KM${reading ? ` (last ${formatNumber(reading.km)})` : ''}`} type="number" min="0" step="0.01" value={form.startKm} onChange={(event) => setForm((current) => ({ ...current, startKm: event.target.value }))} required />
            <Input label="Closing KM" type="number" min="0" step="0.01" value={form.endKm} onChange={(event) => setForm((current) => ({ ...current, endKm: event.target.value }))} required />
            <Input label="Fuel used (litres)" type="number" min="0" step="0.01" value={form.fuel} onChange={(event) => setForm((current) => ({ ...current, fuel: event.target.value }))} />
            <Input label="Operator" value={form.operator} onChange={(event) => setForm((current) => ({ ...current, operator: event.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Activity" value={form.activity} onChange={(event) => setForm((current) => ({ ...current, activity: event.target.value }))} placeholder="e.g. Earthwork in cutting" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Chainage from" value={form.chainageFrom} onChange={(event) => setForm((current) => ({ ...current, chainageFrom: event.target.value }))} placeholder="KM 12+400" />
              <Input label="Chainage to" value={form.chainageTo} onChange={(event) => setForm((current) => ({ ...current, chainageTo: event.target.value }))} placeholder="KM 13+000" />
            </div>
          </div>
          <Textarea label="Remarks" rows={3} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
          <div>
            <label className="text-[#6C7568] text-xs font-medium">Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
              className="mt-1 w-full rounded-lg border border-[#DDD4B9] px-3 py-2 text-sm text-[#12332D]"
            />
            {photos.length > 0 && <p className="mt-1 text-xs text-[#A0A0A0]">{photos.length} photo(s) will be uploaded.</p>}
          </div>
          <Button type="submit" variant="primary" loading={submitting} icon={<Plus size={14} />}>Record execution</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Today&apos;s recorded usage</h2>
        {equipment.todayLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#A0A0A0]">No executions recorded today for this project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#303030] text-xs uppercase text-[#808080]">
                <tr><th className="pb-3 pr-4">Equipment</th><th className="pb-3 pr-4">Operator</th><th className="pb-3 pr-4">Running hours</th><th className="pb-3 pr-4">KM</th><th className="pb-3 pr-4">Fuel (L)</th><th className="pb-3">Status</th></tr>
              </thead>
              <tbody>
                {equipment.todayLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[#303030] text-[#D0D0D0] last:border-0">
                    <td className="py-3 pr-4 font-medium text-white">{equipmentLabel(log)}</td>
                    <td className="py-3 pr-4">{log.operator_name || '—'}</td>
                    <td className="py-3 pr-4">{formatNumber(log.running_hours)}</td>
                    <td className="py-3 pr-4">{formatNumber(log.km_travelled)}</td>
                    <td className="py-3 pr-4">{formatNumber(log.fuel_used_litres)}</td>
                    <td className="py-3"><StatusBadge status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryView({ equipment }: { equipment: EquipmentHook }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');

  const rows = equipment.projectLogs.filter((log) => !dateFilter || log.execution_date === dateFilter);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Execution history</h2>
          <div className="w-full max-w-[220px]">
            <Input label="Filter by date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#A0A0A0]">No execution history for this project yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[#303030] text-xs uppercase text-[#808080]">
                <tr>
                  <th className="w-8 pb-3" aria-label="Expand" />
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Equipment</th>
                  <th className="pb-3 pr-4">Operator</th>
                  <th className="pb-3 pr-4">Running hours</th>
                  <th className="pb-3 pr-4">KM</th>
                  <th className="pb-3 pr-4">Fuel (L)</th>
                  <th className="pb-3 pr-4">Activity</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <HistoryRow
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId((current) => (current === log.id ? null : log.id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ log, expanded, onToggle }: { log: EquipmentExecutionLogRecord; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer border-b border-[#303030] text-[#D0D0D0]" onClick={onToggle}>
        <td className="py-3 pr-2 text-[#808080]">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
        <td className="py-3 pr-4">{log.execution_date}</td>
        <td className="py-3 pr-4 font-medium text-white">{equipmentLabel(log)}</td>
        <td className="py-3 pr-4">{log.operator_name || '—'}</td>
        <td className="py-3 pr-4">{formatNumber(log.running_hours)}</td>
        <td className="py-3 pr-4">{formatNumber(log.km_travelled)}</td>
        <td className="py-3 pr-4">{formatNumber(log.fuel_used_litres)}</td>
        <td className="py-3 pr-4">{log.activity || '—'}</td>
        <td className="py-3"><StatusBadge status={log.status} /></td>
      </tr>
      {expanded && (
        <tr className="border-b border-[#303030] bg-[#111111]">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p className="text-[#808080] text-xs uppercase tracking-wide">Chainage</p>
                <p className="text-[#D0D0D0]">{log.chainage_from || log.chainage_to ? `${log.chainage_from || '—'} → ${log.chainage_to || '—'}` : '—'}</p>
                <p className="text-[#808080] text-xs uppercase tracking-wide">Meter readings</p>
                <p className="text-[#D0D0D0]">Hours {formatNumber(log.start_hour_meter)} → {formatNumber(log.end_hour_meter)} · KM {formatNumber(log.start_km)} → {formatNumber(log.end_km)}</p>
                <p className="text-[#808080] text-xs uppercase tracking-wide">Remarks</p>
                <p className="text-[#D0D0D0]">{log.remarks || '—'}</p>
              </div>
              <div>
                <p className="text-[#808080] text-xs uppercase tracking-wide">Photos</p>
                {log.photos.length === 0 ? (
                  <p className="mt-2 text-sm text-[#D0D0D0]">—</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {log.photos.map((url) => (
                      <img key={url} src={url} alt="Execution" className="h-20 w-20 rounded-lg border border-[#303030] object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const emptyAssetForm = { equipmentCode: '', name: '', equipmentType: 'excavator', registrationNumber: '', initialHour: '', initialKm: '', notes: '' };
const emptyDeployForm = { assetId: '', deployedOn: todayStr(), notes: '' };

function AssetsView({ equipment }: { equipment: EquipmentHook }) {
  const [showRegister, setShowRegister] = useState(false);
  const [assetForm, setAssetForm] = useState(emptyAssetForm);
  const [deployForm, setDeployForm] = useState(emptyDeployForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const activelyDeployedAssetIds = new Set(
    equipment.deployments.filter((deployment) => deployment.status === 'active').map((deployment) => deployment.equipment_asset_id),
  );
  const deployableAssets = equipment.assets.filter((asset) => asset.status === 'active' && !activelyDeployedAssetIds.has(asset.id));

  function projectLabel(projectId: string | null) {
    if (!projectId) return '—';
    return equipment.projects.find((project) => project.id === projectId)?.label || projectId.slice(0, 8);
  }

  async function registerAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError('');
    setSuccess('');
    const initialHour = parseNumber(assetForm.initialHour) ?? 0;
    const initialKm = parseNumber(assetForm.initialKm) ?? 0;
    const equipmentCode = normalizeEquipmentCode(assetForm.equipmentCode);
    if (!assetForm.name.trim()) { setFormError('Equipment name is required.'); return; }
    if (!equipmentCode) { setFormError('Equipment code is required (e.g. EQ-014).'); return; }
    if (!EQUIPMENT_CODE_PATTERN.test(equipmentCode)) { setFormError('Equipment code must use the format EQ-014 (EQ- followed by exactly 3 digits).'); return; }
    if (initialHour < 0 || initialKm < 0) { setFormError('Initial meter readings cannot be negative.'); return; }
    setSubmitting(true);
    try {
      await equipment.registerAsset({
        name: assetForm.name,
        equipment_code: equipmentCode,
        equipment_type: assetForm.equipmentType,
        registration_number: assetForm.registrationNumber,
        initial_hour_meter: initialHour,
        initial_km: initialKm,
        notes: assetForm.notes,
      });
      setSuccess(`Equipment "${assetForm.name.trim()}" registered.`);
      setAssetForm(emptyAssetForm);
      setShowRegister(false);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Could not register the equipment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(assetId: string, next: 'active' | 'inactive') {
    setFormError('');
    try {
      await equipment.toggleAssetStatus(assetId, next);
    } catch (toggleError) {
      setFormError(toggleError instanceof Error ? toggleError.message : 'Could not update the equipment status.');
    }
  }

  async function deployAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFormError('');
    setSuccess('');
    if (!deployForm.assetId) { setFormError('Select equipment to deploy.'); return; }
    if (!equipment.selectedProject) { setFormError('Select a project first.'); return; }
    if (!deployForm.deployedOn) { setFormError('Deployment date is required.'); return; }
    setSubmitting(true);
    try {
      await equipment.deployAsset({
        equipment_asset_id: deployForm.assetId,
        project_id: equipment.selectedProject.id,
        deployed_on: deployForm.deployedOn,
        notes: deployForm.notes,
      });
      setSuccess('Equipment deployed to the project.');
      setDeployForm({ ...emptyDeployForm, deployedOn: todayStr() });
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Could not deploy the equipment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function endDeployment(deploymentId: string) {
    setFormError('');
    try {
      await equipment.endDeployment(deploymentId);
      setSuccess('Deployment ended.');
    } catch (endError) {
      setFormError(endError instanceof Error ? endError.message : 'Could not end the deployment.');
    }
  }

  return (
    <div className="space-y-5">
      {success && <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{success}</p>}
      {formError && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{formError}</p>}

      <section className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Equipment register</h2>
          <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setShowRegister((current) => !current)}>
            {showRegister ? 'Close' : 'Register equipment'}
          </Button>
        </div>
        {showRegister && (
          <form onSubmit={registerAsset} className="mb-4 space-y-3 rounded-xl border border-[#303030] bg-[#111111] p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Equipment name" value={assetForm.name} onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))} required placeholder="e.g. JCB 3DX" />
              <Input label="Equipment code" value={assetForm.equipmentCode} onChange={(event) => setAssetForm((current) => ({ ...current, equipmentCode: event.target.value }))} required placeholder="e.g. EQ-014" />
              <Select label="Type" value={assetForm.equipmentType} onChange={(event) => setAssetForm((current) => ({ ...current, equipmentType: event.target.value }))} options={EQUIPMENT_TYPES} />
              <Input label="Registration number" value={assetForm.registrationNumber} onChange={(event) => setAssetForm((current) => ({ ...current, registrationNumber: event.target.value }))} placeholder="e.g. RJ14 CD 1234" />
              <Input label="Initial hour meter" type="number" min="0" step="0.01" value={assetForm.initialHour} onChange={(event) => setAssetForm((current) => ({ ...current, initialHour: event.target.value }))} />
              <Input label="Initial KM" type="number" min="0" step="0.01" value={assetForm.initialKm} onChange={(event) => setAssetForm((current) => ({ ...current, initialKm: event.target.value }))} />
              <Input label="Notes" value={assetForm.notes} onChange={(event) => setAssetForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <Button type="submit" variant="primary" loading={submitting} icon={<Plus size={14} />}>Register equipment</Button>
          </form>
        )}
        {equipment.assets.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#A0A0A0]">No equipment registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-[#303030] text-xs uppercase text-[#808080]">
                <tr><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Code</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Registration</th><th className="pb-3 pr-4">Initial meters (hrs / KM)</th><th className="pb-3 pr-4">Deployment</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr>
              </thead>
              <tbody>
                {equipment.assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-[#303030] text-[#D0D0D0] last:border-0">
                    <td className="py-3 pr-4 font-medium text-white">{asset.name}</td>
                    <td className="py-3 pr-4">{asset.equipment_code}</td>
                    <td className="py-3 pr-4">{EQUIPMENT_TYPES.find((type) => type.value === asset.equipment_type)?.label || asset.equipment_type}</td>
                    <td className="py-3 pr-4">{asset.registration_number || '—'}</td>
                    <td className="py-3 pr-4">{formatNumber(asset.initial_hour_meter)} / {formatNumber(asset.initial_km)}</td>
                    <td className="py-3 pr-4">{activelyDeployedAssetIds.has(asset.id) ? <span className="text-emerald-300">Deployed</span> : <span className="text-[#808080]">Available</span>}</td>
                    <td className="py-3 pr-4"><StatusBadge status={asset.status} /></td>
                    <td className="py-3">
                      {asset.status === 'active'
                        ? <Button size="sm" variant="ghost" onClick={() => void toggleStatus(asset.id, 'inactive')}>Deactivate</Button>
                        : <Button size="sm" variant="outline" onClick={() => void toggleStatus(asset.id, 'active')}>Activate</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#303030] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Deploy equipment to project</h2>
        <form onSubmit={deployAsset} className="mb-4 space-y-3 rounded-xl border border-[#303030] bg-[#111111] p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Equipment"
              value={deployForm.assetId}
              onChange={(event) => setDeployForm((current) => ({ ...current, assetId: event.target.value }))}
              options={[
                { value: '', label: 'Select equipment' },
                ...deployableAssets.map((asset) => ({ value: asset.id, label: `${asset.equipment_code} · ${asset.name}` })),
              ]}
            />
            <Select
              label="Project"
              value={equipment.selectedProjectId}
              onChange={(event) => equipment.setSelectedProjectId(event.target.value)}
              options={[
                { value: '', label: 'Select project' },
                ...equipment.projects.map((project) => ({ value: project.id, label: project.label })),
              ]}
            />
            <Input label="Deployed on" type="date" value={deployForm.deployedOn} onChange={(event) => setDeployForm((current) => ({ ...current, deployedOn: event.target.value }))} required />
            <Input label="Notes" value={deployForm.notes} onChange={(event) => setDeployForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <Button type="submit" variant="primary" loading={submitting} icon={<Truck size={14} />}>Deploy equipment</Button>
        </form>

        <h3 className="mb-3 text-sm font-semibold text-white">Deployments</h3>
        {equipment.deployments.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#A0A0A0]">No deployments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[#303030] text-xs uppercase text-[#808080]">
                <tr><th className="pb-3 pr-4">Equipment</th><th className="pb-3 pr-4">Code</th><th className="pb-3 pr-4">Project</th><th className="pb-3 pr-4">Deployed on</th><th className="pb-3 pr-4">Ended on</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr>
              </thead>
              <tbody>
                {equipment.deployments.map((deployment) => (
                  <tr key={deployment.id} className="border-b border-[#303030] text-[#D0D0D0] last:border-0">
                    <td className="py-3 pr-4 font-medium text-white">{deploymentLabel(deployment)}</td>
                    <td className="py-3 pr-4">{deployment.equipment_assets?.equipment_code || '—'}</td>
                    <td className="py-3 pr-4">{projectLabel(deployment.project_id)}</td>
                    <td className="py-3 pr-4">{deployment.deployed_on}</td>
                    <td className="py-3 pr-4">{deployment.ended_on || '—'}</td>
                    <td className="py-3 pr-4"><StatusBadge status={deployment.status} /></td>
                    <td className="py-3">
                      {deployment.status === 'active' && (
                        <Button size="sm" variant="danger" onClick={() => void endDeployment(deployment.id)}>End deployment</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}