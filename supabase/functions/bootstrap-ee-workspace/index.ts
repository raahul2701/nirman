import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

type BootstrapRequestBody = {
  workspace_name?: string | null;
  division_code?: string | null;
  department?: string | null;
  district?: string | null;
};

type WorkspaceRow = {
  id: string;
  workspace_name: string | null;
  executive_engineer_id: string | null;
  division_code?: string | null;
  department?: string | null;
  district?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  email?: string | null;
  full_name?: string | null;
};

type MembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string | null;
  active: boolean | null;
  full_name?: string | null;
  email?: string | null;
  free_lifetime?: boolean | null;
  created_at?: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

async function buildDeterministicStorageNamespace(callerId: string, workspaceName: string) {
  const seed = `${callerId}:${workspaceName}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hashHex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const callerFragment = callerId.replace(/-/g, '').slice(0, 12).toLowerCase();
  return `ee_${callerFragment}_${hashHex.slice(0, 24)}`;
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function buildFallbackName(profile: ProfileRow | null | undefined, email?: string | null) {
  const fullName = normalizeText(profile?.full_name);
  if (fullName) return fullName;
  const emailName = normalizeText(email || profile?.email || null).split('@')[0];
  return emailName || 'Executive Engineer';
}

async function parseBody(req: Request): Promise<BootstrapRequestBody> {
  try {
    const text = await req.text();
    if (!text.trim()) return {} as BootstrapRequestBody;
    return JSON.parse(text) as BootstrapRequestBody;
  } catch {
    return {} as BootstrapRequestBody;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[bootstrap-ee-workspace] missing Supabase configuration');
    return json({ success: false, error: 'Service unavailable' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let callerId: string | null = null;
  try {
    const { data, error } = await client.auth.getUser(jwt);
    if (error || !data.user?.id) {
      return json({ success: false, error: 'Unauthorized' }, 401);
    }
    callerId = data.user.id;
  } catch {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  if (!callerId) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  let profile: ProfileRow | null = null;
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, role, email, full_name')
      .eq('id', callerId)
      .maybeSingle();

    if (error) throw error;
    profile = data as ProfileRow | null;
  } catch (error) {
    console.warn('[bootstrap-ee-workspace] profile lookup failed', safeError(error));
    return json({ success: false, error: 'Forbidden' }, 403);
  }

  if (!profile || profile.role !== 'executive_engineer') {
    return json({ success: false, error: 'Forbidden' }, 403);
  }

  const body = await parseBody(req);
  const requestedWorkspaceName = normalizeText(body.workspace_name);
  if (!requestedWorkspaceName) {
    return json({ success: false, error: 'workspace_name is required' }, 400);
  }
  const requestedDivisionCode = normalizeText(body.division_code) || null;
  const requestedDepartment = normalizeText(body.department) || null;
  const requestedDistrict = normalizeText(body.district) || null;
  const fallbackName = buildFallbackName(profile, profile.email || null);

  let workspace: WorkspaceRow | null = null;
  let wasCreated = false;

  try {
    const { data, error } = await client
      .from('executive_engineer_workspaces')
      .select('id, workspace_name, executive_engineer_id, division_code, department, district, status, created_at')
      .eq('executive_engineer_id', callerId)
      .eq('workspace_name', requestedWorkspaceName)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    workspace = data as WorkspaceRow | null;
  } catch (error) {
    console.error('[bootstrap-ee-workspace] exact workspace lookup failed', safeError(error));
    return json({ success: false, error: 'Service unavailable' }, 500);
  }

  if (!workspace) {
    const deterministicStorageNamespace = await buildDeterministicStorageNamespace(callerId, requestedWorkspaceName);
    const insertPayload = {
      executive_engineer_id: callerId,
      workspace_name: requestedWorkspaceName,
      division_code: requestedDivisionCode || `EE-${callerId.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      department: requestedDepartment || 'General',
      district: requestedDistrict,
      status: 'active',
      executive_engineer_name: fallbackName,
      executive_engineer_email: profile.email || null,
      storage_namespace: deterministicStorageNamespace,
    };

    try {
      const { data, error } = await client
        .from('executive_engineer_workspaces')
        .insert(insertPayload)
        .select('id, workspace_name, executive_engineer_id, division_code, department, district, status, created_at')
        .maybeSingle();

      if (error) {
        const exactRetry = await client
          .from('executive_engineer_workspaces')
          .select('id, workspace_name, executive_engineer_id, division_code, department, district, status, created_at')
          .eq('executive_engineer_id', callerId)
          .eq('workspace_name', requestedWorkspaceName)
          .limit(1)
          .maybeSingle();

        if (exactRetry.error || !exactRetry.data) {
          throw error;
        }

        workspace = exactRetry.data as WorkspaceRow | null;
      } else {
        workspace = data as WorkspaceRow | null;
        wasCreated = Boolean(workspace);
      }
    } catch (error) {
      console.error('[bootstrap-ee-workspace] workspace creation failed', safeError(error));
      return json({ success: false, error: 'Service unavailable' }, 500);
    }
  }

  if (!workspace?.id) {
    return json({ success: false, error: 'Conflict' }, 409);
  }

  let membership: MembershipRow | null = null;
  try {
    const { data, error } = await client
      .from('workspace_users')
      .select('id, workspace_id, user_id, role, active, full_name, email, free_lifetime, created_at')
      .eq('workspace_id', workspace.id)
      .eq('user_id', callerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const rows = (data as MembershipRow[] | null) || [];
    membership = rows.find((row) => row.role === 'executive_engineer') || rows[0] || null;
  } catch (error) {
    console.error('[bootstrap-ee-workspace] workspace membership lookup failed', safeError(error));
    return json({ success: false, error: 'Service unavailable' }, 500);
  }

  if (membership?.id) {
    const nextFullName = buildFallbackName(profile, membership.email || profile.email || null);
    const updatePayload = {
      role: 'executive_engineer',
      full_name: nextFullName,
      email: profile.email || membership.email || null,
      active: true,
      free_lifetime: membership.free_lifetime ?? true,
      parent_user_id: null,
      subdivision_name: null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await client
        .from('workspace_users')
        .update(updatePayload)
        .eq('id', membership.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      membership = { ...membership, ...(data || {}), role: 'executive_engineer', active: true } as MembershipRow;
    } catch (error) {
      console.error('[bootstrap-ee-workspace] membership update failed', safeError(error));
      return json({ success: false, error: 'Service unavailable' }, 500);
    }
  } else {
    const insertPayload = {
      workspace_id: workspace.id,
      user_id: callerId,
      role: 'executive_engineer',
      full_name: fallbackName,
      email: profile.email || null,
      parent_user_id: null,
      subdivision_name: null,
      free_lifetime: true,
      active: true,
    };

    try {
      const { data, error } = await client
        .from('workspace_users')
        .insert(insertPayload)
        .select('id')
        .maybeSingle();

      if (error) {
        const exactMembershipRetry = await client
          .from('workspace_users')
          .select('id, workspace_id, user_id, role, active, full_name, email, free_lifetime, created_at')
          .eq('workspace_id', workspace.id)
          .eq('user_id', callerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (exactMembershipRetry.error || !exactMembershipRetry.data) {
          throw error;
        }

        membership = exactMembershipRetry.data as MembershipRow;
      } else {
        membership = data as MembershipRow | null;
      }
    } catch (error) {
      console.error('[bootstrap-ee-workspace] membership creation failed', safeError(error));
      return json({ success: false, error: 'Service unavailable' }, 500);
    }
  }

  const responsePayload = {
    success: true,
    workspace_id: workspace.id,
    workspace_name: workspace.workspace_name || requestedWorkspaceName,
    executive_engineer_id: callerId,
    membership_id: membership?.id || null,
    role: 'executive_engineer',
    created: wasCreated,
  };

  console.info('[bootstrap-ee-workspace] bootstrap complete', {
    callerId: callerId.slice(0, 8),
    workspaceId: workspace.id,
    created: wasCreated,
    membershipId: membership?.id || null,
  });

  return json(responsePayload, 200);
});
