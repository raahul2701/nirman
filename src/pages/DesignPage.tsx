import { useCallback, useEffect, useState } from 'react';
import {
  Brain, Plus, X, Zap,
  Home, Building2, Factory, Layers, DollarSign, MapPin,
  CheckCircle, Loader2
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { invokeAiAnalyze } from '../services/ai/aiService';
import { useAuth } from '../contexts/useAuth';
import { useToast } from '../components/ui/useToast';
import { Design } from '../types';
import { formatDistanceToNow } from '../lib/utils';

const projectTypes = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'renovation', label: 'Renovation' },
];

const soilTypes = [
  { value: 'rocky', label: 'Rocky / Hard Rock' },
  { value: 'clay', label: 'Clay / Soft Soil' },
  { value: 'sandy', label: 'Sandy Soil' },
  { value: 'loamy', label: 'Loamy Soil' },
  { value: 'alluvial', label: 'Alluvial Soil' },
  { value: 'unknown', label: 'Unknown / Not Tested' },
];

const typeIcons: Record<string, typeof Home> = {
  residential: Home,
  commercial: Building2,
  industrial: Factory,
  infrastructure: Layers,
  renovation: Home,
};

export function DesignPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const toast = useToast();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [form, setForm] = useState({
    project_type: 'residential',
    area_sqft: '',
    budget_min: '',
    budget_max: '',
    floors: '1',
    location: '',
    soil_type: 'unknown',
    requirements: '',
  });

  const loadDesigns = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('designs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setDesigns(data as Design[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadDesigns();
  }, [loadDesigns, userId]);

  async function generateDesign() {
    if (!userId) return;
    if (!form.area_sqft) { toast('Please enter the area in sq ft', 'warning'); return; }
    setGenerating(true);

    const title = `${form.floors}-floor ${form.project_type} — ${form.area_sqft} sq ft`;
    const { data, error } = await supabase.from('designs').insert({
      user_id: userId,
      project_type: form.project_type,
      area_sqft: parseFloat(form.area_sqft),
      budget_min: parseFloat(form.budget_min) || 0,
      budget_max: parseFloat(form.budget_max) || 0,
      floors: parseInt(form.floors) || 1,
      location: form.location,
      soil_type: form.soil_type,
      requirements: form.requirements,
      status: 'generating',
      title,
    }).select().maybeSingle();

    if (error) { toast('Failed to create design', 'error'); setGenerating(false); return; }

    try {
      const aiData = await invokeAiAnalyze<{ output?: string }>({
        type: 'design',
        project_type: form.project_type,
        area_sqft: form.area_sqft,
        budget_min: form.budget_min,
        budget_max: form.budget_max,
        floors: form.floors,
        location: form.location,
        soil_type: form.soil_type,
        requirements: form.requirements,
      }, {
        retries: 2,
        timeoutMs: 25000,
        cacheTTLms: 5 * 60 * 1000,
        quotaKey: 'designGeneration',
        maxQuotaPerDay: 30,
        errorMessage: 'Design generation failed'
      });
      await supabase.from('designs').update({ ai_output: aiData.output || '', status: 'complete' }).eq('id', data!.id);
      toast('Design generated successfully!', 'success');
    } catch {
      await supabase.from('designs').update({ status: 'failed' }).eq('id', data!.id);
      toast('AI generation failed. Saved as draft.', 'warning');
    }

    setGenerating(false);
    setShowForm(false);
    await loadDesigns();
  }

  return (
    <AppLayout title="AI Design Assistant" subtitle="Generate complete design briefs and cost estimates with AI">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.2)' }}>
            <Brain size={20} style={{ color: '#FF6B00' }} />
          </div>
          <div>
            <p className="text-white font-semibold">{designs.length} Designs</p>
            <p className="text-[#606060] text-xs">AI-generated construction briefs</p>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>New Design</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Brain size={18} style={{ color: '#FF6B00' }} />
                <h2 className="text-white font-bold text-lg">Generate AI Design Brief</h2>
              </div>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-[#606060]" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Project Type" value={form.project_type} onChange={e => setForm(p => ({ ...p, project_type: e.target.value }))} options={projectTypes} />
              <Input label="Area (sq ft)" type="number" placeholder="1200" value={form.area_sqft} onChange={e => setForm(p => ({ ...p, area_sqft: e.target.value }))} />
              <Input label="Budget Min (₹ Lakhs)" type="number" placeholder="20" value={form.budget_min} onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))} icon={<DollarSign size={13} />} />
              <Input label="Budget Max (₹ Lakhs)" type="number" placeholder="40" value={form.budget_max} onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} icon={<DollarSign size={13} />} />
              <Input label="Number of Floors" type="number" placeholder="2" value={form.floors} onChange={e => setForm(p => ({ ...p, floors: e.target.value }))} icon={<Layers size={13} />} />
              <Input label="City / Location" placeholder="Pune, Maharashtra" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} icon={<MapPin size={13} />} />
              <Select label="Soil Type" value={form.soil_type} onChange={e => setForm(p => ({ ...p, soil_type: e.target.value }))} options={soilTypes} />
              <div className="col-span-2">
                <Textarea label="Special Requirements" placeholder="4 bedrooms, 2 car parking, solar panels, vastu compliance..." value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} rows={3} />
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={12} style={{ color: '#00D4AA' }} />
                <span className="text-[#00D4AA] text-xs font-semibold">AI will generate</span>
              </div>
              <p className="text-[#606060] text-xs">Design brief · Room layout suggestions · Material quantities · Cost estimate · Timeline · NBC compliance checklist · Risk assessment</p>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" className="flex-1" loading={generating} icon={<Brain size={14} />} onClick={generateDesign}>
                {generating ? 'Generating...' : 'Generate Design Brief'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Design Detail Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 overflow-y-auto max-h-[90vh]" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[#606060] text-xs mb-1 capitalize">{selectedDesign.project_type} · {selectedDesign.floors} floor{selectedDesign.floors > 1 ? 's' : ''} · {selectedDesign.area_sqft.toLocaleString()} sq ft</p>
                <h2 className="text-white font-bold text-lg">{selectedDesign.title}</h2>
              </div>
              <button onClick={() => setSelectedDesign(null)}><X size={18} className="text-[#606060]" /></button>
            </div>

            {selectedDesign.budget_min > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 rounded-xl p-3" style={{ background: '#111111' }}>
                  <p className="text-[#606060] text-xs mb-0.5">Budget Range</p>
                  <p className="text-white text-sm font-semibold">₹{selectedDesign.budget_min}L – ₹{selectedDesign.budget_max}L</p>
                </div>
                <div className="flex-1 rounded-xl p-3" style={{ background: '#111111' }}>
                  <p className="text-[#606060] text-xs mb-0.5">Location</p>
                  <p className="text-white text-sm font-semibold">{selectedDesign.location || 'Not specified'}</p>
                </div>
              </div>
            )}

            {selectedDesign.ai_output ? (
              <div className="rounded-xl p-4" style={{ background: '#111111' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={13} style={{ color: '#00D4AA' }} />
                  <span className="text-[#00D4AA] text-xs font-semibold">AI Design Brief</span>
                </div>
                <div className="text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-wrap">{selectedDesign.ai_output}</div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                {selectedDesign.status === 'generating' ? (
                  <div className="flex items-center gap-2 text-[#FF6B00]">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">AI is generating your design...</span>
                  </div>
                ) : (
                  <p className="text-[#606060] text-sm">Design generation failed. Please try again.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: '#1A1A1A' }} />)}
        </div>
      ) : designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Brain size={48} className="text-[#2A2A2A] mb-4" />
          <p className="text-white font-semibold mb-1">No designs yet</p>
          <p className="text-[#606060] text-sm mb-4">Generate your first AI design brief</p>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>Create Design</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map(d => {
            const Icon = typeIcons[d.project_type] || Home;
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDesign(d)}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:border-[#FF6B00]/30"
                style={{ background: '#1A1A1A', border: '1px solid #232323' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.2)' }}>
                    <Icon size={18} style={{ color: '#FF6B00' }} />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{
                    background: d.status === 'complete' ? 'rgba(34,197,94,0.1)' : d.status === 'generating' ? 'rgba(255,107,0,0.1)' : 'rgba(239,68,68,0.1)',
                    color: d.status === 'complete' ? '#22c55e' : d.status === 'generating' ? '#FF6B00' : '#ef4444'
                  }}>
                    {d.status}
                  </span>
                </div>
                <p className="text-white font-semibold text-sm mb-1 line-clamp-2">{d.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#606060] text-[10px]">{formatDistanceToNow(d.created_at)}</span>
                  {d.status === 'complete' && <CheckCircle size={10} style={{ color: '#22c55e' }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
