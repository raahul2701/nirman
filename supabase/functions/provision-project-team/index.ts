import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

type TeamRole = 'assistant_engineer' | 'junior_engineer' | 'contractor';
type StageName = 'identity_lookup' | 'auth_invitation' | 'profile_creation' | 'workspace_membership' | 'project_assignment' | 'letter_generation' | 'notification_delivery' | 'password_created' | 'activation_completed';
type ProvisionStageStatus =
  | 'pending'
  | 'success'
  | 'skipped'
  | 'failed'
  | 'not_configured'
  | 'email'
  | 'manual_link';

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
  action?: 'status' | 'provision';
  workspaceId?: string;
  projectId?: string;
  projectTable?: 'gov_projects' | 'projects';
  members?: TeamMemberInput[];
  resendInvitation?: boolean;
  generateActivationLink?: boolean;
};

type StageResult = { stage: StageName; status: ProvisionStageStatus; message?: string };
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

function stage(stage: StageName, status: ProvisionStageStatus, message?: string): StageResult {
  return { stage, status, ...(message ? { message } : {}) };
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

const diagnosticFile = 'supabase/functions/provision-project-team/index.ts';

function diagnosticFailure(stage: string, line: number, error: unknown, status = 500) {
  const details = error instanceof Error ? error : new Error(safeError(error));
  return json({ success: false, stage, file: diagnosticFile, line, error: details.message, stack: details.stack || null }, status);
}

class SecurityException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityException';
  }
}

function assertSecurity(condition: boolean, message: string) {
  if (!condition) throw new SecurityException(message);
}

function logProvisionDebug(event: string, details: Record<string, unknown>) {
  console.info('[provision-project-team]', event, details);
}

function authErrorDetails(error: unknown) {
  const details = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
  return {
    message: safeError(error),
    status: details.status ?? null,
    code: details.code ?? details.error_code ?? null,
    name: details.name ?? null,
    providerResponse: details.provider_response ?? details.providerResponse ?? null,
  };
}

function inviteResponseDetails(invite: { data?: { user?: Record<string, unknown> | null } | null; error?: unknown }) {
  const user = invite.data?.user || null;
  return {
    hasUser: Boolean(user),
    user: user ? {
      id: user.id ?? null,
      email: user.email ?? null,
      invited_at: user.invited_at ?? null,
      confirmation_sent_at: user.confirmation_sent_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      confirmed_at: user.confirmed_at ?? null,
      created_at: user.created_at ?? null,
      updated_at: user.updated_at ?? null,
      app_metadata: user.app_metadata ?? null,
      user_metadata: user.user_metadata ?? null,
    } : null,
    error: invite.error ? authErrorDetails(invite.error) : null,
  };
}


async function logProvisionFailure(supabase: ReturnType<typeof createClient>, input: {
  callerId: string;
  workspaceId: string;
  projectId: string;
  member: ReturnType<typeof sanitizeMember>;
  stage: StageName;
  error: unknown;
}) {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: input.callerId,
    action: 'team_provisioning_failed',
    table_name: 'auth.users',
    record_id: null,
    new_values: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      email: input.member.email,
      role: input.member.role,
      stage: input.stage,
      error: safeError(input.error),
    },
    metadata: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      provisioning_stage: input.stage,
    },
  });
  if (error) console.warn('Provisioning audit log failed', error.message);
}


async function logProvisionEvent(supabase: ReturnType<typeof createClient>, input: {
  callerId: string;
  workspaceId: string;
  projectId: string;
  member: ReturnType<typeof sanitizeMember>;
  action: string;
  stage: StageName;
  status: ProvisionStageStatus;
  message: string;
}) {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: input.callerId,
    action: input.action,
    table_name: 'auth.users',
    record_id: null,
    new_values: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      email: input.member.email,
      role: input.member.role,
      stage: input.stage,
      status: input.status,
      message: input.message,
    },
    metadata: {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      provisioning_stage: input.stage,
      provisioning_status: input.status,
    },
  });
  if (error) console.warn('Provisioning audit event failed', error.message);
}
function nextFailureStage(stages: StageResult[]): StageName {
  const completed = new Set(stages.filter((item) => item.status === 'success' || item.status === 'skipped').map((item) => item.stage));
  const order: StageName[] = ['identity_lookup', 'auth_invitation', 'profile_creation', 'workspace_membership', 'project_assignment', 'letter_generation', 'notification_delivery'];
  return order.find((item) => !completed.has(item)) || 'notification_delivery';
}

