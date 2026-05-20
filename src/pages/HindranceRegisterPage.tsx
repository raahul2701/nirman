import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Camera, Download, FileText, MapPin, Plus, Trash2, Zap } from 'lucide-react';
import { analyzeHindranceImpact } from '../services/ai/constructionAI';
import { useHindranceEntries } from '../hooks/useDataServices';
import { hindranceService } from '../services/data/hindranceService';
import { OfflineSyncIndicator } from '../components/offline/OfflineSyncIndicator';
import { useAuth } from '../contexts/useAuth';

const DEFAULT_PROJECT_ID = 'project-1';

type Hindrance = {
  id: string;
  title: string;
  party: string;
  duration: string;
  location: string;
  description: string;
  photo?: File;
  aiImpact?: string;
};

export const HindranceRegisterPage: React.FC = () => {
  const { user } = useAuth();
  const { entries: persistedEntries } = useHindranceEntries(DEFAULT_PROJECT_ID);
  const [showForm, setShowForm] = useState(false);
  const [entries, setEntries] = useState<Hindrance[]>([]);
  const [form, setForm] = useState({ title: '', party: '', duration: '', location: '', description: '', photo: undefined as File | undefined });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const photoPreview = useMemo(() => form.photo ? URL.createObjectURL(form.photo) : '', [form.photo]);
  const delayDays = useMemo(() => {
    const explicit = form.duration.match(/\d+/)?.[0];
    return explicit ? Number(explicit) : form.description.length > 120 ? 3 : 1;
  }, [form.description, form.duration]);
  const escalation = useMemo(() => {
    if (delayDays >= 7) return 'Escalate to project manager and contract cell.';
    if (/client|department|approval/i.test(form.party + form.description)) return 'Escalate for departmental approval follow-up.';
    return 'Track in weekly review and assign owner.';
  }, [delayDays, form.description, form.party]);
  const visibleEntries = useMemo<Hindrance[]>(() => {
    const persisted = persistedEntries.map((entry) => ({
      id: entry.id || `${entry.created_at || 'local'}-${entry.description || ''}`,
      title: String(entry.location?.title || 'Hindrance'),
      party: String(entry.location?.party || ''),
      duration: String(entry.location?.duration || ''),
      location: String(entry.location?.text || ''),
      description: entry.description || '',
    }));
    return [...entries, ...persisted.filter((item) => !entries.some((entry) => entry.id === item.id))];
  }, [entries, persistedEntries]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const addEntry = async () => {
    if (!form.title.trim()) return;
    const id = crypto.randomUUID();
    setEntries((prev) => [{ id, ...form }, ...prev]);
    setForm({ title: '', party: '', duration: '', location: '', description: '', photo: undefined });
    setShowForm(false);
    try {
      await hindranceService.createEntry({
        id,
        project_id: DEFAULT_PROJECT_ID,
        description: form.description,
        location: {
          text: form.location,
          title: form.title,
          party: form.party,
          duration: form.duration,
          photoName: form.photo?.name,
        },
        severity: delayDays >= 7 ? 'high' : 'medium',
        status: 'open',
        created_by: user?.id,
      });
    } catch (error) {
      console.warn('[Hindrance] Entry queue failed:', error);
    }
  };

  const captureGeo = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setForm((prev) => ({
        ...prev,
        location: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
      }));
    });
  };

  const runImpact = async (entry: Hindrance) => {
    setLoadingId(entry.id);
    try {
      const aiImpact = await analyzeHindranceImpact({
        title: entry.title,
        party: entry.party,
        duration: entry.duration,
        location: entry.location,
        description: entry.description,
      });
      setEntries((prev) => prev.map((item) => item.id === entry.id ? { ...item, aiImpact } : item));
    } finally {
      setLoadingId(null);
    }
  };

  const exportEscalationReport = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const body = visibleEntries.map((entry, index) =>
      `${index + 1}. ${entry.title} | ${entry.party} | ${entry.duration}\n${entry.location}\n${entry.description}`
    ).join('\n\n') || 'No hindrance entries recorded.';
    const lines = doc.splitTextToSize(body, 180);
    doc.text('NIRMAN Hindrance Escalation Report', 14, 16);
    doc.text(lines, 14, 28);
    doc.save(`hindrance-escalation-${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-[#FF6B00]" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Hindrance Register</h1>
          <p className="text-gray-400">Log delays, obstructions and site hindrances for contract claims and schedule recovery.</p>
        </div>
        <OfflineSyncIndicator />
        <Button variant="outline" onClick={exportEscalationReport} icon={<Download size={14} />}>Export</Button>
        <Button onClick={() => setShowForm(true)} icon={<Plus size={14} />}>Add Entry</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <Card className="w-full max-w-3xl bg-[#1A1A1A] border-[#333] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">New Hindrance Entry</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" placeholder="Hindrance title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" placeholder="Responsible party" value={form.party} onChange={(event) => setForm((prev) => ({ ...prev, party: event.target.value }))} />
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" placeholder="Delay duration" value={form.duration} onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))} />
            <input className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" placeholder="Geo/location reference" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
            <Button variant="outline" onClick={captureGeo} icon={<MapPin size={14} />}>Use GPS</Button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#444] px-3 py-2 text-sm text-gray-300">
              <Camera size={14} />
              {form.photo ? form.photo.name : 'Capture hindrance photo'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setForm((prev) => ({ ...prev, photo: event.target.files?.[0] }))} />
            </label>
          </div>
          {photoPreview && <img src={photoPreview} alt="Hindrance preview" className="mt-3 h-36 rounded-lg border border-[#333] object-cover" />}
          <textarea className="mt-3 w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white" rows={3} placeholder="Details and impact" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <p className="rounded-lg bg-[#111] p-3 text-sm text-gray-300">Estimated delay: <span className="text-white">{delayDays} day(s)</span></p>
            <p className="rounded-lg bg-[#111] p-3 text-sm text-gray-300">Escalation: <span className="text-white">{escalation}</span></p>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={addEntry}>Save Entry</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
        </div>
      )}

      <Card className="bg-[#1A1A1A] border-[#333] p-6">
        <h2 className="text-xl font-semibold text-white mb-3">Hindrance Log</h2>
        <div className="grid gap-3">
          {visibleEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-[#333] bg-[#111] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{entry.title}</h3>
                  <p className="text-sm text-gray-400">{entry.party} | {entry.duration}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><MapPin size={12} />{entry.location || 'No location'}</p>
                  {entry.photo && <p className="mt-1 text-xs text-gray-500">{entry.photo.name}</p>}
                </div>
                <button onClick={() => setEntries((prev) => prev.filter((item) => item.id !== entry.id))} className="text-gray-500 hover:text-white"><Trash2 size={16} /></button>
              </div>
              <p className="mt-3 text-sm text-gray-300">{entry.description}</p>
              <Button size="sm" onClick={() => runImpact(entry)} disabled={loadingId === entry.id} className="mt-3" icon={<Zap size={13} />}>
                {loadingId === entry.id ? 'Analyzing...' : 'AI Impact'}
              </Button>
              {entry.aiImpact && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#1A1A1A] p-3 text-sm leading-6 text-gray-300">{entry.aiImpact}</p>}
            </div>
          ))}
          {visibleEntries.length === 0 && <p className="text-sm text-gray-400">No hindrance entries yet.</p>}
        </div>
      </Card>
    </div>
  );
};
