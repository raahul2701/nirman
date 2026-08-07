import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/useToast';
import { supabase } from '../../lib/supabase';
import { BRANDING } from '../../constants/branding';

export function CreatePasswordPage() {
  const [searchParams] = useSearchParams();
  const flowType = searchParams.get('type');
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const title = useMemo(() => flowType === 'recovery' ? 'Create a new password' : 'Create your password', [flowType]);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSessionReady(Boolean(data.session));
      setCheckingSession(false);
    }
    void checkSession();
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast('Use at least 8 characters for the new password.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        invitation_accepted: flowType === 'invite' ? true : undefined,
        password_created_at: new Date().toISOString(),
        must_change_password: false,
      },
    });

    if (error) {
      setLoading(false);
      toast(error.message || 'Password could not be saved.', 'error');
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    toast('Password saved. Please log in.', 'success');
    navigate('/login', { replace: true });
  }

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F7F3E8] text-sm text-[#005F56]">Checking invite session...</div>;
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3E8] p-6">
        <div className="max-w-md rounded-lg border border-[#D9D0B5] bg-white p-6 text-center shadow-command">
          <p className="font-semibold text-[#12332D]">Invite session missing</p>
          <p className="mt-2 text-sm text-[#6C7568]">Open the latest invite email again to create your password.</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-[#005F56]">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3E8] p-6">
      <div className="w-full max-w-md rounded-lg border border-[#D9D0B5] bg-white p-6 shadow-command">
        <img src={BRANDING.LOGO_PATH} alt="ARSPL NIRMAN AI" className="arspl-logo mb-8 w-56 rounded-lg" />
        <h1 className="text-3xl font-black text-[#12332D]">{title}</h1>
        <p className="mb-8 mt-2 text-sm text-[#6C7568]">No old password is required. Set a password for your invited account.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="New Password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock size={15} />} required />
          <Input label="Confirm Password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} icon={<Lock size={15} />} required />
          <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-2 w-full">
            Save Password
            <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