function liveStatusResult(input: { role: TeamRole; user: Record<string, any>; profile: Record<string, any> | null; assignmentId: string }) {
  const metadata = input.user.user_metadata || {};
  const passwordCreated = Boolean(metadata.password_created_at);
  const activated = Boolean(input.user.email_confirmed_at || input.user.confirmed_at || passwordCreated);
  const firstLoginCompleted = Boolean(input.user.last_sign_in_at);
  const invitationPending = Boolean(input.user.invited_at) && !activated;
  const stages: StageResult[] = [
    stage('identity_lookup', 'success', 'Identity found.'),
    stage('auth_invitation', input.user.invited_at ? 'success' : 'skipped', input.user.invited_at ? 'Invitation created.' : 'Existing account.'),
    stage('profile_creation', 'success'), stage('workspace_membership', 'success'),
    stage('project_assignment', 'success', `Assignment ${input.assignmentId}`),
    stage('letter_generation', 'skipped', 'Letter can be downloaded from the invitation result.'),
    stage('notification_delivery', input.user.invited_at ? 'email' : 'not_configured', input.user.invited_at ? 'Email invitation requested from Supabase Auth.' : 'No invitation email was required.'),
    stage('password_created', passwordCreated ? 'success' : 'pending', passwordCreated ? 'Password created.' : 'Password creation pending.'),
    stage('activation_completed', activated ? 'success' : 'pending', activated ? 'Account activated.' : 'Activation pending.'),
  ];
  return { success: true, assignment_saved: true, notification: { method: 'email' as const, status: input.user.invited_at ? 'success' as const : 'not_configured' as const }, role: input.role, email: input.user.email || input.profile?.email || '', fullName: input.profile?.full_name || metadata.full_name || input.user.email || input.role, userId: input.user.id, identityStatus: activated ? 'existing' as const : invitationPending ? 'invited' as const : 'created' as const, assignmentId: input.assignmentId, statuses: { account: activated ? 'active' : invitationPending ? 'invited' : 'created', invitation_created: Boolean(input.user.invited_at), assigned: true, letter_created: false, email_sent: Boolean(input.user.invited_at), sms_sent: false, activation_pending: invitationPending, activated, password_created: passwordCreated, first_login_completed: firstLoginCompleted, last_login_at: input.user.last_sign_in_at || null, delivery_failed: false }, activationLink: null, letter: null, stages };
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

async function validateExistingIdentity(supabase: ReturnType<typeof createClient>, input: {
  authUser: { id?: string; email?: string } | null;
  profileByEmail: { id?: string; email?: string | null; role?: string | null } | null;
  callerId: string;
  workspace: WorkspaceDetails;
  member: ReturnType<typeof sanitizeMember>;
}) {
  const authId = input.authUser?.email
    && normalizeEmail(input.authUser.email) === normalizeEmail(input.member.email)
    ? input.authUser.id || null
    : null;
  const profileId = input.profileByEmail?.id || null;
  const resolvedUserId = authId || profileId;
  const resolutionSource = authId ? 'auth_user' : profileId ? 'profile' : 'none';
  logProvisionDebug('identity_resolution', {
    requested_email: input.member.email,
    auth_email: input.authUser?.email || null,
    profile_email: input.profileByEmail?.email || null,
    resolved_user_id: resolvedUserId,
    resolution_source: resolutionSource,
  });
  if (!resolvedUserId) return null;

  assertSecurity(resolvedUserId !== input.callerId, 'SecurityException: provisioned login_id resolves to the current authenticated user.');
  assertSecurity(resolvedUserId !== input.workspace.executive_engineer_id, 'SecurityException: provisioned login_id resolves to the Executive Engineer.');
  if (input.authUser?.email) {
    assertSecurity(normalizeEmail(input.authUser.email) === input.member.email, 'SecurityException: auth user email does not match requested member login_id.');
  }
  if (authId && profileId) {
    assertSecurity(authId === profileId, 'SecurityException: auth user and profile email resolve to different users.');
  }
  if (input.profileByEmail?.role) {
    assertSecurity(input.profileByEmail.role === input.member.role, 'SecurityException: existing profile role does not match requested member role.');
  }

  const profileById = await supabase.from('profiles').select('id, email, role').eq('id', resolvedUserId).maybeSingle();
  if (profileById.error) throw profileById.error;
  if (profileById.data?.email) {
    assertSecurity(normalizeEmail(profileById.data.email) === input.member.email, 'SecurityException: resolved profile belongs to a different login_id.');
  }
  if (profileById.data?.role) {
    assertSecurity(profileById.data.role === input.member.role, 'SecurityException: resolved profile role does not match requested member role.');
  }

  return resolvedUserId;
}

async function verifyAuthLoginId(supabase: ReturnType<typeof createClient>, input: {
  userId: string;
  member: ReturnType<typeof sanitizeMember>;
  callerId: string;
  workspace: WorkspaceDetails;
}) {
  assertSecurity(input.userId !== input.callerId, 'SecurityException: generated login_id belongs to the current authenticated user.');
  assertSecurity(input.userId !== input.workspace.executive_engineer_id, 'SecurityException: generated login_id belongs to the Executive Engineer.');
  const authUser = await supabase.auth.admin.getUserById(input.userId);
  if (authUser.error) throw authUser.error;
  assertSecurity(authUser.data.user?.id === input.userId, 'SecurityException: generated auth user id could not be verified.');
  assertSecurity(normalizeEmail(authUser.data.user?.email || '') === input.member.email, 'SecurityException: generated login_id belongs to another auth user.');
}

async function verifyProvisionedIdentity(supabase: ReturnType<typeof createClient>, input: {
  workspaceId: string;
  projectId: string;
  projectTable: 'gov_projects' | 'projects';
  assignmentId: string | null;
  userId: string;
  member: ReturnType<typeof sanitizeMember>;
  callerId: string;
  workspace: WorkspaceDetails;
}) {
  assertSecurity(input.userId !== input.callerId, 'SecurityException: provisioned user id matches current authenticated user.');
  assertSecurity(input.userId !== input.workspace.executive_engineer_id, 'SecurityException: provisioned user id matches Executive Engineer.');

  const authUser = await supabase.auth.admin.getUserById(input.userId);
  if (authUser.error) throw authUser.error;
  assertSecurity(authUser.data.user?.id === input.userId, 'SecurityException: auth user id could not be verified.');
  assertSecurity(normalizeEmail(authUser.data.user?.email || '') === input.member.email, 'SecurityException: auth user login_id does not match requested member email.');

  const profile = await supabase.from('profiles').select('id, email, role').eq('id', input.userId).maybeSingle();
  if (profile.error) throw profile.error;
  assertSecurity(profile.data?.id === input.userId, 'SecurityException: profile row does not belong to auth user.');
  assertSecurity(normalizeEmail(profile.data?.email || '') === input.member.email, 'SecurityException: profile login_id does not match auth user.');
  assertSecurity(profile.data?.role === input.member.role, 'SecurityException: profile role does not match provisioned role.');

  const membership = await supabase
    .from('workspace_users')
    .select('id, user_id, email, role, active')
    .eq('workspace_id', input.workspaceId)
    .eq('user_id', input.userId)
    .eq('role', input.member.role)
    .eq('active', true)
    .maybeSingle();
  if (membership.error) throw membership.error;
  assertSecurity(membership.data?.user_id === input.userId, 'SecurityException: workspace membership does not belong to auth user.');
  assertSecurity(normalizeEmail(membership.data?.email || '') === input.member.email, 'SecurityException: workspace membership login_id does not match auth user.');
  assertSecurity(membership.data?.role === input.member.role, 'SecurityException: workspace membership role does not match provisioned role.');

  const assignment = await supabase
    .from('project_assignments')
    .select('id, executive_engineer_id, assistant_engineer_id, junior_engineer_id, contractor_id')
    .eq('workspace_id', input.workspaceId)
    .eq('project_id', input.projectId)
    .eq('project_table', input.projectTable)
    .maybeSingle();
  if (assignment.error) throw assignment.error;
  assertSecurity(assignment.data?.id === input.assignmentId, 'SecurityException: project assignment could not be verified.');
  assertSecurity(assignment.data?.[roleColumn[input.member.role]] === input.userId, 'SecurityException: project assignment role column does not belong to auth user.');
  const otherRoleColumns = Object.values(roleColumn).filter((column) => column !== roleColumn[input.member.role]);
  assertSecurity(!otherRoleColumns.some((column) => assignment.data?.[column] === input.userId), 'SecurityException: auth user is assigned to multiple isolated project roles.');
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

  let diagnosticStage = 'Validate request';
  let diagnosticLine = 0;
  try {
    diagnosticStage = 'Validate request'; diagnosticLine = 518;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service environment is not configured.');

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ ok: false, message: 'Missing authorization token.' }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    diagnosticStage = 'Validate request'; diagnosticLine = 526;
    const { data: callerData, error: callerError } = await supabase.auth.getUser(jwt);
    if (callerError || !callerData.user?.id) return json({ ok: false, message: 'Invalid session.' }, 401);
    const callerId = callerData.user.id;

    diagnosticStage = 'Validate request'; diagnosticLine = 531;
    const body = await req.json() as RequestBody;
    const workspaceId = body.workspaceId || '';
    const projectId = body.projectId || '';
    const projectTable = body.projectTable || 'gov_projects';
    const action = body.action || 'provision';
    const resendInvitation = body.resendInvitation === true;
    const generateActivationLink = body.generateActivationLink === true;
    const inviteRedirectUrl = 'https://nirman.apostolicredeem.com/auth/callback';
    const members = (body.members || []).map(sanitizeMember).filter((member) => member.fullName && member.email && allowedRoles.has(member.role));

    if (!workspaceId || !projectId) return json({ ok: false, message: 'workspaceId and projectId are required.' }, 400);
    if (!['gov_projects', 'projects'].includes(projectTable)) return json({ ok: false, message: 'Unsupported project table.' }, 400);
    if (action !== 'status' && action !== 'provision') return json({ ok: false, message: 'Unsupported provisioning action.' }, 400);
    if (action === 'provision' && members.length === 0) return json({ ok: false, message: 'At least one valid team member is required.' }, 400);

    if (action === 'provision') {
      const duplicateEmail = members.find((member, index) => members.findIndex((other) => other.email === member.email) !== index)?.email;
      if (duplicateEmail) return json({ ok: false, message: `Duplicate email in submission: ${duplicateEmail}` }, 400);
    }
    diagnosticStage = 'Load workspace'; diagnosticLine = 548;
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

    diagnosticStage = 'Load workspace'; diagnosticLine = 560;
    const workspaceResult = await supabase
      .from('executive_engineer_workspaces')
      .select('id, workspace_name, division_code, department, district, executive_engineer_id, executive_engineer_name, executive_engineer_email')
      .eq('id', workspaceId)
      .maybeSingle();
    if (workspaceResult.error) throw workspaceResult.error;
    if (!workspaceResult.data) return json({ ok: false, message: 'Workspace was not found.' }, 404);
    const workspace = workspaceResult.data as WorkspaceDetails;

    diagnosticStage = 'Load assignment'; diagnosticLine = 570;
    const assignmentScope = await supabase
      .from('project_assignments')
      .select('id, assistant_engineer_id, junior_engineer_id, contractor_id')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectId)
      .eq('project_table', projectTable)
      .limit(1)
      .maybeSingle();
    if (assignmentScope.error) throw assignmentScope.error;
    if (!assignmentScope.data) return json({ ok: false, message: 'Project is not assigned to this workspace.' }, 403);

    if (action === 'status') {
      const assignment = assignmentScope.data as Record<string, string | null>;
      const roles: Array<[TeamRole, string | null]> = [['assistant_engineer', assignment.assistant_engineer_id], ['junior_engineer', assignment.junior_engineer_id], ['contractor', assignment.contractor_id]];
      const results = [];
      for (const [role, userId] of roles) {
        if (!userId) continue;
        const [authResult, profileResult] = await Promise.all([supabase.auth.admin.getUserById(userId), supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle()]);
        if (authResult.error || !authResult.data.user) continue;
        if (profileResult.error) throw profileResult.error;
        results.push(liveStatusResult({ role, user: authResult.data.user as unknown as Record<string, any>, profile: profileResult.data as Record<string, any> | null, assignmentId: assignment.id || '' }));
      }
      return json({ ok: true, workspaceId, projectId, projectTable, rows: results, results });
    }

    diagnosticStage = 'Load project'; diagnosticLine = 596;
    const project = await loadProject(supabase, projectTable, projectId);
    const results = [];

    for (const member of members) {
      const stages: StageResult[] = [];
      let userId: string | null = null;
      let activationLink: string | null = null;
      let identityStatus: 'existing' | 'invited' | 'created' = 'existing';
      let assignmentId: string | null = null;

      let memberStage = 'Create auth user';
      let memberLine = 0;
      try {
        memberStage = 'Create auth user'; memberLine = 610;
        const authUser = await findAuthUserByEmail(supabase, member.email);
        const profileByEmail = await supabase.from('profiles').select('id, email, role').eq('email', member.email).maybeSingle();
        if (profileByEmail.error) throw profileByEmail.error;
        userId = await validateExistingIdentity(supabase, {
          authUser: authUser || null,
          profileByEmail: (profileByEmail.data as { id?: string; email?: string | null; role?: string | null } | null) || null,
          callerId,
          workspace,
          member,
        });
        logProvisionDebug('identity_lookup', {
          workspaceId,
          projectId,
          email: member.email,
          role: member.role,
          authUserExists: Boolean(authUser?.id),
          profileExists: Boolean(profileByEmail.data?.id),
          resolvedUserId: userId,
          resendInvitation,
        });
        stages.push(stage('identity_lookup', 'success', userId ? 'Existing identity found.' : 'No existing identity found.'));

        if (generateActivationLink) {
          memberStage = 'Generate activation link'; memberLine = 635;
          const existingIdentityBeforeManualLink = Boolean(userId);
          const manualLink = await supabase.auth.admin.generateLink({
            type: existingIdentityBeforeManualLink ? 'recovery' : 'invite',
            email: member.email,
            options: {
              data: { full_name: member.fullName, role: member.role },
              redirectTo: inviteRedirectUrl,
            },
          });
          if (manualLink.error) throw manualLink.error;
          userId = manualLink.data.user?.id || userId;
          activationLink = manualLink.data.properties?.action_link || null;
          identityStatus = 'created';
          logProvisionDebug('manual_link_created', {
            workspaceId,
            projectId,
            email: member.email,
            role: member.role,
            inviteMethod: 'manual_link',
            supabaseResponse: 'success',
            smtpResponse: 'not_attempted_manual_link_requested',
            redirectUrl: inviteRedirectUrl,
            notificationStatus: 'manual_link',
            finalStageStatus: 'manual_link',
            userId,
            linkType: existingIdentityBeforeManualLink ? 'recovery' : 'invite',
            activationLinkCreated: Boolean(activationLink),
          });
          await logProvisionEvent(supabase, {
            callerId,
            workspaceId,
            projectId,
            member,
            action: 'team_invitation_manual_link_created',
            stage: 'auth_invitation',
            status: 'manual_link',
            message: 'Manual activation link intentionally generated.',
          });
          stages.push(stage('auth_invitation', 'manual_link', 'Manual activation link intentionally generated.'));
        } else if (!userId || resendInvitation) {
          logProvisionDebug('invite_attempted', {
            workspaceId,
            projectId,
            email: member.email,
            role: member.role,
            existingAuthUser: Boolean(authUser?.id),
            resendInvitation,
            redirectUrl: inviteRedirectUrl,
          });
          memberStage = 'Invite email'; memberLine = 684;
          const invite = await supabase.auth.admin.inviteUserByEmail(member.email, {
            data: { full_name: member.fullName, role: member.role },
            redirectTo: inviteRedirectUrl,
          });
          if (invite.error) {
            const inviteError = invite.error;
            logProvisionDebug('invite_failed', {
              workspaceId,
              projectId,
              email: member.email,
              role: member.role,
              inviteMethod: 'email',
              supabaseResponse: 'error',
              smtpResponse: safeError(inviteError),
              existingAuthUser: Boolean(authUser?.id),
              resendInvitation,
              redirectUrl: inviteRedirectUrl,
              notificationStatus: 'failed',
              finalStageStatus: 'failed',
              error: safeError(inviteError),
              inviteResponse: inviteResponseDetails(invite),
              httpStatus: authErrorDetails(inviteError).status,
              supabaseErrorCode: authErrorDetails(inviteError).code,
              providerResponse: authErrorDetails(inviteError).providerResponse,
            });
            stages.push(stage('auth_invitation', 'failed', safeError(inviteError)));
            await logProvisionEvent(supabase, {
              callerId,
              workspaceId,
              projectId,
              member,
              action: 'team_invitation_email_failed',
              stage: 'auth_invitation',
              status: 'failed',
              message: safeError(inviteError),
            });

          } else {
            userId = invite.data.user?.id || userId;
            identityStatus = 'invited';
            logProvisionDebug('invite_success', {
              workspaceId,
              projectId,
              email: member.email,
              role: member.role,
              userId,
              existingAuthUser: Boolean(authUser?.id),
              resendInvitation,
              inviteResponse: inviteResponseDetails(invite),
              httpStatus: 200,
              supabaseErrorCode: null,
              providerResponse: null,
            });
            await logProvisionEvent(supabase, {
              callerId,
              workspaceId,
              projectId,
              member,
              action: resendInvitation ? 'team_invitation_resent' : 'team_invitation_sent',
              stage: 'auth_invitation',
              status: 'success',
              message: resendInvitation ? 'Supabase Auth invite email resent.' : 'Supabase Auth invite email requested.',
            });
            stages.push(stage('auth_invitation', 'success', resendInvitation ? 'Supabase invitation email resent.' : 'Supabase invitation email requested.'));
          }
        } else {
          logProvisionDebug('invite_skipped', {
            workspaceId,
            projectId,
            email: member.email,
            role: member.role,
            authUserExists: Boolean(authUser?.id),
            profileExists: Boolean(profileByEmail.data?.id),
            reason: 'existing_identity_without_resend',
          });
          stages.push(stage('auth_invitation', 'skipped', 'Existing user credentials were preserved.'));
        }

        if (!userId) throw new Error('Identity resolution did not return a user id.');
        await verifyAuthLoginId(supabase, { userId, member, callerId, workspace });
        memberStage = 'Create profile'; memberLine = 765;
        await upsertProfile(supabase, member, userId);
        stages.push(stage('profile_creation', 'success'));

        memberStage = 'Workspace membership'; memberLine = 769;
        const membershipId = await upsertMembership(supabase, workspaceId, member, userId);
        stages.push(stage('workspace_membership', 'success', membershipId ? `Membership ${membershipId}` : undefined));

        memberStage = 'Project assignment'; memberLine = 773;
        assignmentId = await assignProject(supabase, {
          workspaceId,
          projectId,
          projectTable,
          executiveEngineerId: workspace.executive_engineer_id || callerId,
          member,
          userId,
        });
        stages.push(stage('project_assignment', 'success', `Assignment ${assignmentId}`));

        await verifyProvisionedIdentity(supabase, {
          workspaceId,
          projectId,
          projectTable,
          assignmentId,
          userId,
          member,
          callerId,
          workspace,
        });

        const letter = letterFor({ workspace, project, member, userId, activationLink });
        stages.push(stage('letter_generation', 'success'));
        const notificationStatus: ProvisionStageStatus = identityStatus === 'invited' ? 'email' : activationLink ? 'manual_link' : stages.some((item) => item.stage === 'auth_invitation' && item.status === 'failed') ? 'failed' : 'not_configured';
        const notificationMessage = identityStatus === 'invited'
          ? 'Supabase Auth invite email requested.'
          : activationLink
            ? 'Manual activation link generated for EE delivery.'
            : stages.find((item) => item.stage === 'auth_invitation' && item.status === 'failed')?.message || 'No email or manual activation link was created.';
        logProvisionDebug('notification_status', {
          workspaceId,
          projectId,
          email: member.email,
          role: member.role,
          identityStatus,
          notificationStatus,
          method: identityStatus === 'invited' ? 'email' : activationLink ? 'manual_link' : 'email',
          emailSent: identityStatus === 'invited',
          redirectUrl: inviteRedirectUrl,
          finalStageStatus: notificationStatus,
        });
        stages.push(stage('notification_delivery', notificationStatus, notificationMessage));
        stages.push(stage('password_created', 'pending', 'Password creation pending.'));
        stages.push(stage('activation_completed', 'pending', 'Activation pending.'));

        const notificationMethod = identityStatus === 'invited' ? 'email' : activationLink ? 'manual_link' : 'email';
        const notificationSucceeded = notificationStatus === 'email' || notificationStatus === 'manual_link';
        results.push({
          success: true,
          assignment_saved: true,
          notification: {
            method: notificationMethod,
            status: notificationSucceeded ? 'success' : notificationStatus,
            ...(notificationStatus === 'failed' ? { error: notificationMessage } : {}),
          },
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
            email_sent: identityStatus === 'invited',
            sms_sent: false,
            activation_pending: identityStatus !== 'existing',
            activated: identityStatus === 'existing',
            password_created: false,
            first_login_completed: false,
            last_login_at: null,
            delivery_failed: notificationStatus === 'failed',
          },
          activationLink,
          letter,
          stages,
        });
      } catch (error) {
        return diagnosticFailure(memberStage, memberLine, error);
        const failedStage: StageName = nextFailureStage(stages);
        await logProvisionFailure(supabase, { callerId, workspaceId, projectId, member, stage: failedStage, error });
        results.push({
          success: Boolean(assignmentId),
          assignment_saved: Boolean(assignmentId),
          notification: {
            method: 'email',
            status: 'failed',
            error: safeError(error),
          },
          role: member.role,
          email: member.email,
          fullName: member.fullName,
          userId,
          identityStatus: userId ? identityStatus : 'failed',
          assignmentId,
          statuses: {
            account: userId ? identityStatus : 'failed',
            invitation_created: false,
            assigned: Boolean(assignmentId),
            letter_created: false,
            email_sent: false,
            sms_sent: false,
            activation_pending: false,
            activated: false,
            password_created: false,
            first_login_completed: false,
            last_login_at: null,
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
    return diagnosticFailure(diagnosticStage, diagnosticLine, error);
  }
});

















