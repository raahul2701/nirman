import type { Profile, UserRole } from '../../types';

export type Permission =
  | 'operations:view'
  | 'ai:use'
  | 'uploads:create'
  | 'projects:manage'
  | 'contractors:view'
  | 'contractors:manage'
  | 'approvals:review'
  | 'admin:audit'
  | 'admin:impersonate';

const permissionMatrix: Record<string, Permission[]> = {
  super_admin: ['operations:view', 'ai:use', 'uploads:create', 'projects:manage', 'contractors:view', 'contractors:manage', 'approvals:review', 'admin:audit', 'admin:impersonate'],
  admin: ['operations:view', 'ai:use', 'uploads:create', 'projects:manage', 'contractors:view', 'contractors:manage', 'approvals:review', 'admin:audit'],
  project_manager: ['operations:view', 'ai:use', 'uploads:create', 'projects:manage', 'contractors:view', 'approvals:review'],
  site_engineer: ['operations:view', 'ai:use', 'uploads:create', 'contractors:view'],
  labor_supervisor: ['uploads:create', 'contractors:view'],
  contractor: ['uploads:create'],
  gov_official: ['operations:view', 'approvals:review', 'contractors:view'],
  worker: [],
};

export const departmentRoles = {
  engineering: ['super_admin', 'admin', 'project_manager', 'site_engineer'],
  accounts: ['super_admin', 'admin', 'project_manager'],
  contractor: ['contractor'],
  government: ['gov_official'],
} as const;

export function getPermissions(role?: string | UserRole) {
  return role ? permissionMatrix[role] || [] : [];
}

export function hasPermission(profile: Profile | null | undefined, permission: Permission) {
  return getPermissions(profile?.role).includes(permission);
}

export function isContractorSeparated(profile: Profile | null | undefined) {
  return profile?.role === 'contractor';
}

export function canImpersonate(actor: Profile | null | undefined, target: Profile | null | undefined) {
  return hasPermission(actor, 'admin:impersonate') && actor?.id !== target?.id && target?.role !== 'super_admin';
}
