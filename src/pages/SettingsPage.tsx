import { useState } from 'react';
import {
  Settings, User, Bell, CreditCard, Shield, Building2,
  Save, Check, Crown, Zap
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
];

const roleOptions = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'site_engineer', label: 'Site Engineer' },
  { value: 'labor_supervisor', label: 'Labor Supervisor' },
  { value: 'worker', label: 'Worker' },
  { value: 'super_admin', label: 'Company Admin' },
];

const plans = [
  { id: 'trial', name: 'Free Trial', price: '₹0', duration: '14 days', features: ['1 site', '10 workers', 'Basic features', 'Email support'], color: '#606060' },
  { id: 'starter', name: 'Starter', price: '₹2,999', duration: '/month', features: ['1 site', '50 workers', 'All core modules', 'Priority support', 'PDF reports'], color: '#00D4AA' },
  { id: 'pro', name: 'Pro', price: '₹9,999', duration: '/month', features: ['5 sites', 'Unlimited workers', 'All features', 'AI queries unlimited', 'Dedicated account manager'], color: '#FF6B00', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: '₹49,999', duration: '/month', features: ['Unlimited sites', 'Custom integration', 'White label', 'Dedicated server', 'SLA guarantee'], color: '#F59E0B' },
];

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    company: profile?.company || '',
    role: profile?.role || 'project_manager',
    phone: profile?.phone || '',
    location: profile?.location || '',
  });
  const [notifSettings, setNotifSettings] = useState({
    problems: true, workers: true, inventory: true, surveys: true, designs: true, weekly_report: true,
  });

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
    setSaving(false);
    if (error) { toast('Failed to save profile', 'error'); return; }
    await refreshProfile();
    toast('Profile updated successfully', 'success');
  }

  return (
    <AppLayout title="Settings" subtitle="Manage your account, notifications and subscription">
      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-44 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${tab === t.id ? 'text-[#FF6B00]' : 'text-[#606060] hover:text-white hover:bg-white/3'}`}
                style={tab === t.id ? { background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.15)' } : {}}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <div className="rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <h3 className="text-white font-bold mb-5">Profile Information</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: 'rgba(255,107,0,0.15)', color: '#FF6B00' }}>
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-white font-semibold">{profile?.full_name}</p>
                  <p className="text-[#606060] text-sm">{profile?.email}</p>
                  <button className="text-xs mt-1" style={{ color: '#FF6B00' }}>Change Photo</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
                <Input label="Company" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} icon={<Building2 size={13} />} />
                <Select label="Role" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} options={roleOptions} />
                <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                <div className="col-span-2">
                  <Input label="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <Button variant="primary" size="md" className="mt-5" loading={saving} icon={<Save size={14} />} onClick={saveProfile}>
                Save Changes
              </Button>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <h3 className="text-white font-bold mb-5">Notification Preferences</h3>
              <div className="flex flex-col gap-4">
                {Object.entries(notifSettings).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-[#232323]">
                    <div>
                      <p className="text-white text-sm font-medium capitalize">{key.replace('_', ' ')} Alerts</p>
                      <p className="text-[#606060] text-xs mt-0.5">
                        {key === 'problems' ? 'When new problems are reported or assigned to you' :
                          key === 'workers' ? 'Attendance and workforce updates' :
                          key === 'inventory' ? 'Low stock and material alerts' :
                          key === 'surveys' ? 'Drone survey completion and findings' :
                          key === 'designs' ? 'AI design generation updates' :
                          'Weekly performance summary every Monday'}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotifSettings(p => ({ ...p, [key]: !val }))}
                      className="w-10 h-5.5 rounded-full transition-all duration-300 relative"
                      style={{ background: val ? '#FF6B00' : '#2A2A2A', width: '40px', height: '22px' }}
                    >
                      <span className="absolute top-0.5 rounded-full bg-white transition-all duration-300 w-4 h-4"
                        style={{ left: val ? '20px' : '2px' }} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="primary" size="md" className="mt-5" icon={<Check size={14} />} onClick={() => toast('Notification preferences saved', 'success')}>
                Save Preferences
              </Button>
            </div>
          )}

          {tab === 'subscription' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map(plan => (
                  <div
                    key={plan.id}
                    className="rounded-2xl p-5 relative transition-all"
                    style={{ background: '#1A1A1A', border: plan.popular ? `1px solid ${plan.color}40` : '1px solid #232323' }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1" style={{ background: '#FF6B00' }}>
                        <Crown size={9} /> Most Popular
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-bold">{plan.name}</p>
                        <div className="flex items-end gap-1 mt-1">
                          <p className="text-xl font-black" style={{ color: plan.color }}>{plan.price}</p>
                          <p className="text-[#606060] text-xs mb-0.5">{plan.duration}</p>
                        </div>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1.5 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-[#A0A0A0]">
                          <Check size={10} style={{ color: plan.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.id === 'pro' ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full"
                      onClick={() => toast('Redirecting to payment...', 'info')}
                    >
                      {plan.id === 'trial' ? 'Current Plan' : 'Upgrade Now'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="rounded-2xl p-6" style={{ background: '#1A1A1A', border: '1px solid #232323' }}>
              <h3 className="text-white font-bold mb-5">Security Settings</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-white text-sm font-semibold mb-3">Change Password</h4>
                  <div className="flex flex-col gap-3">
                    <Input label="Current Password" type="password" placeholder="••••••••" />
                    <Input label="New Password" type="password" placeholder="••••••••" />
                    <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                  </div>
                  <Button variant="primary" size="md" className="mt-4" onClick={() => toast('Password update coming soon', 'info')}>Update Password</Button>
                </div>
                <div className="pt-4 border-t border-[#232323]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white text-sm font-semibold">Two-Factor Authentication</h4>
                      <p className="text-[#606060] text-xs mt-0.5">Add extra security to your account</p>
                    </div>
                    <Button size="sm" variant="secondary" icon={<Shield size={13} />} onClick={() => toast('2FA setup coming soon', 'info')}>
                      Enable 2FA
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t border-[#232323]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-red-400 text-sm font-semibold">Delete Account</h4>
                      <p className="text-[#606060] text-xs mt-0.5">Permanently delete your account and all data</p>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => toast('Contact support to delete account', 'warning')}>
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
