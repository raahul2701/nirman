import {
  calculateContractorMonthlyAmount,
  ContractorLicense,
  ContractorRecommendation,
  ExecutiveEngineerWorkspace,
  ProjectAssignment,
  WorkspaceGoogleConnection,
  WorkspaceSummary,
  WorkspaceUser,
  getDriveProjectFolderPath,
} from './businessHierarchyService';

export interface PilotPerson {
  id: string;
  name: string;
  role: 'Executive Engineer' | 'Assistant Engineer' | 'Junior Engineer' | 'Contractor';
  email: string;
  parentId?: string;
  company?: string;
}

export interface PilotProject {
  id: string;
  name: string;
  code: string;
  assistantEngineerId: string;
  juniorEngineerId: string;
  contractorId: string;
  driveFolderPath: string;
  status: 'active' | 'locked' | 'trial';
}

export interface PilotChecklistItem {
  id: string;
  label: string;
  expected: string;
}

export interface PilotContractorLicense extends ContractorLicense {
  contractorId: string;
}

export const pilotIds = {
  workspace: '10000000-0000-4000-8000-000000000001',
  ee: '10000000-0000-4000-8000-000000000010',
  ae1: '10000000-0000-4000-8000-000000000021',
  ae2: '10000000-0000-4000-8000-000000000022',
  je1: '10000000-0000-4000-8000-000000000031',
  je2: '10000000-0000-4000-8000-000000000032',
  je3: '10000000-0000-4000-8000-000000000033',
  je4: '10000000-0000-4000-8000-000000000034',
  contractor1: '10000000-0000-4000-8000-000000000041',
  contractor2: '10000000-0000-4000-8000-000000000042',
  contractor3: '10000000-0000-4000-8000-000000000043',
};

export const pilotPeople: PilotPerson[] = [
  { id: pilotIds.ee, name: 'Er. A. K. Sharma', role: 'Executive Engineer', email: 'ee.demo@pilot.nirman.local' },
  { id: pilotIds.ae1, name: 'Er. Nidhi Singh', role: 'Assistant Engineer', email: 'ae1.demo@pilot.nirman.local', parentId: pilotIds.ee },
  { id: pilotIds.ae2, name: 'Er. Rakesh Kumar', role: 'Assistant Engineer', email: 'ae2.demo@pilot.nirman.local', parentId: pilotIds.ee },
  { id: pilotIds.je1, name: 'Er. Ravi Prakash', role: 'Junior Engineer', email: 'je1.demo@pilot.nirman.local', parentId: pilotIds.ae1 },
  { id: pilotIds.je2, name: 'Er. Meena Kumari', role: 'Junior Engineer', email: 'je2.demo@pilot.nirman.local', parentId: pilotIds.ae1 },
  { id: pilotIds.je3, name: 'Er. Faizan Alam', role: 'Junior Engineer', email: 'je3.demo@pilot.nirman.local', parentId: pilotIds.ae2 },
  { id: pilotIds.je4, name: 'Er. Priya Raj', role: 'Junior Engineer', email: 'je4.demo@pilot.nirman.local', parentId: pilotIds.ae2 },
  { id: pilotIds.contractor1, name: 'Mithila Infra', role: 'Contractor', email: 'contractor1.demo@pilot.nirman.local', company: 'Mithila Infra Pvt Ltd' },
  { id: pilotIds.contractor2, name: 'Ganga Buildcon', role: 'Contractor', email: 'contractor2.demo@pilot.nirman.local', company: 'Ganga Buildcon' },
  { id: pilotIds.contractor3, name: 'Patna Roadworks', role: 'Contractor', email: 'contractor3.demo@pilot.nirman.local', company: 'Patna Roadworks' },
];

