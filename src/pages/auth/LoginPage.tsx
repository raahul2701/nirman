import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, HardHat, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast(error.message || 'Invalid credentials', 'error');
    } else {
      navigate('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0D0D' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #111118 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, #FF6B00 40px, #FF6B00 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #FF6B00 40px, #FF6B00 41px)`
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C00)' }}>
              <HardHat size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-wider">NIRMAN AI</p>
              <p className="text-[10px] tracking-[0.3em] font-medium" style={{ color: '#00D4AA' }}>BUILDING INDIA. INTELLIGENTLY.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Build Smarter.<br />
            <span style={{ color: '#FF6B00' }}>Manage Faster.</span>
          </h2>
          <p className="text-[#808080] text-base mb-8">
            AI-powered construction management platform by ARSPL. Trusted by contractors across India.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Projects', value: '12,400+' },
              { label: 'Issues Resolved', value: '98,000+' },
              { label: 'Workers Tracked', value: '2.4L+' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-4" style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.12)' }}>
                <p className="text-white font-bold text-lg">{stat.value}</p>
                <p className="text-[#606060] text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <Zap size={12} style={{ color: '#00D4AA' }} />
          <span className="text-[11px] text-[#606060]">Powered by Claude AI · Supabase · Real-time</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C00)' }}>
              <HardHat size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black tracking-wider">NIRMAN AI</p>
              <p className="text-[9px] tracking-[0.25em]" style={{ color: '#00D4AA' }}>BUILDING INDIA. INTELLIGENTLY.</p>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-1">Welcome back</h1>
          <p className="text-[#606060] mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={15} />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={15} />}
              required
            />
            <div className="flex justify-end">
              <a href="#" className="text-xs" style={{ color: '#FF6B00' }}>Forgot password?</a>
            </div>
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
              Sign In
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-[#606060] text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#FF6B00' }} className="font-semibold hover:underline">
              Create account
            </Link>
          </p>

          <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.12)' }}>
            <p className="text-[11px] font-semibold mb-2" style={{ color: '#00D4AA' }}>Demo Credentials</p>
            <p className="text-[#606060] text-xs">Email: demo@nirmanai.com</p>
            <p className="text-[#606060] text-xs">Password: demo1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
