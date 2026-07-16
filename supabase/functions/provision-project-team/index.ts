import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type TeamRole = 'assistant_engineer' | 'junior_engineer' | 'contractor';
type StageName = 'identity_lookup' | 'auth_invitation' | 'profile_creation' | 'workspace_membership' | 'project_assignment' | 'letter_generation' | 'notification_delivery';
type StageStatus = 'pending' | 'success' | 'skipped' | 'failed' | 'not_configured';

type TeamMemberInput = {
  role: TeamRole;
  fullName: string;
  email: string;
  phone?: string | null;
  employeeCode?: string | null;
  licenceNumber?: string | null;
  companyName?: string | null;
};

type RequestBody = {
  workspaceId?: string;
  projectId?: string;
  projectTable?: 'gov_projects' | 'projects';
  members?: TeamMemberInput[];
};

type StageResult = { stage: StageName; status: StageStatus; message?: string };
type ProjectDetails = {
  id: string;
  projectName: string;
  projectCode: string;
  department: string | null;
  location: string | null;
  contractorName?: string | null;
};

type WorkspaceDetails = {
  id: string;
  workspace_name?: string | null;
  division_code?: string | null;
  department?: string | null;
  district?: string | null;
  executive_engineer_id?: string | null;
  executive_engineer_name?: string | null;
  executive_engineer_email?: string | null;
};