export const pilotWorkspace: ExecutiveEngineerWorkspace = {
  id: pilotIds.workspace,
  executive_engineer_id: pilotIds.ee,
  executive_engineer_name: 'Er. A. K. Sharma',
  executive_engineer_email: 'ee.demo@pilot.nirman.local',
  workspace_name: 'Patna Division Pilot',
  workspace_code: 'PWD-PATNA-DEMO',
  division_code: 'PWD-PATNA-DEMO',
  department: 'Public Works Department',
  district: 'Patna',
  drive_root_folder_id: 'drive_demo_root_patna_division',
  storage_namespace: 'ee_patna_division_pilot',
  status: 'active',
};

export const pilotGoogleConnection: WorkspaceGoogleConnection = {
  id: '10000000-0000-4000-8000-000000000050',
  workspace_id: pilotIds.workspace,
  google_project_id: 'nirman-pilot-demo-project',
  drive_root_folder_id: 'drive_demo_root_patna_division',
  maps_api_status: 'manual_configured',
  gemini_api_status: 'manual_configured',
  drive_api_status: 'manual_configured',
  setup_status: 'connected',
};

export const pilotProjects: PilotProject[] = [
  {
    id: '10000000-0000-4000-8000-000000000101',
    name: 'Bihta Rural Road Upgrade',
    code: 'PILOT-P1',
    assistantEngineerId: pilotIds.ae1,
    juniorEngineerId: pilotIds.je1,
    contractorId: pilotIds.contractor1,
    driveFolderPath: getDriveProjectFolderPath('Patna_Division_Pilot', 'Bihta_Rural_Road_Upgrade'),
    status: 'active',
  },
  {
    id: '10000000-0000-4000-8000-000000000102',
    name: 'Danapur Drainage Repair',
    code: 'PILOT-P2',
    assistantEngineerId: pilotIds.ae1,
    juniorEngineerId: pilotIds.je2,
    contractorId: pilotIds.contractor1,
    driveFolderPath: getDriveProjectFolderPath('Patna_Division_Pilot', 'Danapur_Drainage_Repair'),
    status: 'active',
  },
  {
    id: '10000000-0000-4000-8000-000000000103',
    name: 'Phulwariya School Block',
    code: 'PILOT-P3',
    assistantEngineerId: pilotIds.ae2,
    juniorEngineerId: pilotIds.je3,
    contractorId: pilotIds.contractor2,
    driveFolderPath: getDriveProjectFolderPath('Patna_Division_Pilot', 'Phulwariya_School_Block'),
    status: 'active',
  },
  {
    id: '10000000-0000-4000-8000-000000000104',
    name: 'Punpun Culvert Strengthening',
    code: 'PILOT-P4',
    assistantEngineerId: pilotIds.ae2,
    juniorEngineerId: pilotIds.je4,
    contractorId: pilotIds.contractor2,
    driveFolderPath: getDriveProjectFolderPath('Patna_Division_Pilot', 'Punpun_Culvert_Strengthening'),
    status: 'active',
  },
  {
    id: '10000000-0000-4000-8000-000000000105',
    name: 'Fatuha Site Trial Package',
    code: 'PILOT-P5',
    assistantEngineerId: pilotIds.ae1,
    juniorEngineerId: pilotIds.je1,
    contractorId: pilotIds.contractor3,
    driveFolderPath: getDriveProjectFolderPath('Patna_Division_Pilot', 'Fatuha_Site_Trial_Package'),
    status: 'trial',
  },
];

function buildLicense(contractorId: string, company: string, users: number, status: ContractorLicense['license_status']): PilotContractorLicense {
  const billing = calculateContractorMonthlyAmount(users);
  return {
    id: `license-${contractorId}`,
    workspace_id: pilotIds.workspace,
    contractorId,
    contractor_name: company,
    actual_users: billing.actualUsers,
    billable_users: billing.billableUsers,
    price_per_user: 270,
    monthly_amount: billing.monthlyAmount,
    license_status: status,
    recommended_by: pilotIds.ee,
    renewal_date: status === 'trial' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };
}

