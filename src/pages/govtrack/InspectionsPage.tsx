import { useEffect, useState } from 'react';
import {
  ClipboardCheck, Plus, X, Zap, CheckCircle, AlertTriangle,
  Shield, Calendar, Star, Loader2, Camera
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { InspectionReport, GovProject } from '../../types';
import { formatDistanceToNow } from '../../lib/utils';

const inspectionTypes = [
  { value: 'routine', label: 'Routine Inspection' },
  { value: 'milestone', label: 'Milestone Inspection' },
  { value: 'complaint', label: 'Complaint-Based' },
  { value: 'final', label: 'Final Inspection' },
];

const recColors: Record<string, string> = {
  approve: '#22c55e', partial: '#F59E0B', hold: '#f97316', reject: '#ef4444',
};

export function InspectionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [projects, setProjects] = useState<GovProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<InspectionReport | null>(null);
  const [form, setForm] = useState({
    project_id: '', inspection_date: new Date().toISOString().split('T')[0],
    inspection_type: 'routine', notes: '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    const [inspRes, projRes] = await Promise.all([
      supabase.from('inspection_reports').select('*').eq('inspected_by', user!.id).order('created_at', { ascending: false }),
      supabase.from('gov_projects').select('*').or(`owner_id.eq.${user!.id},engineer_id.eq.${user!.id}`),
    ]);
    if (inspRes.data) setInspections(inspRes.data as InspectionReport[]);
    if (projRes.data) setProjects(projRes.data as GovProject[]);
    setLoading(false);
  }

  async function createInspection() {
    if (!form.project_id) { toast('Select a project', 'warning'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from('inspection_reports').insert({
      project_id: form.project_id,
      inspected_by: user!.id,
      inspection_date: form.inspection_date,
      inspection_type: form.inspection_type,
      overall_quality_score: 0,
      recommendation: 'approve',
    }).select().maybeSingle();
    if (error) { toast('Failed to create inspection', 'error'); setSubmitting(false); return; }

    // AI analysis
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'inspection', inspection_type: form.inspection_type, notes: form.notes }),
      });
      const aiData = await res.json();
      await supabase.from('inspection_reports').update({
        ai_report: aiData.report || 'Inspection analysis complete.',
        overall_quality_score: aiData.quality_score || 80,
        recommendation: aiData.recommendation || 'approve',
      }).eq('id', data!.id);
      toast('Inspection created with AI analysis!', 'success');
    } catch {
      toast('Inspection created. AI analysis pending.', 'info');
    }

    setSubmitting(false);
    setShowForm(false);
    loadData();
  }

  return (
    <AppLayout title="Site Inspections — NIRMAN AI" subtitle="AI-powered inspection reports and quality assessment by ARSPL">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.2)' }}>
            <ClipboardCheck size={20} style={{ color: '#FF6B00' }} />
          </div>
          <div>
            <p className="text-white font-semibold">{inspections.length} Inspections</p>
            <p className="text-[#606060] text-xs">Quality reports and compliance checks</p>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Inspection</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">New Site Inspection</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Select label="Project *" value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}
                options={[{ value: '', label: 'Select project...' }, ...projects.map(p => ({ value: p.id, label: `${p.project_code} — ${p.project_name}` }))]} />
              <Select label="Inspection Type" value={form.inspection_type} onChange={e => setForm(p => ({ ...p, inspection_type: e.target.value }))} options={inspectionTypes} />
              <Input label="Inspection Date" type="date" value={form.inspection_date} onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))} />
              <Textarea label="Notes / Observations" placeholder="Describe what you observed on site..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} icon={<Zap size={14} />} onClick={createInspection}>
                {submitting ? 'Creating...' : 'Create & AI Analyze'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Inspection Report</h2>
              <button onClick={() => setSelectedInspection(null)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-[10px] mb-0.5">Type</p>
                <p className="text-white text-sm capitalize">{selectedInspection.inspection_type}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-[10px] mb-0.5">Date</p>
                <p className="text-white text-sm">{new Date(selectedInspection.inspection_date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#111111' }}>
              <p className="text-[#606060] text-xs mb-2">Overall Quality Score</p>
              <p className="text-3xl font-black" style={{ color: selectedInspection.overall_quality_score >= 80 ? '#22c55e' : selectedInspection.overall_quality_score >= 60 ? '#F59E0B' : '#ef4444' }}>
                {selectedInspection.overall_quality_score}/100
              </p>
              <Badge color={recColors[selectedInspection.recommendation]}>{selectedInspection.recommendation.toUpperCase()}</Badge>
            </div>

            {selectedInspection.ai_report && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} style={{ color: '#00D4AA' }} />
                  <span className="text-[#00D4AA] text-xs font-semibold">AI Inspection Report</span>
                </div>
                <p className="text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-wrap">{selectedInspection.ai_report}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}</div>
      ) : inspections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardCheck size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No inspections yet</p>
          <p className="text-[#606060] text-sm mb-4">Create your first site inspection report</p>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Inspection</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {inspections.map(insp => (
            <div key={insp.id} onClick={() => setSelectedInspection(insp)} className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:border-[#FF6B00]/20" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${recColors[insp.recommendation]}15`, border: `1px solid ${recColors[insp.recommendation]}25` }}>
                <Shield size={18} style={{ color: recColors[insp.recommendation] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-semibold text-sm capitalize">{insp.inspection_type} Inspection</p>
                  <Badge color={recColors[insp.recommendation]}>{insp.recommendation}</Badge>
                </div>
                <p className="text-[#606060] text-[10px]">{new Date(insp.inspection_date).toLocaleDateString('en-IN')} · {formatDistanceToNow(insp.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Star size={10} style={{ color: insp.overall_quality_score >= 80 ? '#22c55e' : '#F59E0B' }} />
                  <span className="text-white text-sm font-bold">{insp.overall_quality_score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
