export type OptionalBackendCapability = 'contractorRecommendations' | 'projectComponents' | 'deviceSessions';

type CapabilityState = {
  unavailable: boolean;
  warned: boolean;
};

const states: Record<OptionalBackendCapability, CapabilityState> = {
  contractorRecommendations: { unavailable: false, warned: false },
  projectComponents: { unavailable: false, warned: false },
  deviceSessions: { unavailable: false, warned: false },
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  status?: number | string | null;
};

export function isMissingBackendCapabilityError(error?: SupabaseErrorLike | null) {
  if (!error) return false;
  const hint = [error.code, error.message, error.details, error.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return hint.includes('pgrst205') || String(error.status) === '404';
}

export function isCapabilityUnavailable(capability: OptionalBackendCapability) {
  return states[capability].unavailable;
}

export function markCapabilityUnavailable(capability: OptionalBackendCapability) {
  states[capability].unavailable = true;
}

export function warnCapabilityUnavailableOnce(capability: OptionalBackendCapability, message: string) {
  const state = states[capability];
  if (state.warned || !import.meta.env.DEV) return;
  state.warned = true;
  console.warn(message);
}

export function resetOptionalBackendCapability(capability: OptionalBackendCapability) {
  states[capability] = { unavailable: false, warned: false };
}