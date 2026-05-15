import { useState } from 'react';
import { useToast } from '../../components/ui/useToast';
import { AppLayout } from '../../components/layout/AppLayout';
import { buildStoragePath, compressImage, uploadFileWithRetry } from '../../services/storageService';
import { saveOfflineEntry } from '../../services/offline/offlineStorage';
import { useAuth } from '../../contexts/useAuth';

export function DieselIssue() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
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
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, bill_photo: file }));
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

    if (!navigator.onLine) {
      await saveOfflineEntry({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        action: 'insert',
        table: 'diesel_entries',
        payload: entry,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });
      setSubmitting(false);
      toast('Offline: diesel entry saved locally and will sync automatically.', 'success');
      setForm({
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
        bill_photo: null,
        remarks: '',
      });
      return;
    }

    const { error } = await import('../../lib/supabase').then(({ supabase }) => supabase.from('diesel_entries').insert(entry));
    setSubmitting(false);

    if (error) {
      toast('Failed to submit diesel entry', 'error');
      return;
    }

    setForm({
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
      bill_photo: null,
      remarks: '',
    });
    toast('Diesel entry recorded successfully', 'success');
  }

  return (
    <AppLayout title="Diesel Entry" subtitle="Submit daily diesel consumption and operator reports">
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
          ].map((field) => (
            <label key={field.name} className="block text-sm text-slate-300">
              {field.label}
              <input
                type={field.type}
                value={(form as any)[field.name]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
                placeholder={field.label}
              />
            </label>
          ))}
          <label className="block text-sm text-slate-300">
            Bill / Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
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
        <button
          disabled={submitting}
          onClick={submitIssue}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-white font-semibold disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Diesel Entry'}
        </button>
      </div>
    </AppLayout>
  );
}
