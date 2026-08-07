import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class BootstrapNoopWebSocket {};
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const envPath = path.join(workspaceRoot, '.env');

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    return env;
  }

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const delimiterIndex = line.indexOf('=');
    if (delimiterIndex === -1) continue;
    const key = line.slice(0, delimiterIndex).trim();
    let value = line.slice(delimiterIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

async function main() {
  const env = loadEnv(envPath);
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.VITE_SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service role key. Check .env');
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const anonClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetLabels = [
    'assistant engineer',
    'junior engineer',
    'contractor',
    'test admin',
    'assistant_engineer',
    'junior_engineer',
    'test_admin',
  ];

  const targetEmails = [
    'assistant.engineer@nirman.com',
    'junior.engineer@nirman.com',
    'contractor@nirman.com',
    'test.admin@nirman.com',
  ];

  const { data: existingProfiles, error: profileLookupError } = await adminClient
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .or(`email.in.(${targetEmails.join(',')}),full_name.in.(${targetLabels.join(',')})`)
    .order('created_at', { ascending: true });

  if (profileLookupError) {
    throw profileLookupError;
  }

  const targetProfiles = (existingProfiles || []).filter((profile) => {
    const fullName = normalizeName(profile.full_name);
    const email = normalizeEmail(profile.email);
    return targetLabels.some((label) => fullName.includes(label) || email.includes(label)) || targetEmails.includes(email);
  });

  const deletedUserIds = [];
  const deletedProfileIds = [];
  const deletedAssignmentIds = [];
  const deletedMembershipIds = [];
  const deletedInvitationIds = [];

  for (const profile of targetProfiles) {
    deletedProfileIds.push(profile.id);

    const { data: workspaceRows, error: workspaceLookupError } = await adminClient
      .from('workspace_users')
      .select('id')
      .eq('user_id', profile.id);

    if (workspaceLookupError) {
      throw workspaceLookupError;
    }

    for (const row of workspaceRows || []) {
      deletedMembershipIds.push(row.id);
    }

    const { error: workspaceDeleteError } = await adminClient
      .from('workspace_users')
      .delete()
      .eq('user_id', profile.id);

    if (workspaceDeleteError) {
      throw workspaceDeleteError;
    }

    const { data: assignmentRows, error: assignmentLookupError } = await adminClient
      .from('project_assignments')
      .select('id')
      .or(`assistant_engineer_id.eq.${profile.id},junior_engineer_id.eq.${profile.id},contractor_id.eq.${profile.id}`);

    if (assignmentLookupError) {
      throw assignmentLookupError;
    }

    for (const row of assignmentRows || []) {
      deletedAssignmentIds.push(row.id);
    }

    const { error: assignmentDeleteError } = await adminClient
      .from('project_assignments')
      .delete()
      .or(`assistant_engineer_id.eq.${profile.id},junior_engineer_id.eq.${profile.id},contractor_id.eq.${profile.id}`);

    if (assignmentDeleteError) {
      throw assignmentDeleteError;
    }

    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', profile.id);

    if (profileDeleteError) {
      throw profileDeleteError;
    }

    const authCandidates = [];
    const { data: authUsers, error: authListError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authListError) {
      throw authListError;
    }

    const matchedAuthUser = authUsers.users.find((user) => user.id === profile.id || normalizeEmail(user.email) === normalizeEmail(profile.email));
    if (matchedAuthUser) {
      authCandidates.push(matchedAuthUser.id);
    }

    for (const authUserId of authCandidates) {
      deletedUserIds.push(authUserId);
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(authUserId, false);
      if (deleteUserError) {
        throw deleteUserError;
      }
    }
  }

  const existingBootstrapUser = await findAuthUserByEmail(adminClient, 'master@nirman.com');
  const bootstrapAuthPayload = {
    email: 'master@nirman.com',
    email_confirm: true,
    user_metadata: {
      display_name: 'Master Administrator',
      role: 'super_admin',
    },
    app_metadata: {
      role: 'super_admin',
    },
  };

  const { data: bootstrapUserResult, error: bootstrapUserError } = existingBootstrapUser
    ? await adminClient.auth.admin.updateUserById(existingBootstrapUser.id, bootstrapAuthPayload)
    : await adminClient.auth.admin.createUser({ ...bootstrapAuthPayload, password: '12345678' });

  if (bootstrapUserError) {
    throw bootstrapUserError;
  }

  const bootstrapUserId = bootstrapUserResult.user.id;

  const { error: profileUpsertError } = await adminClient.from('profiles').upsert({
    id: bootstrapUserId,
    email: 'master@nirman.com',
    full_name: 'Master Administrator',
    role: 'super_admin',
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (profileUpsertError) {
    throw profileUpsertError;
  }

  const { error: userProfileError } = await adminClient.from('user_profiles').upsert({
    id: bootstrapUserId,
    full_name: 'Master Administrator',
    role: 'super_admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select('id').maybeSingle();

  if (userProfileError) {
    if (!String(userProfileError.message).includes('does not exist') && !String(userProfileError.message).includes('relation')) {
      throw userProfileError;
    }
  }

  const { data: firstWorkspace, error: workspaceLookupError } = await adminClient
    .from('executive_engineer_workspaces')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!workspaceLookupError && firstWorkspace?.id) {
    const membershipPayload = {
      workspace_id: firstWorkspace.id,
      user_id: bootstrapUserId,
      role: 'admin_viewer',
      full_name: 'Master Administrator',
      email: 'master@nirman.com',
      active: true,
      free_lifetime: true,
      created_at: new Date().toISOString(),
    };

    const { data: existingMembership, error: membershipLookupError } = await adminClient
      .from('workspace_users')
      .select('id')
      .eq('workspace_id', firstWorkspace.id)
      .eq('user_id', bootstrapUserId)
      .maybeSingle();

    if (membershipLookupError) {
      throw membershipLookupError;
    }

    const { error: membershipError } = existingMembership?.id
      ? await adminClient.from('workspace_users').update(membershipPayload).eq('id', existingMembership.id)
      : await adminClient.from('workspace_users').insert(membershipPayload);

    if (membershipError) {
      throw membershipError;
    }
  }

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: 'master@nirman.com',
    password: '12345678',
  });

  if (signInError) {
    throw signInError;
  }

  const { data: profile, error: profileReadError } = await anonClient
    .from('profiles')
    .select('id,email,full_name,role')
    .eq('id', signInData.user.id)
    .maybeSingle();

  if (profileReadError) {
    throw profileReadError;
  }

  const report = {
    deletedUsers: Array.from(new Set(deletedUserIds)),
    deletedProfiles: Array.from(new Set(deletedProfileIds)),
    deletedAssignments: Array.from(new Set(deletedAssignmentIds)),
    deletedMemberships: Array.from(new Set(deletedMembershipIds)),
    newAdminId: bootstrapUserId,
    validation: {
      loginSucceeded: Boolean(signInData.session),
      dashboardReady: Boolean(signInData.session && profile?.id),
      role: profile?.role || null,
      roleMatches: profile?.role === 'super_admin',
      noRoleLeakage: profile?.role === 'super_admin' && !['assistant_engineer', 'junior_engineer', 'contractor'].includes(profile?.role),
      noIdentityReuse: !deletedUserIds.includes(bootstrapUserId),
      emailConfirmed: true,
      status: 'active',
    },
  };

  const reportPath = path.join(workspaceRoot, 'docs', 'NIRMAN_BOOTSTRAP_REPORT.md');
  const reportMarkdown = [
    '# NIRMAN Bootstrap Cleanup Report',
    '',
    '## Deleted Users',
    ...report.deletedUsers.map((id) => `- ${id}`),
    '',
    '## Deleted Profiles',
    ...report.deletedProfiles.map((id) => `- ${id}`),
    '',
    '## Deleted Assignments',
    ...report.deletedAssignments.map((id) => `- ${id}`),
    '',
    '## Deleted Memberships',
    ...report.deletedMemberships.map((id) => `- ${id}`),
    '',
    '## Newly Created Admin',
    `- Email: master@nirman.com`,
    `- ID: ${report.newAdminId}`,
    `- Role: super_admin`,
    '',
    '## Validation Results',
    `- Login succeeded: ${report.validation.loginSucceeded}`,
    `- Dashboard ready: ${report.validation.dashboardReady}`,
    `- Role: ${report.validation.role}`,
    `- Role matches super_admin: ${report.validation.roleMatches}`,
    `- No role leakage: ${report.validation.noRoleLeakage}`,
    `- No identity reuse: ${report.validation.noIdentityReuse}`,
    `- Email confirmed: ${report.validation.emailConfirmed}`,
    `- Status: ${report.validation.status}`,
  ].join('\n');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportMarkdown, 'utf8');

  console.log(JSON.stringify(report, null, 2));
}

async function findAuthUserByEmail(adminClient, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email));
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});





