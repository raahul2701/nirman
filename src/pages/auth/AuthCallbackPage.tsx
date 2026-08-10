import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AuthFlowType = 'invite' | 'recovery';
const CALLBACK_TIMEOUT_MS = 15_000;

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
    let timedOut = false;
    let callbackSessionUserId: string | null = null;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      if (active) {
        setError('Invalid or expired authentication link.');
      }
    }, CALLBACK_TIMEOUT_MS);

    async function handleCallback() {
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const tokenHash = params.get('token_hash') || params.get('token');

      try {
        if (accessToken && refreshToken) {
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          const existingUserId = existingSession?.user?.id ?? null;
          console.info('[NIRMAN-AUTH-TRACE]', {
            pathname: window.location.pathname,
            type,
            has_access_token: Boolean(accessToken),
            has_refresh_token: Boolean(refreshToken),
            has_token_hash: Boolean(tokenHash),
            existing_user_id: existingUserId,
          });

          const { data: setSessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          callbackSessionUserId = setSessionData.session?.user?.id ?? null;
          console.info('[NIRMAN-AUTH-TRACE]', {
            set_session_success: !sessionError,
            set_session_user_id: callbackSessionUserId,
          });
          if (sessionError) throw sessionError;
        } else if (tokenHash && type) {
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          callbackSessionUserId = verifyData.session?.user?.id ?? null;
          console.info('[NIRMAN-AUTH-TRACE]', {
            verify_otp_success: !verifyError,
            verify_otp_user_id: callbackSessionUserId,
          });
          if (verifyError) throw verifyError;
        } else {
          throw new Error('Authentication link is missing supported Supabase callback parameters.');
        }

        const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
        const sessionUserId = sessionData.session?.user?.id ?? null;
        console.info('[NIRMAN-AUTH-TRACE]', {
          get_session_success: !getSessionError,
          get_session_user_id: sessionUserId,
        });
        if (getSessionError) throw getSessionError;
        if (!sessionData.session?.user) {
          throw new Error('Authentication session could not be established.');
        }
        if (type === 'recovery' && (!callbackSessionUserId || sessionUserId !== callbackSessionUserId)) {
          throw new Error('Recovery session could not be established.');
        }

        if (!active || timedOut) return;

        if (type === 'recovery') {
          navigate('/create-password?flow=recovery&type=recovery', { replace: true });
          return;
        }

        if (isPasswordCreationFlow(type)) {
          navigate(`/create-password?flow=${type}&type=${type}`, { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      } catch {
        if (!active || timedOut) return;
        setError('Invalid or expired authentication link.');
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void handleCallback();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
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