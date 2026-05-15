import { useEffect, useState } from 'react';
import {
  Package, Plus, X, Search, AlertTriangle, TrendingDown,
  TrendingUp, ArrowUp, ArrowDown, Filter
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { useToast } from '../components/ui/useToast';
import { Material } from '../types';

const categoryOptions = [
  { value: 'cement', label: 'Cement' },
  { value: 'steel', label: 'Steel' },
  { value: 'sand', label: 'Sand' },
  { value: 'aggregate', label: 'Aggregate' },
  { value: 'bricks', label: 'Bricks / Blocks' },
  { value: 'tiles', label: 'Tiles' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'safety', label: 'Safety Equipment' },
  { value: 'tools', label: 'Tools & Machinery' },
  { value: 'other', label: 'Other' },
];

const categoryColors: Record<string, string> = {
  cement: '#94A3B8', steel: '#64748B', sand: '#D97706',
  aggregate: '#92400E', bricks: '#DC2626', tiles: '#0891B2',
  electrical: '#F59E0B', plumbing: '#3B82F6', safety: '#22c55e',
  tools: '#8B5CF6', other: '#6B7280',
};

export function InventoryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showTransaction, setShowTransaction] = useState<{ material: Material; type: 'in' | 'out' } | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [form, setForm] = useState({ name: '', category: 'cement', unit: 'bags', current_qty: '', threshold_qty: '', unit_price: '', supplier_name: '' });
  const [txQty, setTxQty] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) loadMaterials();
  }, [user]);

  async function loadMaterials() {
    const { data } = await supabase.from('materials').select('*').eq('owner_id', user!.id).order('name');
    if (data) setMaterials(data as Material[]);
    setLoading(false);
  }

  async function addMaterial() {
    if (!form.name) { toast('Material name required', 'warning'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from('materials').insert({
      owner_id: user!.id,
      ...form,
      current_qty: parseFloat(form.current_qty) || 0,
      threshold_qty: parseFloat(form.threshold_qty) || 0,
      unit_price: parseFloat(form.unit_price) || 0,
    }).select().maybeSingle();
    setSubmitting(false);
    if (error) { toast('Failed to add material', 'error'); return; }
    if (data) setMaterials(prev => [...prev, data as Material].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAdd(false);
    setForm({ name: '', category: 'cement', unit: 'bags', current_qty: '', threshold_qty: '', unit_price: '', supplier_name: '' });
    toast(`${form.name} added to inventory`, 'success');
  }

  async function doTransaction() {
    if (!showTransaction || !txQty) { toast('Enter quantity', 'warning'); return; }
    const { material, type } = showTransaction;
    const qty = parseFloat(txQty);
    if (isNaN(qty) || qty <= 0) { toast('Enter valid quantity', 'warning'); return; }

    setSubmitting(true);
    const newQty = type === 'in' ? material.current_qty + qty : Math.max(0, material.current_qty - qty);

    await supabase.from('stock_transactions').insert({
      material_id: material.id,
      owner_id: user!.id,
      type,
      quantity: qty,
      done_by: user!.id,
      notes: txNotes,
    });
    await supabase.from('materials').update({ current_qty: newQty, updated_at: new Date().toISOString() }).eq('id', material.id);
    setMaterials(prev => prev.map(m => m.id === material.id ? { ...m, current_qty: newQty } : m));
    setSubmitting(false);
    setShowTransaction(null);
    setTxQty('');
    setTxNotes('');
    toast(`Stock ${type === 'in' ? 'added' : 'removed'} successfully`, 'success');
  }

  const filtered = materials.filter(m => {
    const matchCat = filterCat === 'all' || m.category === filterCat;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStock = materials.filter(m => m.current_qty <= m.threshold_qty).length;
  const totalValue = materials.reduce((s, m) => s + m.current_qty * m.unit_price, 0);

  return (
    <AppLayout title="Material & Inventory" subtitle="Track stock levels, transactions and AI-powered forecasting">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <p className="text-[#606060] text-xs mb-2">Total Items</p>
          <p className="text-white text-2xl font-bold">{materials.length}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: lowStock > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid #232323' }}>
          <p className="text-[#606060] text-xs mb-2">Low Stock Alerts</p>
          <p className="text-2xl font-bold" style={{ color: lowStock > 0 ? '#ef4444' : '#22c55e' }}>{lowStock}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          <p className="text-[#606060] text-xs mb-2">Inventory Value</p>
          <p className="text-white text-2xl font-bold">₹{(totalValue / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..." className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-[#404040] outline-none border border-[#2A2A2A] focus:border-[#FF6B00]/50" style={{ background: '#111111' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="rounded-xl px-3 py-2 text-sm text-white border border-[#2A2A2A] outline-none" style={{ background: '#111111' }}>
          <option value="all">All Categories</option>
          {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add Material</Button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Add Material</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Input label="Material Name *" placeholder="Portland Cement OPC 53" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={categoryOptions} />
              <Input label="Unit" placeholder="bags / kg / m³" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
              <Input label="Current Stock" type="number" placeholder="100" value={form.current_qty} onChange={e => setForm(p => ({ ...p, current_qty: e.target.value }))} />
              <Input label="Alert Threshold" type="number" placeholder="20" value={form.threshold_qty} onChange={e => setForm(p => ({ ...p, threshold_qty: e.target.value }))} />
              <Input label="Unit Price (₹)" type="number" placeholder="380" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} />
              <Input label="Supplier Name" placeholder="ABC Traders" value={form.supplier_name} onChange={e => setForm(p => ({ ...p, supplier_name: e.target.value }))} />
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} onClick={addMaterial}>Add Material</Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold">{showTransaction.type === 'in' ? 'Stock In' : 'Stock Out'} — {showTransaction.material.name}</h2>
              <button onClick={() => setShowTransaction(null)}><X size={18} className="text-[#606060]" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: '#111111' }}>
                <p className="text-[#606060] text-xs">Current Stock</p>
                <p className="text-white font-bold text-lg">{showTransaction.material.current_qty} {showTransaction.material.unit}</p>
              </div>
              <Input label={`Quantity to ${showTransaction.type === 'in' ? 'Add' : 'Remove'}`} type="number" placeholder="50" value={txQty} onChange={e => setTxQty(e.target.value)} />
              <Input label="Notes (optional)" placeholder="Delivery from supplier..." value={txNotes} onChange={e => setTxNotes(e.target.value)} />
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowTransaction(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={submitting} onClick={doTransaction}
                style={showTransaction.type === 'out' ? { background: '#ef4444' } : undefined}>
                {showTransaction.type === 'in' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Materials table */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No materials found</p>
          <p className="text-[#606060] text-sm mb-4">{search || filterCat !== 'all' ? 'Try adjusting filters' : 'Start tracking your construction materials'}</p>
          {!search && <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add Material</Button>}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #232323' }}>
          <div className="grid grid-cols-[1fr_100px_100px_80px_120px] gap-3 px-5 py-3 text-[#606060] text-xs font-medium" style={{ background: '#1A1A1A', borderBottom: '1px solid #232323' }}>
            <span>Material</span><span className="text-center">Category</span><span className="text-center">Stock</span><span className="text-center">Value</span><span className="text-center">Actions</span>
          </div>
          {filtered.map(m => {
            const isLow = m.current_qty <= m.threshold_qty;
            return (
              <div key={m.id} className="grid grid-cols-[1fr_100px_100px_80px_120px] gap-3 px-5 py-4 items-center transition-all hover:bg-white/2" style={{ borderBottom: '1px solid #1A1A1A' }}>
                <div>
                  <div className="flex items-center gap-2">
                    {isLow && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                    <p className="text-white text-sm font-medium">{m.name}</p>
                  </div>
                  <p className="text-[#606060] text-[10px] mt-0.5">{m.supplier_name || 'No supplier'}</p>
                </div>
                <div className="text-center">
                  <Badge color={categoryColors[m.category] || '#808080'}>{categoryOptions.find(c => c.value === m.category)?.label || m.category}</Badge>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>{m.current_qty} <span className="text-[10px] text-[#606060] font-normal">{m.unit}</span></p>
                  {isLow && <p className="text-[9px] text-red-400/80">Low! Min: {m.threshold_qty}</p>}
                </div>
                <div className="text-center">
                  <p className="text-white text-xs">₹{(m.current_qty * m.unit_price).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <button onClick={() => setShowTransaction({ material: m, type: 'in' })} className="p-1.5 rounded-lg transition-all hover:bg-[#22c55e]/10" style={{ border: '1px solid rgba(34,197,94,0.2)' }} title="Stock In">
                    <ArrowUp size={13} style={{ color: '#22c55e' }} />
                  </button>
                  <button onClick={() => setShowTransaction({ material: m, type: 'out' })} className="p-1.5 rounded-lg transition-all hover:bg-red-400/10" style={{ border: '1px solid rgba(239,68,68,0.2)' }} title="Stock Out">
                    <ArrowDown size={13} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
