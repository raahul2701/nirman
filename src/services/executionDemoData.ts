export type ProjectComponentType =
  | 'Earthwork'
  | 'GSB'
  | 'WMM'
  | 'DBM'
  | 'BC'
  | 'Building'
  | 'Bridge'
  | 'Irrigation'
  | 'PHE';

export type ExecutionProject = {
  id: string;
  name: string;
  code: string;
  category: 'road' | 'building' | 'bridge' | 'irrigation' | 'phe';
  ae: string;
  je: string;
  contractor: string;
  progress: number;
  budget: number;
  components: { name: ProjectComponentType; progress: number; plannedQty: number; executedQty: number; unit: string }[];
  issues: number;
  pendingInspections: number;
};

export const executionProjects: ExecutionProject[] = [
  {
    id: 'demo-road-1',
    name: 'Bihta Rural Road Upgrade',
    code: 'PWD-RD-01',
    category: 'road',
    ae: 'Er. Nidhi Singh',
    je: 'Er. Ravi Prakash',
    contractor: 'Mithila Infra Pvt Ltd',
    progress: 68,
    budget: 12400000,
    issues: 3,
    pendingInspections: 2,
    components: [
      { name: 'Earthwork', progress: 92, plannedQty: 12800, executedQty: 11776, unit: 'cum' },
      { name: 'GSB', progress: 76, plannedQty: 4300, executedQty: 3268, unit: 'cum' },
      { name: 'WMM', progress: 61, plannedQty: 3900, executedQty: 2379, unit: 'cum' },
      { name: 'DBM', progress: 35, plannedQty: 1180, executedQty: 413, unit: 'MT' },
      { name: 'BC', progress: 18, plannedQty: 760, executedQty: 137, unit: 'MT' },
    ],
  },
  {
    id: 'demo-building-1',
    name: 'Phulwariya School Block',
    code: 'BLD-EDU-03',
    category: 'building',
    ae: 'Er. Rakesh Kumar',
    je: 'Er. Faizan Alam',
    contractor: 'Ganga Buildcon',
    progress: 54,
    budget: 18600000,
    issues: 2,
    pendingInspections: 4,
    components: [
      { name: 'Building', progress: 57, plannedQty: 1, executedQty: 0.57, unit: 'block' },
      { name: 'PHE', progress: 31, plannedQty: 1, executedQty: 0.31, unit: 'system' },
    ],
  },
  {
    id: 'demo-bridge-1',
    name: 'Punpun Culvert Strengthening',
    code: 'BRG-04',
    category: 'bridge',
    ae: 'Er. Rakesh Kumar',
    je: 'Er. Priya Raj',
    contractor: 'Ganga Buildcon',
    progress: 42,
    budget: 9200000,
    issues: 4,
    pendingInspections: 3,
    components: [
      { name: 'Bridge', progress: 46, plannedQty: 1, executedQty: 0.46, unit: 'structure' },
      { name: 'Earthwork', progress: 70, plannedQty: 1600, executedQty: 1120, unit: 'cum' },
    ],
  },
  {
    id: 'demo-irrigation-1',
    name: 'Danapur Drainage Repair',
    code: 'IRR-02',
    category: 'irrigation',
    ae: 'Er. Nidhi Singh',
    je: 'Er. Meena Kumari',
    contractor: 'Mithila Infra Pvt Ltd',
    progress: 73,
    budget: 7400000,
    issues: 1,
    pendingInspections: 1,
    components: [
      { name: 'Irrigation', progress: 73, plannedQty: 2200, executedQty: 1606, unit: 'm' },
      { name: 'PHE', progress: 48, plannedQty: 1, executedQty: 0.48, unit: 'network' },
    ],
  },
];

export const agreementStudyDemo = {
  documentName: 'Bihta Rural Road Agreement Package.pdf',
  aiStatus: 'Structured study ready',
  clauses: ['Completion schedule: 9 months', 'DLP: 5 years', 'SD: 5%', 'BG: performance guarantee active'],
  boqItems: [
    { itemNo: '2.01', description: 'Earthwork in embankment', quantity: 12800, unit: 'cum', rate: 186, amount: 2380800 },
    { itemNo: '4.03', description: 'Granular sub-base', quantity: 4300, unit: 'cum', rate: 1420, amount: 6106000 },
    { itemNo: '5.07', description: 'Wet mix macadam', quantity: 3900, unit: 'cum', rate: 1680, amount: 6552000 },
  ],
  milestones: ['Subgrade completion', 'GSB/WMM completion', 'Bituminous layer completion', 'Final safety audit'],
};

export const surveyQuantityDemo = [
  {
    chainage: '0+500 to 0+850',
    tbm: 'TBM-02',
    benchmarkRl: 52.115,
    backsight: 1.245,
    foresight: 1.665,
    calculatedRl: 51.695,
    formationLevel: 51.62,
    designLevel: 52.12,
    component: 'GSB/WMM crust',
    requiredThicknessMm: 500,
    actualThicknessMm: 420,
    shortfallCum: 224,
    warning: 'Below requirement. Potential quality and billing impact.',
  },
  {
    chainage: '1+100 to 1+350',
    tbm: 'TBM-03',
    benchmarkRl: 53.02,
    backsight: 1.14,
    foresight: 1.31,
    calculatedRl: 52.85,
    formationLevel: 52.48,
    designLevel: 52.98,
    component: 'Earthwork',
    requiredThicknessMm: 500,
    actualThicknessMm: 510,
    shortfallCum: 0,
    warning: 'Within tolerance.',
  },
];

export const materialAdvanceDemo = [
  {
    id: 'ma-1',
    project: 'Bihta Rural Road Upgrade',
    material: 'WMM aggregate',
    submittedValue: 1280000,
    aiRecommendedEligibleValue: 980000,
    approvedValue: 0,
    status: 'under_review',
    pendingDocuments: ['Test certificate'],
    warning: 'AI recommended eligible value only. Final approval subject to EE/department verification.',
  },
  {
    id: 'ma-2',
    project: 'Phulwariya School Block',
    material: 'TMT steel Fe500',
    submittedValue: 760000,
    aiRecommendedEligibleValue: 690000,
    approvedValue: 650000,
    status: 'approved',
    pendingDocuments: [],
    warning: 'Final approval recorded by department user.',
  },
];

export type DashboardRole = 'executive_engineer' | 'assistant_engineer' | 'junior_engineer' | 'contractor' | 'admin' | 'default';

export function getDashboardRole(role?: string | null): DashboardRole {
  if (role === 'executive_engineer' || role === 'super_admin' || role === 'project_manager') return 'executive_engineer';
  if (role === 'assistant_engineer') return 'assistant_engineer';
  if (role === 'junior_engineer' || role === 'site_engineer') return 'junior_engineer';
  if (role === 'contractor') return 'contractor';
  if (role === 'admin' || role === 'admin_viewer') return 'admin';
  return 'default';
}
