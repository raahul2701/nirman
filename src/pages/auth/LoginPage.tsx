import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Zap, ArrowRight, ShieldCheck, Landmark, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/useToast';
import { BRANDING } from '../../constants/branding';
import { AUTH_CALLBACK_URL } from '../../lib/authCallback';
import { supabase } from '../../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error, user } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast(error.message || 'Invalid credentials', 'error');
    } else if (user?.user_metadata?.must_change_password) {
      setMustChangePassword(true);
      toast('Set a new password before continuing.', 'info');
    } else {
      navigate('/dashboard');
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast('Use at least 8 characters for the new password.', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (error) {
      toast(error.message || 'Password change failed', 'error');
      return;
    }
    toast('Password updated. Welcome in.', 'success');
    navigate('/dashboard');
  }

  async function handlePasswordRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: AUTH_CALLBACK_URL,
      });
    } catch {
      // Keep the response generic to avoid revealing whether this email is registered.
    } finally {
      setLoading(false);
    }
    toast('If the email is registered, a password reset link has been sent.', 'success');
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface)' }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #062E24 0%, #005F56 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(#D8B15A 1px, transparent 1px), linear-gradient(90deg, #D8B15A 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />

        <div className="relative z-10">
          <img src={BRANDING.LOGO_PATH} alt="ARSPL NIRMAN AI" className="arspl-logo w-64 rounded-lg" />
        </div>

        <div className="relative z-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em]" style={{ color: '#D8B15A' }}>{BRANDING.EXECUTIVE_LABEL}</p>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            National Infra<br />
            <span style={{ color: '#D8B15A' }}>Operations Command</span>
          </h2>
          <p className="text-white/70 text-base mb-8 max-w-xl">
            Enterprise AI construction management by ARSPL for projects, field evidence, payments, inspections, and executive oversight.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Project Control', value: 'Live', icon: Landmark },
              { label: 'AI Oversight', value: 'Ready', icon: Zap },
              { label: 'Field Sync', value: 'Secure', icon: ShieldCheck },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(216,177,90,0.24)' }}>
                <stat.icon size={18} style={{ color: '#D8B15A' }} />
                <p className="text-white font-bold text-lg mt-3">{stat.value}</p>
                <p className="text-white/55 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <Activity size={12} style={{ color: '#D8B15A' }} />
          <span className="text-[11px] text-white/60">ARSPL green and gold enterprise command environment</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <img src={BRANDING.LOGO_PATH} alt="ARSPL NIRMAN AI" className="arspl-logo w-56 rounded-lg" />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-command" style={{ border: '1px solid var(--border)' }}>
            <h1 className="text-3xl font-black text-[#12332D] mb-1">{recoveryMode ? 'Reset your password' : 'Welcome back'}</h1>
            <p className="text-[#6C7568] mb-8">{recoveryMode ? 'Enter your email to receive a reset link.' : 'Sign in to ARSPL NIRMAN command'}</p>

            <form onSubmit={mustChangePassword ? handlePasswordChange : recoveryMode ? handlePasswordRecovery : handleSubmit} className="flex flex-col gap-4">
              {!mustChangePassword && <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<Mail size={15} />}
                required
              />}
              {!recoveryMode && <Input
                label={mustChangePassword ? 'New Password' : 'Password'}
                type="password"
                autoComplete={mustChangePassword ? 'new-password' : 'current-password'}
                placeholder={mustChangePassword ? 'New password' : 'Password'}
                value={mustChangePassword ? newPassword : password}
                onChange={e => mustChangePassword ? setNewPassword(e.target.value) : setPassword(e.target.value)}
                icon={<Lock size={15} />}
                required
              />}
              {!mustChangePassword && !recoveryMode && <div className="flex justify-end">
                <button type="button" onClick={() => setRecoveryMode(true)} className="text-xs font-semibold" style={{ color: '#005F56' }}>Forgot password?</button>
              </div>}
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
                {mustChangePassword ? 'Update Password' : recoveryMode ? 'Send Reset Link' : 'Sign In'}
                <ArrowRight size={16} />
              </Button>
            </form>

            {recoveryMode ? <p className="text-center text-[#6C7568] text-sm mt-6">
              <button type="button" onClick={() => setRecoveryMode(false)} style={{ color: '#005F56' }} className="font-semibold hover:underline">Back to sign in</button>
            </p> : <p className="text-center text-[#6C7568] text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#005F56' }} className="font-semibold hover:underline">
                Create account
              </Link>
            </p>}
          </div>
        </div>
      </div>
    </div>
  );
}