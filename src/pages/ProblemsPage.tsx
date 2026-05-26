import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  AlertTriangle, Plus, Search, X,
  MapPin, Clock, Brain, Camera,
  FileText, Zap
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { invokeAiAnalyze } from '../services/ai/aiService';
import { useAuth } from '../contexts/useAuth';
import { useToast } from '../components/ui/useToast';
import { Problem, ProblemCategory, ProblemSeverity } from '../types';
import { formatDistanceToNow, generateProblemCode, CATEGORY_LABELS, SEVERITY_COLORS } from '../lib/utils';

const categories = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const severities = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface ProblemFormData {
  title: string;
  category: ProblemCategory;
  severity: ProblemSeverity;
  description: string;
  location_text: string;
}

export function ProblemsPage() {
  const { user } = useAuth();
  const userId = useMemo(() => user?.id, [user?.id]);
  const toast = useToast();
  const loadRequestRef = useRef(0);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState<ProblemFormData>({
    title: '',
    category: 'other',
    severity: 'medium',
    description: '',
    location_text: '',
  });

  const loadProblems = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    if (!userId) {
      setProblems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(prev => (prev ? prev : true));
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('reported_by', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (loadRequestRef.current === requestId && data) {
        setProblems(data as Problem[]);
      }
    } catch (error) {
      if (loadRequestRef.current !== requestId) {
        return;
      }

      console.error('Failed to load problems:', error);
      toast('Failed to load problems', 'error');
    } finally {
      if (loadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [userId, toast]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  async function analyzeWithAI() {
    if (!form.description && !form.category) {
      toast('Add a description or select a category first', 'warning');
      return;
    }
    setAiLoading(true);
    try {
      const result = await invokeAiAnalyze<{ title?: string; severity?: string; description?: string }>({
        type: 'problem',
        category: form.category,
        description: form.description,
        title: form.title,
      }, {
        retries: 2,
        timeoutMs: 20000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'problemAnalysis',
        maxQuotaPerDay: 35,
        errorMessage: 'Problem analysis failed'
      });
      setForm(prev => {
        const severity = ['critical', 'high', 'medium', 'low'].includes(result?.severity || '')
          ? (result.severity as ProblemSeverity)
          : prev.severity;

        return {
          ...prev,
          title: result?.title || prev.title,
          severity,
          description: result?.description || prev.description,
        };
      });
      toast('AI analysis complete!', 'success');
    } catch {
      toast('AI analysis failed. Please try again.', 'error');
    }
    setAiLoading(false);
  }

  async function submitProblem() {
    if (!form.title || !form.description) {
      toast('Please fill in title and description', 'warning');
      return;
    }
    const code = generateProblemCode();
    const { data, error } = await supabase.from('problems').insert({
      ...form,
      reported_by: user!.id,
      problem_code: code,
      status: 'open',
    }).select().maybeSingle();
    if (error) { toast('Failed to submit problem', 'error'); return; }
    if (data) setProblems(prev => [data as Problem, ...prev]);
    setShowForm(false);
    setForm({ title: '', category: 'other', severity: 'medium', description: '', location_text: '' });
    setImagePreview(null);
    toast(`Problem ${code} reported successfully!`, 'success');
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('problems').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id);
    setProblems(prev => prev.map(p => p.id === id ? { ...p, status: status as Problem['status'] } : p));
    if (selectedProblem?.id === id) setSelectedProblem(prev => prev ? { ...prev, status: status as Problem['status'] } : null);
    toast(`Status updated to ${status}`, 'success');
  }

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return problems.filter(p => {
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchSearch =
        !normalizedSearch ||
        p.title?.toLowerCase().includes(normalizedSearch) ||
        p.problem_code?.toLowerCase().includes(normalizedSearch);

      return matchStatus && matchSearch;
    });
  }, [filterStatus, problems, search]);

  return (
    <AppLayout title="Problem Detector" subtitle="AI-powered issue reporting and management">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search problems..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-[#404040] outline-none border border-[#2A2A2A] focus:border-[#FF6B00]/50"
              style={{ background: '#111111' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm text-white border border-[#2A2A2A] outline-none"
            style={{ background: '#111111' }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>
          Report Problem
        </Button>
      </div>

      {/* Report Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} style={{ color: '#FF6B00' }} />
                <h2 className="text-white font-bold text-lg">Report New Problem</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#606060] hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <Input
                  label="Problem Title"
                  placeholder="Brief description of the issue..."
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <Select
                label="Category"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value as ProblemCategory }))}
                options={categories}
              />
              <Select
                label="Severity"
                value={form.severity}
                onChange={e => setForm(p => ({ ...p, severity: e.target.value as ProblemSeverity }))}
                options={severities}
              />
              <div className="col-span-2">
                <Textarea
                  label="Description"
                  placeholder="Describe the problem in detail..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Location"
                  placeholder="Building A, Floor 3, Column Grid D-5"
                  value={form.location_text}
                  onChange={e => setForm(p => ({ ...p, location_text: e.target.value }))}
                  icon={<MapPin size={13} />}
                />
              </div>
            </div>

            {/* Image upload */}
            <div className="mb-4">
              <label className="text-[#A0A0A0] text-xs font-medium block mb-1">Photo Evidence</label>
              <label className="flex flex-col items-center justify-center h-24 rounded-xl cursor-pointer transition-all hover:border-[#FF6B00]/40"
                style={{ border: '2px dashed #2A2A2A', background: '#111111' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="h-full w-full object-cover rounded-xl" />
                ) : (
                  <>
                    <Camera size={20} className="text-[#404040] mb-1" />
                    <span className="text-[#606060] text-xs">Click to upload photo</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setImagePreview(URL.createObjectURL(f));
                }} />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" icon={<Brain size={14} />} loading={aiLoading} onClick={analyzeWithAI} className="flex-1">
                {aiLoading ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
              <Button variant="primary" icon={<FileText size={14} />} onClick={submitProblem} className="flex-1">
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Problem Detail Modal */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#606060] text-xs font-mono">{selectedProblem.problem_code}</span>
                  <SeverityBadge severity={selectedProblem.severity} />
                  <StatusBadge status={selectedProblem.status} />
                </div>
                <h2 className="text-white font-bold text-lg">{selectedProblem.title}</h2>
              </div>
              <button onClick={() => setSelectedProblem(null)} className="text-[#606060] hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-xs mb-1">Category</p>
                <p className="text-white text-sm">{CATEGORY_LABELS[selectedProblem.category]}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-xs mb-1">Location</p>
                <p className="text-white text-sm">{selectedProblem.location_text || 'Not specified'}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: '#111111' }}>
              <p className="text-[#606060] text-xs mb-2">Description</p>
              <p className="text-white text-sm leading-relaxed">{selectedProblem.description}</p>
            </div>

            {selectedProblem.ai_analysis && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} style={{ color: '#00D4AA' }} />
                  <p className="text-[#00D4AA] text-xs font-semibold">AI Analysis</p>
                </div>
                <p className="text-[#A0A0A0] text-sm leading-relaxed">{selectedProblem.ai_analysis}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {['open', 'in_progress', 'resolved'].map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(selectedProblem.id, s)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={{
                    background: selectedProblem.status === s ? '#FF6B00' : 'rgba(255,107,0,0.08)',
                    color: selectedProblem.status === s ? '#fff' : '#FF6B00',
                    border: '1px solid rgba(255,107,0,0.2)',
                  }}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Problems list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No problems found</p>
          <p className="text-[#606060] text-sm mb-4">
            {search || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Your site is clean! Report an issue when you find one.'}
          </p>
          {!search && filterStatus === 'all' && (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>
              Report Problem
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedProblem(p)}
              className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:border-[#FF6B00]/20"
              style={{ background: '#1A1A1A', border: '1px solid #232323' }}
            >
              <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: SEVERITY_COLORS[p.severity] || '#808080' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#606060] text-[10px] font-mono">{p.problem_code}</span>
                  <span className="text-[#404040] text-[10px]">·</span>
                  <span className="text-[#606060] text-[10px]">{CATEGORY_LABELS[p.category]}</span>
                </div>
                <p className="text-white text-sm font-medium truncate">{p.title || 'Untitled Problem'}</p>
                <div className="flex items-center gap-3 mt-1">
                  {p.location_text && (
                    <span className="flex items-center gap-1 text-[#606060] text-[10px]">
                      <MapPin size={9} />
                      {p.location_text}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[#606060] text-[10px]">
                    <Clock size={9} />
                    {formatDistanceToNow(p.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <SeverityBadge severity={p.severity} />
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
