export type AssignmentRole = 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor' | 'admin_viewer';

export type AssignmentWorkspaceUser = {
  user_id: string | null;
  role: string | null;
  active?: boolean | null;
};

const ROLE_ALIASES: Record<string, AssignmentRole> = {
  executive_engineer: 'executive_engineer',
  ee: 'executive_engineer',
  'executive engineer': 'executive_engineer',
  assistant_engineer: 'assistant_engineer',
  ae: 'assistant_engineer',
  'assistant engineer': 'assistant_engineer',
  junior_engineer: 'junior_engineer',
  je: 'junior_engineer',
  'junior engineer': 'junior_engineer',
  contractor: 'contractor',
  admin_viewer: 'admin_viewer',
  'admin viewer': 'admin_viewer',
};

export function normalizeAssignmentRole(role: string | null | undefined) {
  if (!role) return null;
  const normalized = role.trim().toLowerCase().replace(/[-\s]+/g, '_');
  return ROLE_ALIASES[normalized] || ROLE_ALIASES[normalized.replace(/_/g, ' ')] || null;
}

export function isAssignmentRole(user: AssignmentWorkspaceUser, role: AssignmentRole) {
  return normalizeAssignmentRole(user.role) === role;
}

export function countUsersByAssignmentRole(users: AssignmentWorkspaceUser[]) {
  return users.reduce<Record<AssignmentRole | 'unknown', number>>((counts, user) => {
    const role = normalizeAssignmentRole(user.role) || 'unknown';
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {
    executive_engineer: 0,
    assistant_engineer: 0,
    junior_engineer: 0,
    contractor: 0,
    admin_viewer: 0,
    unknown: 0,
  });
}

export function listRawRoleValues(users: AssignmentWorkspaceUser[]) {
  return Array.from(new Set(users.map((user) => user.role || '(empty)'))).sort();
}
