import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Landmark, Plus, ChevronRight, Calendar, MapPin, IndianRupee,
  Building2, User, X, Zap, AlertTriangle, CheckCircle, Clock,
  Lock, Unlock, Loader2
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { GovProject, PaymentMilestone } from '../../types';
import { formatCurrency, formatDistanceToNow } from '../../lib/utils';

const RISK_COLORS: Record<string, string> = { high: '#ef4444', medium: '#f97316', low: '#eab308', safe: '#22c55e' };
const MILESTONE_STATUS_COLORS: Record<string, string> = { locked: '#606060', active: '#FF6B00', submitted: '#3B82F6', approved: '#00D4AA', paid: '#22c55e' };

export function GovProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [project, setProject] = useState<GovProject | null>(null);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMilestone, setShowMilestone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mForm, setMForm] = useState({ milestone_name: '', description: '', payment_amount: '', payment_percentage: '', due_date: '' });

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  async function loadData() {
    const [projRes, mileRes] = await Promise.all([
      supabase.from('gov_projects').select('*').eq('id', id).maybeSingle(),
      supabase.from('payment_milestones').select('*').eq('project_id', id).order('milestone_number'),
    ]);
    if (projRes.data) setProject(projRes.data as GovProject);
    if (mileRes.data) setMilestones(mileRes.data as PaymentMilestone[]);
    setLoading(false);
  }

  async function addMilestone() {
    if (!mForm.milestone_name) { toast('Milestone name required', 'warning'); return; }
    setSubmitting(true);
    const num = milestones.length + 1;
    const { data, error } = await supabase.from('payment_milestones').insert({
      project_id: id,
      milestone_number: num,
      ...mForm,
      payment_amount: parseFloat(mForm.payment_amount) || 0,
      payment_percentage: parseFloat(mForm.payment_percentage) || 0,
      due_date: mForm.due_date || null,
      status: 'locked',
    }).select().maybeSingle();
    setSubmitting(false);
    if (error) { toast('Failed to add milestone', 'error'); return; }
    if (data) setMilestones(prev => [...prev, data as PaymentMilestone]);
    setShowMilestone(false);
    setMForm({ milestone_name: '', description: '', payment_amount: '', payment_percentage: '', due_date: '' });
    toast(`Milestone ${num} added`, 'success');
  }

  async function activateMilestone(m: PaymentMilestone) {
    await supabase.from('payment_milestones').update({ status: 'active' }).eq('id', m.id);
    setMilestones(prev => prev.map(ms => ms.id === m.id ? { ...ms, status: 'active' } : ms));
    toast(`Milestone "${m.milestone_name}" activated`, 'success');
  }

  async function analyzeMilestone(m: PaymentMilestone) {
    toast('Running AI analysis...', 'info');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'milestone', milestone_name: m.milestone_name, description: m.description, payment_amount: m.payment_amount, completion_percentage: m.completion_percentage }),
      });
      const aiData = await res.json();
      await supabase.from('payment_milestones').update({
        ai_safe_amount: aiData.safe_amount || m.payment_amount * 0.85,
        ai_hold_amount: aiData.hold_amount || m.payment_amount * 0.15,
        ai_risk_level: aiData.risk_level || 'low',
        ai_analysis: aiData.analysis || 'Analysis complete.',
      }).eq('id', m.id);
      setMilestones(prev => prev.map(ms => ms.id === m.id ? {
        ...ms,
        ai_safe_amount: aiData.safe_amount || ms.payment_amount * 0.85,
        ai_hold_amount: aiData.hold_amount || ms.payment_amount * 0.15,
        ai_risk_level: aiData.risk_level || 'low',
        ai_analysis: aiData.analysis || 'Analysis complete.',
      } : ms));
      toast('AI analysis complete!', 'success');
    } catch {
      toast('AI analysis failed', 'error');
    }
  }

  if (loading) return <AppLayout title="Loading..."><div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#FF6B00]" /></div></AppLayout>;
  if (!project) return <AppLayout title="Not Found"><div className="text-center py-20 text-[#606060]">Project not found</div></AppLayout>;

  const totalPaid = milestones.filter(m => m.status === 'paid').reduce((s, m) => s + m.payment_amount, 0);
  const totalMilestoneValue = milestones.reduce((s, m) => s + m.payment_amount, 0);

  return (
    <AppLayout title={project.project_name} subtitle={`${project.project_code} · ${project.department} · Powered by NIRMAN AI`}>
      {/* Project header */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <Landmark size={22} style={{ color: '#00D4AA' }} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{project.project_name}</h2>
              <div className="flex items-center gap-3 text-[#606060] text-xs mt-0.5">
                <span className="font-mono">{project.project_code}</span>
                <span>·</span>
                <span>{project.department}</span>
                <span>·</span>
                <span className="capitalize">{project.project_type}</span>
              </div>
            </div>
          </div>
          <Badge color={project.status === 'active' ? '#22c55e' : '#808080'}>{project.status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Contract Value', value: formatCurrency(project.total_contract_value), icon: IndianRupee, color: '#FF6B00' },
            { label: 'Contractor', value: project.contractor_name || 'Unassigned', icon: User, color: '#00D4AA' },
            { label: 'Location', value: project.location || 'N/A', icon: MapPin, color: '#3B82F6' },
            { label: 'Start Date', value: project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN') : 'N/A', icon: Calendar, color: '#F59E0B' },
            { label: 'End Date', value: project.end_date ? new Date(project.end_date).toLocaleDateString('en-IN') : 'N/A', icon: Calendar, color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: '#111111' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon size={11} style={{ color: s.color }} />
                <span className="text-[#606060] text-[10px]">{s.label}</span>
              </div>
              <p className="text-white text-sm font-semibold truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#606060] text-xs">Overall Progress</span>
            <span className="text-white text-xs font-bold">{project.progress_percent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${project.progress_percent}%`, background: 'linear-gradient(90deg, #FF6B00, #00D4AA)' }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[#606060] text-[10px]">Paid: {formatCurrency(totalPaid)}</span>
            <span className="text-[#606060] text-[10px]">Milestones: {formatCurrency(totalMilestoneValue)}</span>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">Payment Milestones</h3>
          <p className="text-[#606060] text-xs mt-0.5">{milestones.length} milestone{milestones.length !== 1 ? 's' : ''} defined</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowMilestone(true)}>Add Milestone</Button>
      </div>

      {showMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold">Add Milestone #{milestones.length + 1}</h2>
              <button onClick={() => setShowMilestone(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Input label="Milestone Name *" placeholder="Foundation Completion" value={mForm.milestone_name} onChange={e => setMForm(p => ({ ...p, milestone_name: e.target.value }))} />
              <Textarea label="Description" placeholder="Describe deliverables..." value={mForm.description} onChange={e => setMForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Payment Amount (₹)" type="number" placeholder="5000000" value={mForm.payment_amount} onChange={e => setMForm(p => ({ ...p, payment_amount: e.target.value }))} icon={<IndianRupee size={13} />} />
                <Input label="Payment %" type="number" placeholder="15" value={mForm.payment_percentage} onChange={e => setMForm(p => ({ ...p, payment_percentage: e.target.value }))} />
              </div>
              <Input label="Due Date" type="date" value={mForm.due_date} onChange={e => setMForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowMilestone(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} onClick={addMilestone}>Add Milestone</Button>
            </div>
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <Building2 size={32} className="text-[#2A2A2A] mx-auto mb-2" />
          <p className="text-[#606060] text-sm">No milestones defined yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {milestones.map(m => (
            <div key={m.id} className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${MILESTONE_STATUS_COLORS[m.status]}15`, color: MILESTONE_STATUS_COLORS[m.status] }}>
                    {m.status === 'locked' ? <Lock size={14} /> : m.status === 'paid' ? <CheckCircle size={14} /> : m.milestone_number}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{m.milestone_name}</p>
                    <p className="text-[#606060] text-[10px]">Milestone #{m.milestone_number} · {formatCurrency(m.payment_amount)} ({m.payment_percentage}%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.ai_risk_level && <Badge color={RISK_COLORS[m.ai_risk_level]}>{m.ai_risk_level} risk</Badge>}
                  <Badge color={MILESTONE_STATUS_COLORS[m.status]}>{m.status}</Badge>
                </div>
              </div>

              {m.description && <p className="text-[#808080] text-xs mb-3">{m.description}</p>}

              {/* Completion bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[#606060] text-[10px]">Completion</span>
                  <span className="text-white text-[10px] font-semibold">{m.completion_percentage}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                  <div className="h-full rounded-full" style={{ width: `${m.completion_percentage}%`, background: MILESTONE_STATUS_COLORS[m.status] }} />
                </div>
              </div>

              {/* AI analysis */}
              {m.ai_analysis && (
                <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={11} style={{ color: '#00D4AA' }} />
                    <span className="text-[#00D4AA] text-[10px] font-semibold">AI Assessment</span>
                  </div>
                  <p className="text-[#A0A0A0] text-xs leading-relaxed">{m.ai_analysis}</p>
                  {m.ai_safe_amount != null && (
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-[#22c55e]">Safe: {formatCurrency(m.ai_safe_amount)}</span>
                      <span className="text-[10px] text-[#ef4444]">Hold: {formatCurrency(m.ai_hold_amount || 0)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#232323]">
                {m.status === 'locked' && (
                  <Button size="sm" variant="secondary" icon={<Unlock size={12} />} onClick={() => activateMilestone(m)}>Activate</Button>
                )}
                {m.status === 'active' && (
                  <>
                    <Button size="sm" variant="secondary" icon={<Zap size={12} />} onClick={() => analyzeMilestone(m)}>AI Analyze</Button>
                    <Button size="sm" variant="primary" icon={<IndianRupee size={12} />} onClick={() => navigate(`/govtrack/payments?milestone=${m.id}`)}>Request Payment</Button>
                  </>
                )}
                {m.due_date && (
                  <span className="ml-auto text-[10px] text-[#606060] flex items-center gap-1">
                    <Clock size={9} /> Due {new Date(m.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
