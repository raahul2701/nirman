import { useState } from 'react';
import { useToast } from '../../components/ui/useToast';
import { AppLayout } from '../../components/layout/AppLayout';
import { buildStoragePath, compressImage, uploadFileWithRetry } from '../../services/storageService';
import { useAuth } from '../../contexts/useAuth';
import { analyzeDieselAnomalies } from '../../services/ai/constructionAI';
import { dieselLogsService } from '../../services/data/dieselLogsService';
import { OfflineSyncIndicator } from '../../components/offline/OfflineSyncIndicator';

const DEFAULT_PROJECT_ID = 'project-1';
type DieselFormTextField = Exclude<keyof ReturnType<typeof createEmptyDieselForm>, 'bill_photo' | 'operator_photo' | 'receiver_photo' | 'vehicle_photo'>;

function createEmptyDieselForm() {
  return {
    machine_name: '',
    machine_type: '',
    machine_id: '',
    operator_name: '',
    opening_diesel: '',
    diesel_received: '',
    diesel_used: '',
    closing_diesel: '',
    running_hours: '',
    expected_consumption: '',
    actual_consumption: '',
    bill_photo: null as File | null,
    operator_photo: null as File | null,
    receiver_photo: null as File | null,
    vehicle_photo: null as File | null,
    remarks: '',
  };
}

export function DieselIssue() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(createEmptyDieselForm);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, bill_photo: file }));
  }

  async function runAiCheck() {
    setAiLoading(true);
    try {
      setAiResult(await analyzeDieselAnomalies({
        machineName: form.machine_name,
        machineType: form.machine_type,
        machineId: form.machine_id,
        operatorName: form.operator_name,
        openingDiesel: form.opening_diesel,
        dieselReceived: form.diesel_received,
        dieselUsed: form.diesel_used,
        closingDiesel: form.closing_diesel,
        runningHours: form.running_hours,
        expectedConsumption: form.expected_consumption,
        actualConsumption: form.actual_consumption,
        receiverPhoto: form.receiver_photo ? 'captured' : 'missing',
        selfieVerification: form.operator_photo ? 'captured' : 'missing',
        vehicleCapture: form.vehicle_photo ? 'captured' : 'missing',
        remarks: form.remarks,
      }));
    } catch (error) {
      setAiResult(error instanceof Error ? error.message : 'AI anomaly check failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function submitIssue() {
    if (!user) return;
    setSubmitting(true);

    const billPhotoUrl = form.bill_photo && navigator.onLine
      ? (() => {
          const file = form.bill_photo as File;
          const cleanedName = buildStoragePath('diesel', file.name);
          return compressImage(file)
            .then((compressed) => uploadFileWithRetry('diesel', cleanedName, compressed, { upsert: true }))
            .then((data) => data.path as string)
            .catch(() => null);
        })()
      : Promise.resolve(null as string | null);

    const uploadedBillPhotoUrl = await billPhotoUrl;

    const entry = {
      site_id: null,
      project_id: null,
      machine_name: form.machine_name,
      machine_type: form.machine_type,
      machine_id: form.machine_id || null,
      operator_name: form.operator_name || null,
      opening_diesel: Number(form.opening_diesel) || 0,
      diesel_received: Number(form.diesel_received) || 0,
      diesel_used: Number(form.diesel_used) || 0,
      closing_diesel: Number(form.closing_diesel) || 0,
      running_hours: Number(form.running_hours) || 0,
      expected_consumption: Number(form.expected_consumption) || 0,
      actual_consumption: Number(form.actual_consumption) || 0,
      bill_photo_url: uploadedBillPhotoUrl,
      remarks: form.remarks || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('nirman:diesel-capture-meta', JSON.stringify({
      operator_photo: form.operator_photo?.name || null,
      receiver_photo: form.receiver_photo?.name || null,
      vehicle_photo: form.vehicle_photo?.name || null,
      preparedAt: new Date().toISOString(),
    }));

    try {
      await dieselLogsService.createLog({
        id: crypto.randomUUID(),
        project_id: DEFAULT_PROJECT_ID,
        vehicle_id: form.machine_id || undefined,
        log: {
          ...entry,
          operator_photo: form.operator_photo?.name || null,
          receiver_photo: form.receiver_photo?.name || null,
          vehicle_photo: form.vehicle_photo?.name || null,
        },
        consumption: Number(form.actual_consumption) || Number(form.diesel_used) || 0,
        created_by: user.id,
      });
    } catch (error) {
      setSubmitting(false);
      toast(error instanceof Error ? error.message : 'Failed to queue diesel entry', 'error');
      return;
    }

    setSubmitting(false);

    setForm(createEmptyDieselForm());
    toast(navigator.onLine ? 'Diesel entry recorded successfully' : 'Offline: diesel entry queued for sync.', 'success');
  }

  return (
    <AppLayout title="Diesel Entry" subtitle="Submit daily diesel consumption and operator reports">
      <div className="mb-4 flex justify-end">
        <OfflineSyncIndicator />
      </div>
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { label: 'Machine Name', name: 'machine_name', type: 'text' },
            { label: 'Machine Type', name: 'machine_type', type: 'text' },
            { label: 'Machine ID', name: 'machine_id', type: 'text' },
            { label: 'Operator Name', name: 'operator_name', type: 'text' },
            { label: 'Opening Diesel (L)', name: 'opening_diesel', type: 'number' },
            { label: 'Diesel Received (L)', name: 'diesel_received', type: 'number' },
            { label: 'Diesel Used (L)', name: 'diesel_used', type: 'number' },
            { label: 'Closing Diesel (L)', name: 'closing_diesel', type: 'number' },
            { label: 'Running Hours', name: 'running_hours', type: 'number' },
            { label: 'Expected Consumption', name: 'expected_consumption', type: 'number' },
            { label: 'Actual Consumption', name: 'actual_consumption', type: 'number' },
          ].map((field) => {
            const fieldName = field.name as DieselFormTextField;
            return (
            <label key={field.name} className="block text-sm text-slate-300">
              {field.label}
              <input
                type={field.type}
                value={form[fieldName]}
                onChange={(e) => setForm((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                placeholder={field.label}
              />
            </label>
          )})}
          <label className="block text-sm text-slate-300">
            Diesel Bill / Issue Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Operator Selfie Verification
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setForm((prev) => ({ ...prev, operator_photo: event.target.files?.[0] || null }))}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Receiver Photo
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setForm((prev) => ({ ...prev, receiver_photo: event.target.files?.[0] || null }))}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Vehicle Number / OCR-ready Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setForm((prev) => ({ ...prev, vehicle_photo: event.target.files?.[0] || null }))}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300 lg:col-span-2">
            Remarks
            <textarea
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
              className="mt-2 w-full min-h-[120px] rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none"
              placeholder="Add notes for supervisors or site auditors"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={aiLoading}
          onClick={runAiCheck}
          className="rounded-2xl border border-orange-500/40 px-5 py-3 text-orange-300 font-semibold disabled:opacity-50"
        >
          {aiLoading ? 'Checking...' : 'AI Anomaly Check'}
        </button>
        <button
          disabled={submitting}
          onClick={submitIssue}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Diesel Entry'}
        </button>
        </div>
        {aiResult && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300 whitespace-pre-wrap">
            {aiResult}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
