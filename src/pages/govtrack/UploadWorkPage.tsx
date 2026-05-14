import { useState, useEffect } from 'react';
import {
  Camera, Upload, X, MapPin, Loader2, CheckCircle,
  AlertTriangle, Zap, Image, FileText
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { WorkUpload, GovProject, PaymentMilestone } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';

const workCategories = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'brickwork', label: 'Brickwork' },
  { value: 'rcc', label: 'RCC / Concrete' },
  { value: 'plastering', label: 'Plastering' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'other', label: 'Other' },
];

const catColors: Record<string, string> = {
  foundation: '#8B5CF6', brickwork: '#DC2626', rcc: '#64748B',
  plastering: '#F59E0B', finishing: '#EC4899', electrical: '#3B82F6',
  plumbing: '#0891B2', other: '#6B7280',
};

const reviewColors: Record<string, string> = {
  pending: '#F59E0B', reviewed: '#22c55e', flagged: '#ef4444',
};

export function UploadWorkPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState<GovProject[]>([]);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [uploads, setUploads] = useState<WorkUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    project_id: '', milestone_id: '', work_category: 'foundation',
    description: '', gps_latitude: '', gps_longitude: '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    const [projRes, uploadRes] = await Promise.all([
      supabase.from('gov_projects').select('*').or(`owner_id.eq.${user!.id},contractor_id.eq.${user!.id}`).order('created_at', { ascending: false }),
      supabase.from('work_uploads').select('*').eq('uploaded_by', user!.id).order('upload_timestamp', { ascending: false }).limit(20),
    ]);
    if (projRes.data) setProjects(projRes.data as GovProject[]);
    if (uploadRes.data) setUploads(uploadRes.data as WorkUpload[]);
    setLoading(false);
  }

  useEffect(() => {
    if (form.project_id) loadMilestones();
  }, [form.project_id]);

  async function loadMilestones() {
    const { data } = await supabase.from('payment_milestones').select('*').eq('project_id', form.project_id).neq('status', 'locked').order('milestone_number');
    if (data) setMilestones(data as PaymentMilestone[]);
  }

  async function submitUpload() {
    if (!form.project_id || !form.description) {
      toast('Project and description are required', 'warning'); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from('work_uploads').insert({
      project_id: form.project_id,
      milestone_id: form.milestone_id || null,
      uploaded_by: user!.id,
      work_category: form.work_category,
      description: form.description,
      photo_urls: imagePreviews,
      gps_latitude: parseFloat(form.gps_latitude) || null,
      gps_longitude: parseFloat(form.gps_longitude) || null,
      review_status: 'pending',
    }).select().maybeSingle();
    if (error) { toast('Upload failed', 'error'); setSubmitting(false); return; }

    // Run AI analysis
    try {
      const { data: aiData, error: fnError } = await supabase.functions.invoke('ai-analyze', {
        body: {
          type: 'work_upload',
          work_category: form.work_category,
          description: form.description,
        },
      });
      if (fnError) throw fnError;
      await supabase.from('work_uploads').update({
        ai_analysis: (aiData as any)?.analysis || 'Quality check complete.',
        ai_quality_score: (aiData as any)?.quality_score || 75,
        issues_found: (aiData as any)?.issues || [],
      }).eq('id', data!.id);
      if (data) setUploads(prev => [{ ...(data as WorkUpload), ai_analysis: (aiData as any)?.analysis, ai_quality_score: (aiData as any)?.quality_score || 75 }, ...prev]);
      toast('Work uploaded and AI analyzed!', 'success');
    } catch {
      if (data) setUploads(prev => [data as WorkUpload, ...prev]);
      toast('Work uploaded. AI analysis pending.', 'info');
    }

    setSubmitting(false);
    setShowForm(false);
    setForm({ project_id: '', milestone_id: '', work_category: 'foundation', description: '', gps_latitude: '', gps_longitude: '' });
    setImagePreviews([]);
  }

  return (
    <AppLayout title="Upload Work — NIRMAN AI" subtitle="Submit work evidence with AI quality verification by ARSPL">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.2)' }}>
            <Camera size={20} style={{ color: '#00D4AA' }} />
          </div>
          <div>
            <p className="text-white font-semibold">{uploads.length} Uploads</p>
            <p className="text-[#606060] text-xs">{uploads.filter(u => u.review_status === 'pending').length} pending review</p>
          </div>
        </div>
        <Button variant="primary" icon={<Upload size={14} />} onClick={() => setShowForm(true)}>New Upload</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Upload Work Evidence</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Select
                label="Project *"
                value={form.project_id}
                onChange={e => setForm(p => ({ ...p, project_id: e.target.value, milestone_id: '' }))}
                options={[{ value: '', label: 'Select project...' }, ...projects.map(p => ({ value: p.id, label: `${p.project_code} — ${p.project_name}` }))]}
              />
              {milestones.length > 0 && (
                <Select
                  label="Milestone (optional)"
                  value={form.milestone_id}
                  onChange={e => setForm(p => ({ ...p, milestone_id: e.target.value }))}
                  options={[{ value: '', label: 'Select milestone...' }, ...milestones.map(m => ({ value: m.id, label: `#${m.milestone_number} ${m.milestone_name}` }))]}
                />
              )}
              <Select label="Work Category" value={form.work_category} onChange={e => setForm(p => ({ ...p, work_category: e.target.value }))} options={workCategories} />
              <Textarea label="Description *" placeholder="Describe the work completed..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />

              {/* Photo upload */}
              <div>
                <label className="text-[#A0A0A0] text-xs font-medium block mb-1">Photo Evidence</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {imagePreviews.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: '1px solid #2A2A2A' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImagePreviews(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
                        <X size={8} className="text-white" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#00D4AA]/40" style={{ border: '2px dashed #2A2A2A', background: '#111111' }}>
                    <Camera size={14} className="text-[#404040]" />
                    <span className="text-[8px] text-[#606060]">Add</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setImagePreviews(prev => [...prev, URL.createObjectURL(f)]);
                    }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="GPS Latitude" type="number" placeholder="21.1458" value={form.gps_latitude} onChange={e => setForm(p => ({ ...p, gps_latitude: e.target.value }))} icon={<MapPin size={13} />} />
                <Input label="GPS Longitude" type="number" placeholder="79.0882" value={form.gps_longitude} onChange={e => setForm(p => ({ ...p, gps_longitude: e.target.value }))} icon={<MapPin size={13} />} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} icon={<Zap size={14} />} onClick={submitUpload}>
                {submitting ? 'Uploading & Analyzing...' : 'Upload & AI Verify'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}</div>
      ) : uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Camera size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No uploads yet</p>
          <p className="text-[#606060] text-sm mb-4">Submit your first work evidence with photos</p>
          <Button variant="primary" icon={<Upload size={14} />} onClick={() => setShowForm(true)}>Upload Work</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {uploads.map(u => (
            <div key={u.id} className="rounded-2xl p-4" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge color={catColors[u.work_category] || '#6B7280'}>{workCategories.find(c => c.value === u.work_category)?.label || u.work_category}</Badge>
                  <Badge color={reviewColors[u.review_status] || '#6B7280'}>{u.review_status}</Badge>
                </div>
                <span className="text-[#606060] text-[10px]">{formatDistanceToNow(u.upload_timestamp)}</span>
              </div>
              <p className="text-white text-sm mb-2">{u.description}</p>

              {u.photo_urls?.length > 0 && (
                <div className="flex gap-1.5 mb-2">
                  {u.photo_urls.slice(0, 4).map((url, i) => (
                    <div key={i} className="w-12 h-12 rounded-lg overflow-hidden" style={{ border: '1px solid #2A2A2A' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {u.photo_urls.length > 4 && <div className="w-12 h-12 rounded-lg flex items-center justify-center text-[#606060] text-xs" style={{ background: '#111111', border: '1px solid #2A2A2A' }}>+{u.photo_urls.length - 4}</div>}
                </div>
              )}

              {u.ai_analysis && (
                <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={10} style={{ color: '#00D4AA' }} />
                    <span className="text-[#00D4AA] text-[10px] font-semibold">AI Quality Score: {u.ai_quality_score}/100</span>
                  </div>
                  <p className="text-[#A0A0A0] text-xs leading-relaxed">{u.ai_analysis}</p>
                </div>
              )}

              {u.gps_latitude && u.gps_longitude && (
                <div className="flex items-center gap-1 text-[#606060] text-[10px]">
                  <MapPin size={9} />
                  {u.gps_latitude.toFixed(4)}, {u.gps_longitude.toFixed(4)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
