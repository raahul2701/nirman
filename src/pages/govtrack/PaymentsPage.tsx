import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IndianRupee, Plus, X, Zap, CheckCircle, Clock,
  ChevronRight
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { invokeAiAnalyze } from '../../services/ai/aiService';
import { useAuth } from '../../contexts/useAuth';
import { useToast } from '../../components/ui/useToast';
import { PaymentRequest, GovProject, PaymentMilestone } from '../../types';
import { formatCurrency, formatDistanceToNow } from '../../lib/utils';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', je_approved: '#3B82F6', ee_approved: '#8B5CF6',
  se_approved: '#00D4AA', paid: '#22c55e', rejected: '#ef4444', hold: '#f97316',
};

const RISK_COLORS: Record<string, string> = { high: '#ef4444', medium: '#f97316', low: '#eab308', safe: '#22c55e' };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', je_approved: 'JE Approved', ee_approved: 'EE Approved',
  se_approved: 'SE Approved', paid: 'Paid', rejected: 'Rejected', hold: 'On Hold',
};

export function PaymentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const preselectedMilestone = searchParams.get('milestone');

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [projects, setProjects] = useState<GovProject[]>([]);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalAmount, setApprovalAmount] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [form, setForm] = useState({
    project_id: '', milestone_id: preselectedMilestone || '', claimed_amount: '',
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    const [payRes, projRes] = await Promise.all([
      supabase.from('payment_requests').select('*').or(`requested_by.eq.${user.id},project_id.in.(select id from gov_projects where owner_id.eq.${user.id} or engineer_id.eq.${user.id})`).order('created_at', { ascending: false }),
      supabase.from('gov_projects').select('*').or(`owner_id.eq.${user.id},contractor_id.eq.${user.id},engineer_id.eq.${user.id}`),
    ]);
    if (payRes.data) setPayments(payRes.data as PaymentRequest[]);
    if (projRes.data) setProjects(projRes.data as GovProject[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (preselectedMilestone) setShowForm(true);
  }, [preselectedMilestone]);

  const loadMilestones = useCallback(async () => {
    if (!form.project_id) return;
    const { data } = await supabase.from('payment_milestones').select('*').eq('project_id', form.project_id).eq('status', 'active').order('milestone_number');
    if (data) setMilestones(data as PaymentMilestone[]);
  }, [form.project_id]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  async function createRequest() {
    if (!form.project_id || !form.claimed_amount) { toast('Project and amount required', 'warning'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from('payment_requests').insert({
      project_id: form.project_id,
      milestone_id: form.milestone_id || null,
      requested_by: user!.id,
      claimed_amount: parseFloat(form.claimed_amount),
      final_status: 'pending',
    }).select().maybeSingle();
    if (error) { toast('Failed to create request', 'error'); setSubmitting(false); return; }

    // AI analysis
    try {
      const aiData = await invokeAiAnalyze<{ recommended_amount?: number; hold_amount?: number; risk_level?: string; report?: string }>({
        type: 'payment',
        claimed_amount: form.claimed_amount,
        project_id: form.project_id,
      }, {
        retries: 2,
        timeoutMs: 20000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'paymentAnalysis',
        maxQuotaPerDay: 35,
        errorMessage: 'Payment AI analysis failed'
      });
      await supabase.from('payment_requests').update({
        ai_recommended_amount: aiData.recommended_amount ?? parseFloat(form.claimed_amount) * 0.85,
        ai_hold_amount: aiData.hold_amount ?? parseFloat(form.claimed_amount) * 0.15,
        ai_risk_level: aiData.risk_level || 'low',
        ai_full_report: aiData.report || 'Payment verification complete.',
      }).eq('id', data!.id);
      toast('Payment request submitted with AI analysis!', 'success');
    } catch {
      toast('Payment request submitted. AI analysis pending.', 'info');
    }

    setSubmitting(false);
    setShowForm(false);
    setForm({ project_id: '', milestone_id: '', claimed_amount: '' });
    loadData();
  }

  async function approvePayment(payment: PaymentRequest, action: 'approved' | 'rejected' | 'hold', role: 'JE' | 'EE' | 'SE') {
    const amount = action === 'approved' ? (parseFloat(approvalAmount) || payment.claimed_amount) : 0;
    const updates: Record<string, unknown> = {};

    if (role === 'JE') {
      updates.je_approved_amount = amount;
      updates.je_approved_by = user!.id;
      updates.je_approved_at = new Date().toISOString();
      updates.final_status = action === 'approved' ? 'je_approved' : action;
    } else if (role === 'EE') {
      updates.ee_approved_amount = amount;
      updates.ee_approved_by = user!.id;
      updates.ee_approved_at = new Date().toISOString();
      updates.final_status = action === 'approved' ? 'ee_approved' : action;
    } else {
      updates.se_approved_amount = amount;
      updates.se_approved_by = user!.id;
      updates.se_approved_at = new Date().toISOString();
      updates.final_status = action === 'approved' ? 'se_approved' : action;
    }

    await supabase.from('payment_requests').update(updates).eq('id', payment.id);
    await supabase.from('approval_workflow').insert({
      payment_request_id: payment.id,
      approver_id: user!.id,
      approver_role: role,
      action,
      approved_amount: amount,
      comments: approvalComment,
    });

    setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, ...updates } as PaymentRequest : p));
    setSelectedPayment(null);
    setApprovalComment('');
    setApprovalAmount('');
    toast(`Payment ${action} by ${role}`, action === 'approved' ? 'success' : 'warning');
  }

  const filtered = payments.filter(p => filterStatus === 'all' || p.final_status === filterStatus);
  const pendingCount = payments.filter(p => p.final_status === 'pending').length;
  const totalPending = payments.filter(p => ['pending', 'je_approved', 'ee_approved'].includes(p.final_status)).reduce((s, p) => s + p.claimed_amount, 0);

  return (
    <AppLayout title="Payment Requests — NIRMAN AI" subtitle="Multi-level approval workflow with AI verification by ARSPL">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <p className="text-[#606060] text-xs mb-2">Total Requests</p>
          <p className="text-white text-2xl font-bold">{payments.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: pendingCount > 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid #232323' }}>
          <p className="text-[#606060] text-xs mb-2">Pending Approval</p>
          <p className="text-2xl font-bold" style={{ color: pendingCount > 0 ? '#F59E0B' : '#22c55e' }}>{pendingCount}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <p className="text-[#606060] text-xs mb-2">Pending Amount</p>
          <p className="text-white text-2xl font-bold">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-xl px-3 py-2 text-sm text-white border border-[#2A2A2A] outline-none" style={{ background: '#111111' }}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Request</Button>
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">New Payment Request</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Select label="Project *" value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value, milestone_id: '' }))}
                options={[{ value: '', label: 'Select project...' }, ...projects.map(p => ({ value: p.id, label: `${p.project_code} — ${p.project_name}` }))]} />
              {milestones.length > 0 && (
                <Select label="Milestone" value={form.milestone_id} onChange={e => setForm(p => ({ ...p, milestone_id: e.target.value }))}
                  options={[{ value: '', label: 'Select milestone...' }, ...milestones.map(m => ({ value: m.id, label: `#${m.milestone_number} ${m.milestone_name} — ${formatCurrency(m.payment_amount)}` }))]} />
              )}
              <Input label="Claimed Amount (₹) *" type="number" placeholder="5000000" value={form.claimed_amount} onChange={e => setForm(p => ({ ...p, claimed_amount: e.target.value }))} icon={<IndianRupee size={13} />} />
            </div>
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={11} style={{ color: '#00D4AA' }} />
                <span className="text-[#00D4AA] text-[10px] font-semibold">AI will verify</span>
              </div>
              <p className="text-[#606060] text-xs">AI will analyze work evidence, assess risk, and recommend safe payment amounts.</p>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} icon={<IndianRupee size={14} />} onClick={createRequest}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">Payment Request</h2>
              <button onClick={() => setSelectedPayment(null)}><X size={18} className="text-[#606060]" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-[10px] mb-0.5">Claimed Amount</p>
                <p className="text-white font-bold">{formatCurrency(selectedPayment.claimed_amount)}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-[10px] mb-0.5">Status</p>
                <Badge color={STATUS_COLORS[selectedPayment.final_status]}>{STATUS_LABELS[selectedPayment.final_status]}</Badge>
              </div>
            </div>

            {selectedPayment.ai_full_report && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} style={{ color: '#00D4AA' }} />
                  <span className="text-[#00D4AA] text-xs font-semibold">AI Payment Analysis</span>
                  {selectedPayment.ai_risk_level && <Badge color={RISK_COLORS[selectedPayment.ai_risk_level]}>{selectedPayment.ai_risk_level} risk</Badge>}
                </div>
                <p className="text-[#A0A0A0] text-xs leading-relaxed mb-2">{selectedPayment.ai_full_report}</p>
                <div className="flex items-center gap-4">
                  {selectedPayment.ai_recommended_amount && <span className="text-[10px] text-[#22c55e]">Recommended: {formatCurrency(selectedPayment.ai_recommended_amount)}</span>}
                  {selectedPayment.ai_hold_amount != null && selectedPayment.ai_hold_amount > 0 && <span className="text-[10px] text-[#ef4444]">Hold: {formatCurrency(selectedPayment.ai_hold_amount)}</span>}
                </div>
              </div>
            )}

            {/* Approval chain */}
            <div className="mb-4">
              <p className="text-[#606060] text-xs font-medium mb-2">Approval Chain</p>
              <div className="flex items-center gap-2">
                {['JE', 'EE', 'SE'].map((role) => {
                  const approved = selectedPayment[`${role.toLowerCase()}_approved_at` as keyof PaymentRequest];
                  return (
                    <div key={role} className="flex-1 rounded-xl p-2.5 text-center" style={{ background: approved ? 'rgba(34,197,94,0.08)' : '#111111', border: `1px solid ${approved ? 'rgba(34,197,94,0.2)' : '#2A2A2A'}` }}>
                      <p className="text-[10px] text-[#606060] mb-0.5">{role}</p>
                      {approved ? <CheckCircle size={14} className="mx-auto" style={{ color: '#22c55e' }} /> : <Clock size={14} className="mx-auto text-[#404040]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval actions */}
            {['pending', 'je_approved', 'ee_approved'].includes(selectedPayment.final_status) && (
              <div className="pt-4 border-t border-[#232323]">
                <p className="text-[#606060] text-xs font-medium mb-3">Take Action</p>
                <Input label="Approved Amount (₹)" type="number" placeholder={selectedPayment.claimed_amount.toString()} value={approvalAmount} onChange={e => setApprovalAmount(e.target.value)} />
                <Textarea label="Comments" placeholder="Add comments..." value={approvalComment} onChange={e => setApprovalComment(e.target.value)} rows={2} />
                <div className="flex gap-2 mt-3">
                  {selectedPayment.final_status === 'pending' && (
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => approvePayment(selectedPayment, 'approved', 'JE')}>JE Approve</Button>
                  )}
                  {selectedPayment.final_status === 'je_approved' && (
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => approvePayment(selectedPayment, 'approved', 'EE')}>EE Approve</Button>
                  )}
                  {selectedPayment.final_status === 'ee_approved' && (
                    <Button variant="primary" size="sm" className="flex-1" onClick={() => approvePayment(selectedPayment, 'approved', 'SE')}>SE Approve</Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => approvePayment(selectedPayment, 'rejected', selectedPayment.final_status === 'pending' ? 'JE' : selectedPayment.final_status === 'je_approved' ? 'EE' : 'SE')}>Reject</Button>
                  <Button variant="secondary" size="sm" onClick={() => approvePayment(selectedPayment, 'hold', selectedPayment.final_status === 'pending' ? 'JE' : selectedPayment.final_status === 'je_approved' ? 'EE' : 'SE')}>Hold</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments list */}
      {loading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IndianRupee size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No payment requests</p>
          <p className="text-[#606060] text-sm mb-4">{filterStatus !== 'all' ? 'Try changing the filter' : 'Create your first payment request'}</p>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Request</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(p => (
            <div key={p.id} onClick={() => setSelectedPayment(p)} className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:border-[#00D4AA]/20" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${STATUS_COLORS[p.final_status]}15`, border: `1px solid ${STATUS_COLORS[p.final_status]}25` }}>
                <IndianRupee size={18} style={{ color: STATUS_COLORS[p.final_status] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-semibold text-sm">{formatCurrency(p.claimed_amount)}</p>
                  {p.ai_risk_level && <Badge color={RISK_COLORS[p.ai_risk_level]}>{p.ai_risk_level}</Badge>}
                </div>
                <p className="text-[#606060] text-[10px]">{formatDistanceToNow(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1">
                  {['JE', 'EE', 'SE'].map(role => {
                    const done = !!p[`${role.toLowerCase()}_approved_at` as keyof PaymentRequest];
                    return <div key={role} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: done ? 'rgba(34,197,94,0.15)' : '#1F1F1F', color: done ? '#22c55e' : '#404040', border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : '#2A2A2A'}` }}>{role}</div>;
                  })}
                </div>
                <Badge color={STATUS_COLORS[p.final_status]}>{STATUS_LABELS[p.final_status]}</Badge>
                <ChevronRight size={14} className="text-[#404040]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
