import { supabase } from '../lib/supabase';

export type ProvisionTeamRole = 'assistant_engineer' | 'junior_engineer' | 'contractor';
export type ProvisionStageName = 'identity_lookup' | 'auth_invitation' | 'profile_creation' | 'workspace_membership' | 'project_assignment' | 'letter_generation' | 'notification_delivery';
export type ProvisionStageStatus = 'pending' | 'success' | 'skipped' | 'failed' | 'not_configured';

export type ProvisionTeamMemberInput = {
  role: ProvisionTeamRole;
  fullName: string;
  email: string;
  phone?: string | null;
  employeeCode?: string | null;
  licenceNumber?: string | null;
  companyName?: string | null;
};

export type AccessLetterPayload = {
  reference: string;
  projectName: string;
  projectCode: string;
  department: string | null;
  location: string | null;
  workspace: string;
  memberFullName: string;
  role: string;
  company: string | null;
  loginId: string;
  activationLink: string | null;
  tempPassword?: string | null;
  activationExpiry: string | null;
  eeName: string;
  eeContact: string | null;
  issueDate: string;
};

export type ProvisionStageResult = {
  stage: ProvisionStageName;
  status: ProvisionStageStatus;
  message?: string;
};

export type ProvisionTeamMemberResult = {
  role: ProvisionTeamRole;
  email: string;
  fullName: string;
  userId: string | null;
  identityStatus: 'existing' | 'invited' | 'created' | 'failed';
  assignmentId: string | null;
  statuses: {
    account: string;
    invitation_created: boolean;
    assigned: boolean;
    letter_created: boolean;
    email_sent: boolean;
    sms_sent: boolean;
    activation_pending: boolean;
    activated: boolean;
    delivery_failed: boolean;
  };
  activationLink: string | null;
  tempPassword?: string | null;
  letter: AccessLetterPayload | null;
  stages: ProvisionStageResult[];
};

type ProvisionProjectTeamResponse = {
  ok: boolean;
  message?: string;
  workspaceId?: string;
  projectId?: string;
  projectTable?: 'gov_projects' | 'projects';
  results?: ProvisionTeamMemberResult[];
};

export function normalizeProvisionEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

export function roleLabel(role: ProvisionTeamRole) {
  if (role === 'assistant_engineer') return 'Assistant Engineer';
  if (role === 'junior_engineer') return 'Junior Engineer';
  return 'Contractor';
}

export async function provisionProjectTeam(input: {
  workspaceId: string;
  projectId: string;
  projectTable: 'gov_projects' | 'projects';
  members: ProvisionTeamMemberInput[];
  resendInvitation?: boolean;
}) {
  const members = input.members.map((member) => ({ ...member, email: normalizeProvisionEmail(member.email) }));
  const { data, error } = await supabase.functions.invoke<ProvisionProjectTeamResponse>('provision-project-team', {
    body: { ...input, members },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || 'Project team provisioning failed');
  return data.results || [];
}

export async function downloadAccessLetterPdf(letter: AccessLetterPayload) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const margin = 18;
  let y = 18;
  const lineHeight = 7;
  const write = (label: string, value?: string | null) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    const text = value || '-';
    const lines = doc.splitTextToSize(text, 120);
    doc.text(lines, margin + 58, y);
    y += Math.max(lineHeight, lines.length * lineHeight);
  };

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NIRMAN AI Project Access Authorization', margin, y);
  y += 12;
  doc.setFontSize(10);
  write('Letter Reference', letter.reference);
  write('Issue Date', new Date(letter.issueDate).toLocaleString());
  write('Project Name', letter.projectName);
  write('Project Code', letter.projectCode);
  write('Department', letter.department);
  write('Location', letter.location);
  write('Workspace', letter.workspace);
  write('Member Full Name', letter.memberFullName);
  write('Role', letter.role);
  write('Company', letter.company);
  write('Login ID', letter.loginId);
  write('Activation Link', letter.activationLink || 'Existing user: use current password.');
  write('Activation Expiry', letter.activationExpiry ? new Date(letter.activationExpiry).toLocaleString() : null);
  write('Executive Engineer', letter.eeName);
  write('EE Contact', letter.eeContact);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('This authorization grants project-specific access only. No permanent password is included in this letter.', margin, y, { maxWidth: 170 });
  doc.save(`${letter.reference}.pdf`);
}


