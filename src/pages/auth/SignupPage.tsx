import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, HardHat, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !name) return;
    if (password.length < 6) { toast('Password must be at least 6 characters', 'warning'); return; }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      toast(error.message || 'Signup failed', 'error');
    } else {
      toast('Account created! Setting up your profile...', 'success');
      navigate('/onboarding', { state: { name, email } });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: '#0D0D0D' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B00, #FF8C00)' }}>
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black tracking-wider">NIRMAN AI</p>
            <p className="text-[9px] tracking-[0.25em]" style={{ color: '#00D4AA' }}>BUILDING INDIA. INTELLIGENTLY.</p>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-1">Create account</h1>
        <p className="text-[#606060] mb-8">Start your 14-day free trial. No credit card required.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={e => setName(e.target.value)}
            icon={<User size={15} />}
            required
          />
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
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock size={15} />}
            required
          />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
            Create Free Account
            <ArrowRight size={16} />
          </Button>
        </form>

        <p className="text-center text-[#606060] text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#FF6B00' }} className="font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-[#404040] text-xs mt-6">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-[#606060] hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-[#606060] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
