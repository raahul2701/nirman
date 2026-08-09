import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AuthFlowType = 'invite' | 'recovery';

function paramsFromLocation(location: ReturnType<typeof useLocation>) {
  const params = new URLSearchParams(location.search);
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const hashParams = new URLSearchParams(hash);
  hashParams.forEach((value, key) => params.set(key, value));
  return params;
}

function isPasswordCreationFlow(type: string | null): type is AuthFlowType {
  return type === 'invite' || type === 'recovery';
}

export function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const params = useMemo(() => paramsFromLocation(location), [location]);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const tokenHash = params.get('token_hash') || params.get('token');

      console.info('AuthCallbackPage callback parameters', {
        type,
        has_access_token: Boolean(accessToken),
        has_refresh_token: Boolean(refreshToken),
        has_token_hash: Boolean(tokenHash),
      });

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (verifyError) throw verifyError;
        } else {
          throw new Error('Authentication link is missing supported Supabase callback parameters.');
        }

        const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;
        if (!sessionData.session?.user) {
          throw new Error('Authentication session could not be established.');
        }

        if (!active) return;

        if (isPasswordCreationFlow(type)) {
          navigate(`/create-password?flow=${type}&type=${type}`, { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      } catch {
        if (!active) return;
        setError('Invalid or expired authentication link.');
      }
    }

    void handleCallback();
    return () => { active = false; };
  }, [navigate, params]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3E8] p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-command">
          <p className="font-semibold text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3E8]">
      <div className="flex items-center gap-3 text-[#005F56]">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Verifying your authentication link...</span>
      </div>
    </div>
  );
}