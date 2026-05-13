import { useEffect, useState } from 'react';
import {
  Users, Plus, Search, X, Phone, Star, Calendar,
  Briefcase, DollarSign, QrCode, CheckCircle, XCircle
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Worker, WorkerSkill } from '../types';

const skillOptions = [
  { value: 'mason', label: 'Mason' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'painter', label: 'Painter' },
  { value: 'steel_fixer', label: 'Steel Fixer' },
  { value: 'general', label: 'General Labor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'driver', label: 'Driver' },
];

const skillColors: Record<string, string> = {
  mason: '#FF6B00', carpenter: '#00D4AA', electrician: '#F59E0B',
  plumber: '#3B82F6', painter: '#EC4899', steel_fixer: '#8B5CF6',
  general: '#6B7280', supervisor: '#22c55e', driver: '#14B8A6',
};

interface WorkerForm {
  name: string;
  phone: string;
  skill: WorkerSkill;
  daily_wage: string;
  aadhaar: string;
}

export function WorkersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSkill, setFilterSkill] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<WorkerForm>({ name: '', phone: '', skill: 'general', daily_wage: '', aadhaar: '' });

  useEffect(() => {
    if (user) loadWorkers();
  }, [user]);

  async function loadWorkers() {
    const { data } = await supabase.from('workers').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false });
    if (data) setWorkers(data as Worker[]);
    setLoading(false);
  }

  async function addWorker() {
    if (!form.name) { toast('Worker name is required', 'warning'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from('workers').insert({
      owner_id: user!.id,
      name: form.name,
      phone: form.phone,
      skill: form.skill,
      daily_wage: parseFloat(form.daily_wage) || 0,
      aadhaar: form.aadhaar,
      status: 'active',
      performance_score: 0,
    }).select().maybeSingle();
    setSubmitting(false);
    if (error) { toast('Failed to add worker', 'error'); return; }
    if (data) setWorkers(prev => [data as Worker, ...prev]);
    setShowForm(false);
    setForm({ name: '', phone: '', skill: 'general', daily_wage: '', aadhaar: '' });
    toast(`${form.name} added successfully!`, 'success');
  }

  async function toggleStatus(worker: Worker) {
    const newStatus = worker.status === 'active' ? 'inactive' : 'active';
    await supabase.from('workers').update({ status: newStatus }).eq('id', worker.id);
    setWorkers(prev => prev.map(w => w.id === worker.id ? { ...w, status: newStatus } : w));
    toast(`${worker.name} marked as ${newStatus}`, 'info');
  }

  const filtered = workers.filter(w => {
    const matchSkill = filterSkill === 'all' || w.skill === filterSkill;
    const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.phone.includes(search);
    return matchSkill && matchSearch;
  });

  const activeCount = workers.filter(w => w.status === 'active').length;
  const totalWage = workers.filter(w => w.status === 'active').reduce((s, w) => s + w.daily_wage, 0);

  return (
    <AppLayout title="Workforce Tracker" subtitle="Manage workers, attendance & performance">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Workers', value: workers.length, color: '#FF6B00' },
          { label: 'Active Today', value: activeCount, color: '#22c55e' },
          { label: 'Daily Wage Budget', value: `₹${totalWage.toLocaleString('en-IN')}`, color: '#00D4AA' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
            <p className="text-[#606060] text-xs mb-2">{s.label}</p>
            <p className="text-white text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..." className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-[#404040] outline-none border border-[#2A2A2A] focus:border-[#FF6B00]/50" style={{ background: '#111111' }} />
        </div>
        <select value={filterSkill} onChange={e => setFilterSkill(e.target.value)} className="rounded-xl px-3 py-2 text-sm text-white border border-[#2A2A2A] outline-none" style={{ background: '#111111' }}>
          <option value="all">All Skills</option>
          {skillOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Add Worker</Button>
      </div>

      {/* Add Worker Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Add New Worker</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="Full Name *" placeholder="Ram Kumar" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <Input label="Phone Number" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} icon={<Phone size={13} />} />
              <Select label="Skill / Trade" value={form.skill} onChange={e => setForm(p => ({ ...p, skill: e.target.value as WorkerSkill }))} options={skillOptions} />
              <Input label="Daily Wage (₹)" type="number" placeholder="650" value={form.daily_wage} onChange={e => setForm(p => ({ ...p, daily_wage: e.target.value }))} icon={<DollarSign size={13} />} />
              <Input label="Aadhaar (last 4 digits)" placeholder="XXXX" value={form.aadhaar} onChange={e => setForm(p => ({ ...p, aadhaar: e.target.value }))} icon={<QrCode size={13} />} />
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} onClick={addWorker}>Add Worker</Button>
            </div>
          </div>
        </div>
      )}

      {/* Workers grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No workers found</p>
          <p className="text-[#606060] text-sm mb-4">{search || filterSkill !== 'all' ? 'Try adjusting filters' : 'Add your first worker to get started'}</p>
          {!search && <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Add Worker</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => (
            <div key={w.id} className="rounded-2xl p-5 transition-all hover:border-[#2A2A35]" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: `${skillColors[w.skill] || '#FF6B00'}20`, color: skillColors[w.skill] || '#FF6B00' }}>
                    {w.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{w.name}</p>
                    <p className="text-[#606060] text-[10px]">{w.phone}</p>
                  </div>
                </div>
                <button onClick={() => toggleStatus(w)} className="transition-all">
                  {w.status === 'active'
                    ? <CheckCircle size={16} style={{ color: '#22c55e' }} />
                    : <XCircle size={16} style={{ color: '#606060' }} />}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge color={skillColors[w.skill] || '#FF6B00'}>{skillOptions.find(s => s.value === w.skill)?.label || w.skill}</Badge>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: w.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(160,160,160,0.1)', color: w.status === 'active' ? '#22c55e' : '#808080' }}>
                  {w.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#232323]">
                <div className="text-center">
                  <p className="text-[#606060] text-[9px] mb-0.5">Daily Wage</p>
                  <p className="text-white text-xs font-semibold">₹{w.daily_wage.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-center">
                  <p className="text-[#606060] text-[9px] mb-0.5">Score</p>
                  <div className="flex items-center justify-center gap-0.5">
                    <Star size={9} style={{ color: '#F59E0B' }} />
                    <p className="text-white text-xs font-semibold">{w.performance_score}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[#606060] text-[9px] mb-0.5">Joined</p>
                  <p className="text-white text-xs font-semibold">{w.joined_date ? new Date(w.joined_date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
