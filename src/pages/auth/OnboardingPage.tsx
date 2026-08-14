import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HardHat, Building2, MapPin, Phone, ChevronRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/useToast';

const roles = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'site_engineer', label: 'Site Engineer' },
  { value: 'labor_supervisor', label: 'Labor Supervisor' },
  { value: 'worker', label: 'Worker' },
  { value: 'super_admin', label: 'Company Admin' },
];

const ENTERPRISE_ROLES = new Set(['executive_engineer', 'assistant_engineer', 'junior_engineer', 'contractor']);

export function OnboardingPage() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const stateData = location.state as { name?: string; email?: string } | null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: stateData?.name || '',
    company: '',
    role: 'project_manager',
    phone: '',
    location: '',
  });

  function update(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleComplete() {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      ...form,
      onboarding_complete: true,
    });
    if (error) {
      toast('Failed to save profile. Please try again.', 'error');
      setLoading(false);
      return;
    }
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan: 'trial',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    });
    await refreshProfile();
    toast('Welcome to NIRMAN AI by ARSPL!', 'success');
    navigate('/dashboard');
  }

  const steps = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Company' },
    { num: 3, label: 'Contact' },
  ];

  if (user && profileLoading) return null;
  if (profile && ENTERPRISE_ROLES.has(profile.role)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0D0D0D' }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C00)' }}>
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black tracking-wider">NIRMAN AI</p>
            <p className="text-[9px] tracking-[0.25em]" style={{ color: '#00D4AA' }}>SETUP YOUR PROFILE</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > s.num ? 'bg-[#00D4AA]' : step === s.num ? 'bg-[#FF6B00]' : 'bg-[#2A2A2A] text-[#606060]'} text-white`}>
                {step > s.num ? <CheckCircle size={14} /> : s.num}
              </div>
              <span className={`text-xs font-medium ${step === s.num ? 'text-white' : 'text-[#606060]'}`}>{s.label}</span>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-[#2A2A2A] mx-1 w-8" style={{ background: step > s.num ? 'rgba(0,212,170,0.4)' : '#2A2A2A' }} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Personal Information</h2>
                <p className="text-[#606060] text-sm">Tell us about yourself</p>
              </div>
              <Input label="Full Name" placeholder="John Doe" value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
              <Select label="Your Role" value={form.role} onChange={e => update('role', e.target.value)} options={roles} />
              <Button variant="primary" size="lg" className="w-full mt-2" onClick={() => setStep(2)} disabled={!form.full_name}>
                Continue <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Company Details</h2>
                <p className="text-[#606060] text-sm">Which company are you with?</p>
              </div>
              <Input label="Company Name" placeholder="ABC Constructions Ltd." value={form.company} onChange={e => update('company', e.target.value)} icon={<Building2 size={14} />} />
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button variant="primary" size="lg" className="flex-1" onClick={() => setStep(3)}>Continue <ChevronRight size={16} /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Contact & Location</h2>
                <p className="text-[#606060] text-sm">Almost done!</p>
              </div>
              <Input label="Phone Number" placeholder="+91 98765 43210" value={form.phone} onChange={e => update('phone', e.target.value)} icon={<Phone size={14} />} />
              <Input label="City / Location" placeholder="Mumbai, Maharashtra" value={form.location} onChange={e => update('location', e.target.value)} icon={<MapPin size={14} />} />
              <div className="flex gap-3 mt-2">
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button variant="primary" size="lg" className="flex-1" loading={loading} onClick={handleComplete}>
                  Launch Platform <CheckCircle size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
