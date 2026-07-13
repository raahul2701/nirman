export enum ProjectCategory {
  ROAD = 'road',
  BUILDING = 'building',
  BRIDGE = 'bridge',
  OTHER = 'other',
}

export type ComponentProgress = {
  id?: string;
  name: 'Earthwork' | 'Subgrade' | 'PQC' | 'Structure' | string;
  progress: number;
  plannedQty: number;
  executedQty: number;
  unit: string;
};

export type DashboardProject = {
  id: string;
  projectTable: 'projects' | 'gov_projects';
  workspaceId?: string | null;
  assignmentRole?: 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor' | 'admin_viewer' | null;
  name: string;
  code: string;
  category: ProjectCategory | 'road' | 'building' | 'bridge' | 'other' | 'irrigation' | 'phe';
  aeId: string;
  ae: string;
  jeId: string;
  je: string;
  contractorId: string;
  contractor: string;
  progress: number;
  budget: number;
  issues: number;
  pendingInspections: number;
  components: ComponentProgress[];
};
