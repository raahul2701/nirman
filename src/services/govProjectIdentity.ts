import { supabase } from '../lib/supabase';

export const GOV_PROJECT_IDENTITY_BLOCKED_MESSAGE = 'Your Executive Engineer profile is not linked to the government project identity model.';

export type GovProjectEngineerIdentity = {
  engineerId: string | null;
  compatibleWithAuthRls: boolean;
  reason?: string;
};

type UserProfileIdentityRow = {
  id: string;
};

export async function resolveGovProjectEngineerIdentity(authUserId: string): Promise<GovProjectEngineerIdentity> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', authUserId)
    .limit(2);

  if (error) {
    throw new Error(`user_profiles identity lookup failed: ${error.message}`);
  }

  const matches = (data || []) as UserProfileIdentityRow[];
  if (matches.length === 0) {
    return {
      engineerId: null,
      compatibleWithAuthRls: false,
      reason: GOV_PROJECT_IDENTITY_BLOCKED_MESSAGE,
    };
  }

  if (matches.length > 1 && import.meta.env.DEV) {
    console.warn('[gov-project-identity] duplicate user_profiles identity rows detected', { authUserId });
  }

  const engineerId = matches[0]?.id || null;
  return {
    engineerId,
    compatibleWithAuthRls: engineerId === authUserId,
    reason: engineerId === authUserId ? undefined : 'Government project identity does not satisfy the current auth.uid() RLS policy.',
  };
}