export const pilotLicenses: PilotContractorLicense[] = [
  buildLicense(pilotIds.contractor1, 'Mithila Infra Pvt Ltd', 8, 'active'),
  buildLicense(pilotIds.contractor2, 'Ganga Buildcon', 12, 'active'),
  buildLicense(pilotIds.contractor3, 'Patna Roadworks', 1, 'trial'),
];

export const pilotWorkspaceUsers: WorkspaceUser[] = pilotPeople.map((person, index) => ({
  id: `pilot-member-${index + 1}`,
  workspace_id: pilotIds.workspace,
  user_id: person.id,
  role:
    person.role === 'Executive Engineer'
      ? 'executive_engineer'
      : person.role === 'Assistant Engineer'
        ? 'assistant_engineer'
        : person.role === 'Junior Engineer'
          ? 'junior_engineer'
          : 'contractor',
  parent_user_id: person.parentId || null,
  subdivision_name: person.role === 'Assistant Engineer' ? `${person.name.split(' ')[1] || 'AE'} Subdivision` : null,
  free_lifetime: person.role !== 'Contractor',
  active: true,
}));

export const pilotProjectAssignments: ProjectAssignment[] = pilotProjects.map((project, index) => ({
  id: `pilot-assignment-${index + 1}`,
  workspace_id: pilotIds.workspace,
  project_id: project.id,
  project_table: 'gov_projects',
  executive_engineer_id: pilotIds.ee,
  executive_engineer_name: 'Er. A. K. Sharma',
  executive_engineer_email: 'ee.demo@pilot.nirman.local',
  assistant_engineer_id: project.assistantEngineerId,
  junior_engineer_id: project.juniorEngineerId,
  contractor_id: project.contractorId,
  contractor_company_name: pilotPeople.find((person) => person.id === project.contractorId)?.company || null,
  access_status: project.status === 'trial' ? 'active' : project.status,
}));

export const pilotRecommendations: ContractorRecommendation[] = [
  {
    id: 'pilot-rec-1',
    workspace_id: pilotIds.workspace,
    contractor_name: 'Patna Roadworks',
    contractor_email: 'contractor3.demo@pilot.nirman.local',
    contractor_phone: '+91-00000-00003',
    contractor_company_name: 'Patna Roadworks',
    project_ids: [pilotProjects[4].id],
    onboarding_token: 'pilot-demo-onboarding-token',
    status: 'recommended',
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const pilotChecklistItems: PilotChecklistItem[] = [
  { id: 'ee-all', label: 'EE can see all workspace data', expected: 'EE dashboard lists all 5 projects and all contractors.' },
  { id: 'ae-assigned', label: 'AE sees assigned projects', expected: 'AE view is limited to mapped subdivision/project rows.' },
  { id: 'je-site', label: 'JE sees assigned site only', expected: 'JE access follows project_assignments.junior_engineer_id.' },
  { id: 'contractor-own', label: 'Contractor sees own projects only', expected: 'Contractor rows are filtered by contractor_id.' },
  { id: 'contractor-files', label: 'Contractor cannot see other contractor files', expected: 'document_metadata filters workspace, project, and contractor.' },
  { id: 'billing-minimum', label: 'Contractor billing minimum 10 works', expected: '8 users bills as 10 users = Rs 2700/month.' },
  { id: 'drive-path', label: 'Drive path generated correctly', expected: 'Project folders are under NIRMAN/ExecutiveEngineer_.../Projects/...' },
  { id: 'metadata-only', label: 'Document metadata stores drive_file_id only', expected: 'Supabase stores metadata and Drive IDs, not government document blobs.' },
];

export function getPilotWorkspaceSummary(): WorkspaceSummary {
  return {
    workspace: pilotWorkspace,
    members: pilotWorkspaceUsers,
    projects: pilotProjectAssignments,
    licenses: pilotLicenses,
    recommendations: pilotRecommendations,
    googleConnection: pilotGoogleConnection,
  };
}