const allowedRoles = new Set<TeamRole>(['assistant_engineer', 'junior_engineer', 'contractor']);
const roleColumn: Record<TeamRole, 'assistant_engineer_id' | 'junior_engineer_id' | 'contractor_id'> = {
  assistant_engineer: 'assistant_engineer_id',
  junior_engineer: 'junior_engineer_id',
  contractor: 'contractor_id',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function stage(stage: StageName, status: StageStatus, message?: string): StageResult {
  return { stage, status, ...(message ? { message } : {}) };
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function nextFailureStage(stages: StageResult[]): StageName {
  const completed = new Set(stages.filter((item) => item.status === 'success' || item.status === 'skipped').map((item) => item.stage));
  const order: StageName[] = ['identity_lookup', 'auth_invitation', 'profile_creation', 'workspace_membership', 'project_assignment', 'letter_generation', 'notification_delivery'];
  return order.find((item) => !completed.has(item)) || 'notification_delivery';
}

function sanitizeMember(member: TeamMemberInput) {
  return {
    role: member.role,
    fullName: String(member.fullName || '').trim(),
    email: normalizeEmail(member.email),
    phone: member.phone ? String(member.phone).trim() : null,
    employeeCode: member.employeeCode ? String(member.employeeCode).trim() : null,
    licenceNumber: member.licenceNumber ? String(member.licenceNumber).trim() : null,
    companyName: member.companyName ? String(member.companyName).trim() : null,
  };
}

function letterFor(input: {
  workspace: WorkspaceDetails;
  project: ProjectDetails;
  member: ReturnType<typeof sanitizeMember>;
  userId: string;
  activationLink: string | null;
}) {
  const issuedAt = new Date();
  const expiry = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000);
  const projectCode = input.project.projectCode || input.project.id.slice(0, 8);
  const roleLabel = input.member.role.replace(/_/g, ' ');
  return {
    reference: `NIRMAN-${projectCode}-${input.member.role}-${issuedAt.toISOString().slice(0, 10).replace(/-/g, '')}`,
    projectName: input.project.projectName,
    projectCode,
    department: input.project.department,
    location: input.project.location || input.workspace.district || null,
    workspace: input.workspace.workspace_name || input.workspace.division_code || input.workspace.id,
    memberFullName: input.member.fullName,
    role: roleLabel,
    company: input.member.role === 'contractor' ? input.member.companyName : input.workspace.department || null,
    loginId: input.member.email,
    activationLink: input.activationLink,
    activationExpiry: input.activationLink ? expiry.toISOString() : null,
    eeName: input.workspace.executive_engineer_name || 'Executive Engineer',
    eeContact: input.workspace.executive_engineer_email || null,
    issueDate: issuedAt.toISOString(),
  };
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user: { email?: string }) => normalizeEmail(user.email || '') === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function loadProject(supabase: ReturnType<typeof createClient>, projectTable: 'gov_projects' | 'projects', projectId: string): Promise<ProjectDetails> {
  if (projectTable === 'gov_projects') {
    const { data, error } = await supabase
      .from('gov_projects')
      .select('id, project_name, project_code, department, location, district, contractor_name')
      .eq('id', projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Project was not found.');
    return {
      id: data.id,
      projectName: data.project_name || data.project_code || data.id,
      projectCode: data.project_code || data.id.slice(0, 8),
      department: data.department || null,
      location: data.location || data.district || null,
      contractorName: data.contractor_name || null,
    };
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, project_name, project_code, department, location')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project was not found.');
  return {
    id: data.id,
    projectName: data.project_name || data.name || data.project_code || data.id,
    projectCode: data.project_code || data.id.slice(0, 8),
    department: data.department || null,
    location: data.location || null,
  };
}

async function upsertProfile(supabase: ReturnType<typeof createClient>, member: ReturnType<typeof sanitizeMember>, userId: string) {
  const profilePayload = {
    full_name: member.fullName,
    email: member.email,
    phone: member.phone,
    role: member.role,
    company: member.role === 'contractor' ? member.companyName : null,
    updated_at: new Date().toISOString(),
  };
  const profileLookup = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (profileLookup.error) throw profileLookup.error;
  const profileResult = profileLookup.data
    ? await supabase.from('profiles').update(profilePayload).eq('id', userId).select('id').maybeSingle()
    : await supabase.from('profiles').insert({ id: userId, ...profilePayload }).select('id').maybeSingle();
  if (profileResult.error) throw profileResult.error;

  const userProfilePayload = {
    full_name: member.fullName,
    phone: member.phone,
    role: member.role,
    company: member.role === 'contractor' ? member.companyName : null,
    employee_code: member.role === 'contractor' ? member.licenceNumber : member.employeeCode,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const userProfileLookup = await supabase.from('user_profiles').select('id').eq('id', userId).maybeSingle();
  if (userProfileLookup.error) throw userProfileLookup.error;
  const userProfileResult = userProfileLookup.data
    ? await supabase.from('user_profiles').update(userProfilePayload).eq('id', userId).select('id').maybeSingle()
    : await supabase.from('user_profiles').insert({ id: userId, ...userProfilePayload }).select('id').maybeSingle();
  if (userProfileResult.error) throw userProfileResult.error;
}

async function upsertMembership(supabase: ReturnType<typeof createClient>, workspaceId: string, member: ReturnType<typeof sanitizeMember>, userId: string) {
  const membershipPayload = {
    workspace_id: workspaceId,
    user_id: userId,
    full_name: member.fullName,
    email: member.email,
    role: member.role,
    contractor_company: member.role === 'contractor' ? member.companyName : null,
    active: true,
    is_active: true,
    free_lifetime: member.role !== 'contractor',
  };
  const lookup = await supabase
    .from('workspace_users')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('role', member.role)
    .limit(2);
  if (lookup.error) throw lookup.error;

  const existing = (lookup.data || [])[0] as { id: string } | undefined;
  const result = existing?.id
    ? await supabase.from('workspace_users').update(membershipPayload).eq('id', existing.id).select('id').maybeSingle()
    : await supabase.from('workspace_users').insert(membershipPayload).select('id').maybeSingle();
  if (result.error) throw result.error;
  return (result.data as { id?: string } | null)?.id || existing?.id || null;
}

async function assignProject(supabase: ReturnType<typeof createClient>, input: {
  workspaceId: string;
  projectId: string;
  projectTable: 'gov_projects' | 'projects';
  executiveEngineerId: string;
  member: ReturnType<typeof sanitizeMember>;
  userId: string;
}) {
  const lookup = await supabase
    .from('project_assignments')
    .select('id, assistant_engineer_id, junior_engineer_id, contractor_id, contractor_company_name, access_status')
    .eq('workspace_id', input.workspaceId)
    .eq('project_id', input.projectId)
    .eq('project_table', input.projectTable)
    .limit(2);
  if (lookup.error) throw lookup.error;
  const existing = (lookup.data || [])[0] as { id: string } | undefined;
  if (!existing?.id) throw new Error('Project is not linked to this workspace. Open Assignment first, then retry provisioning.');

  const payload: Record<string, unknown> = {
    executive_engineer_id: input.executiveEngineerId,
    access_status: 'active',
    [roleColumn[input.member.role]]: input.userId,
  };
  if (input.member.role === 'contractor') {
    payload.contractor_company_name = input.member.companyName || null;
  }

  const result = await supabase.from('project_assignments').update(payload).eq('id', existing.id).select('id').maybeSingle();
  if (result.error) throw result.error;
  return existing.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service environment is not configured.');

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ ok: false, message: 'Missing authorization token.' }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: callerData, error: callerError } = await supabase.auth.getUser(jwt);
    if (callerError || !callerData.user?.id) return json({ ok: false, message: 'Invalid session.' }, 401);
    const callerId = callerData.user.id;

    const body = await req.json() as RequestBody;
    const workspaceId = body.workspaceId || '';
    const projectId = body.projectId || '';
    const projectTable = body.projectTable || 'gov_projects';
    const members = (body.members || []).map(sanitizeMember).filter((member) => member.fullName && member.email && allowedRoles.has(member.role));

    if (!workspaceId || !projectId) return json({ ok: false, message: 'workspaceId and projectId are required.' }, 400);
    if (!['gov_projects', 'projects'].includes(projectTable)) return json({ ok: false, message: 'Unsupported project table.' }, 400);
    if (members.length === 0) return json({ ok: false, message: 'At least one valid team member is required.' }, 400);

    const duplicateEmail = members.find((member, index) => members.findIndex((other) => other.email === member.email) !== index)?.email;
    if (duplicateEmail) return json({ ok: false, message: `Duplicate email in submission: ${duplicateEmail}` }, 400);

    const membership = await supabase
      .from('workspace_users')
      .select('id, workspace_id, user_id, role, active')
      .eq('workspace_id', workspaceId)
      .eq('user_id', callerId)
      .eq('role', 'executive_engineer')
      .eq('active', true)
      .maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data) return json({ ok: false, message: 'Caller is not an active Executive Engineer in this workspace.' }, 403);

    const workspaceResult = await supabase
      .from('executive_engineer_workspaces')
      .select('id, workspace_name, division_code, department, district, executive_engineer_id, executive_engineer_name, executive_engineer_email')
      .eq('id', workspaceId)
      .maybeSingle();
    if (workspaceResult.error) throw workspaceResult.error;
    if (!workspaceResult.data) return json({ ok: false, message: 'Workspace was not found.' }, 404);
    const workspace = workspaceResult.data as WorkspaceDetails;

    const assignmentScope = await supabase
      .from('project_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectId)
      .eq('project_table', projectTable)
      .limit(1)
      .maybeSingle();
    if (assignmentScope.error) throw assignmentScope.error;
    if (!assignmentScope.data) return json({ ok: false, message: 'Project is not assigned to this workspace.' }, 403);

    const project = await loadProject(supabase, projectTable, projectId);
    const results = [];

    for (const member of members) {
      const stages: StageResult[] = [];
      let userId: string | null = null;
      let activationLink: string | null = null;
      let identityStatus: 'existing' | 'invited' | 'created' = 'existing';
      let assignmentId: string | null = null;

      try {
        const authUser = await findAuthUserByEmail(supabase, member.email);
        const profileByEmail = await supabase.from('profiles').select('id').eq('email', member.email).maybeSingle();
        if (profileByEmail.error) throw profileByEmail.error;
        userId = authUser?.id || (profileByEmail.data as { id?: string } | null)?.id || null;
        stages.push(stage('identity_lookup', 'success', userId ? 'Existing identity found.' : 'No existing identity found.'));

        if (!userId) {
          const link = await supabase.auth.admin.generateLink({
            type: 'invite',
            email: member.email,
            options: {
              data: { full_name: member.fullName, role: member.role },
              redirectTo: Deno.env.get('TEAM_INVITE_REDIRECT_URL') || undefined,
            },
          });
          if (link.error) throw link.error;
          userId = link.data.user?.id || null;
          activationLink = link.data.properties?.action_link || null;
          identityStatus = 'invited';
          stages.push(stage('auth_invitation', 'success', 'One-time invitation link created.'));
        } else {
          stages.push(stage('auth_invitation', 'skipped', 'Existing user credentials were preserved.'));
        }

        if (!userId) throw new Error('Identity resolution did not return a user id.');
        await upsertProfile(supabase, member, userId);
        stages.push(stage('profile_creation', 'success'));

        const membershipId = await upsertMembership(supabase, workspaceId, member, userId);
        stages.push(stage('workspace_membership', 'success', membershipId ? `Membership ${membershipId}` : undefined));

        assignmentId = await assignProject(supabase, {
          workspaceId,
          projectId,
          projectTable,
          executiveEngineerId: workspace.executive_engineer_id || callerId,
          member,
          userId,
        });
        stages.push(stage('project_assignment', 'success', `Assignment ${assignmentId}`));

        const letter = letterFor({ workspace, project, member, userId, activationLink });
        stages.push(stage('letter_generation', 'success'));
        stages.push(stage('notification_delivery', 'not_configured', 'No email/SMS provider confirmation is configured.'));

        results.push({
          role: member.role,
          email: member.email,
          fullName: member.fullName,
          userId,
          identityStatus,
          assignmentId,
          statuses: {
            account: identityStatus,
            invitation_created: identityStatus === 'invited',
            assigned: true,
            letter_created: true,
            email_sent: false,
            sms_sent: false,
            activation_pending: Boolean(activationLink),
            activated: identityStatus === 'existing',
            delivery_failed: false,
          },
          activationLink,
          letter,
          stages,
        });
      } catch (error) {
        const failedStage: StageName = nextFailureStage(stages);
        results.push({
          role: member.role,
          email: member.email,
          fullName: member.fullName,
          userId,
          identityStatus: userId ? identityStatus : 'failed',
          assignmentId,
          statuses: {
            account: userId ? identityStatus : 'failed',
            invitation_created: false,
            assigned: false,
            letter_created: false,
            email_sent: false,
            sms_sent: false,
            activation_pending: false,
            activated: false,
            delivery_failed: true,
          },
          activationLink: null,
          letter: null,
          stages: [...stages, stage(failedStage, 'failed', safeError(error))],
        });
      }
    }

    return json({ ok: true, workspaceId, projectId, projectTable, results });
  } catch (error) {
    return json({ ok: false, message: safeError(error) }, 500);
  }
});
