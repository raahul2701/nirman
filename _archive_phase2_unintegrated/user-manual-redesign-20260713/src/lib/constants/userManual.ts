import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  Building,
  CheckSquare,
  ClipboardCopy,
  FileText,
  Folder,
  HelpCircle,
  Key,
  Map,
  PieChart,
  Rocket,
  ShieldCheck,
  Users,
  WifiOff,
} from 'lucide-react';
import type { FAQItem, ProblemFixItem, Role, RouteInfoItem, Section, UploadInfoItem, ChecklistItem, PilotDayItem } from '@/types/userManual';

export interface ManualData {
  readonly sections: readonly Section[];
  readonly overview: readonly string[];
  readonly roles: readonly Role[];
  readonly loginGuide: readonly string[];
  readonly startPilotWorkflow: readonly string[];
  readonly enterpriseRoutes: readonly RouteInfoItem[];
  readonly projectManagement: readonly string[];
  readonly uploads: readonly UploadInfoItem[];
  readonly aiFeatures: readonly string[];
  readonly pilotPlan: readonly PilotDayItem[];
  readonly problems: readonly ProblemFixItem[];
  readonly checklists: readonly ChecklistItem[];
  readonly faq: readonly FAQItem[];
}

export const USER_MANUAL_ROUTES = {
  startPilot: '/enterprise/start-pilot',
  accessControl: '/enterprise/access',
  dashboard: '/dashboard',
  projects: '/govtrack/projects',
  assignProject: '/enterprise/assign-project',
  setup: '/enterprise/setup',
  pilot: '/enterprise/pilot',
  guide: '/enterprise/pilot-guide',
} as const;

export const sections: readonly Section[] = [
  { id: 'overview', title: 'Platform Overview', icon: BookOpen },
  { id: 'roles', title: 'User Roles', icon: Users },
  { id: 'login', title: 'First-Time Login Guide', icon: Key },
  { id: 'start-pilot', title: 'Start Pilot Workflow', icon: Rocket },
  { id: 'enterprise', title: 'Enterprise Module', icon: Building },
  { id: 'projects', title: 'Project Management', icon: Folder },
  { id: 'uploads', title: 'Upload & Field Reporting', icon: ClipboardCopy },
  { id: 'ai', title: 'AI Features', icon: Bot },
  { id: 'gis', title: 'GIS & Location Features', icon: Map },
  { id: 'reports', title: 'Reports & Dashboard', icon: PieChart },
  { id: 'activity', title: 'Admin Activity Logs', icon: Activity },
  { id: 'drive', title: 'Google Drive Document Ownership', icon: Folder },
  { id: 'offline', title: 'Offline/PWA Usage', icon: WifiOff },
  { id: 'pilot-plan', title: '15-Day Pilot Plan', icon: FileText },
  { id: 'problems', title: 'Common Problems & Fixes', icon: AlertTriangle },
  { id: 'checklists', title: 'Quick Checklist', icon: CheckSquare },
  { id: 'faq', title: 'FAQ', icon: HelpCircle },
  { id: 'support', title: 'Pilot Support', icon: ShieldCheck },
] as const;

export const overview: readonly string[] = [
  'Government project monitoring for roads, bridges, buildings, PHE, irrigation, and similar public works.',
  'Field execution tracking through site photos, documents, GIS coordinates, inspection notes, and progress data.',
  'AI-assisted inspection for material quality, work evidence, TPA documents, budget/progress risk, hindrance impact, and diesel anomalies.',
  'GIS and project mapping so photos, pins, routes, and project locations can be reviewed with field context.',
  'Contractor coordination for uploads, diesel, material, labour, maintenance, and payment-support evidence.',
  'EE/AE/JE hierarchy where EE owns the workspace, AE reviews subdivision/project work, and JE verifies site evidence.',
  'Pilot project workflow for creating a workspace, assigning AE/JE/Contractor, verifying access, and measuring adoption over 15 days.',
] as const;

export const roles: readonly Role[] = [
  {
    role: 'Executive Engineer',
    can: 'Setup workspace, create/import projects, upload Agreement/BOQ, run AI project study, assign AE/JE/Contractor, monitor physical/financial progress, review inspections, RA bills, material advance, and approve/reject submissions.',
    daily: 'Dashboard, Projects, Agreement & BOQ, Reports, Enterprise Access, Assign Project, Activity Logs during pilot.',
    review: 'Workspace projects, component progress, pending inspections, QC/TPA issues, budget gaps, RA bills, material advance, hindrances, diesel alerts, and contractor uploads.',
    cannot: 'Should not upload on behalf of every field user during normal use; field evidence should come from the actual JE/Contractor account.',
  },
  {
    role: 'Assistant Engineer',
    can: 'View assigned projects, review JE daily progress, contractor submissions, quality/testing records, and escalate issues to EE.',
    daily: 'Gov Dashboard, Upload Work review, Inspections, Reports, Budget vs Progress, Material Tests.',
    review: 'JE site verification, contractor uploads, quality risks, delay reasons, and payment-support evidence.',
    cannot: 'Usually should not create the EE workspace or override final EE ownership decisions.',
  },
  {
    role: 'Junior Engineer',
    can: 'Enter daily site progress, labour, material, equipment, survey/TBM/level data, inspections, site photos, and measurement book entries for assigned site/project.',
    daily: 'Dashboard, Daily Progress, Survey & Quantity, Inspections, GIS Map, Material Tests, Hindrance Register.',
    review: 'Own pending uploads, missing GPS/photos, survey warnings, AI feedback, and items returned by AE/EE.',
    cannot: 'Usually should not manage workspace billing, contractor licensing, or final EE-level access setup.',
  },
  {
    role: 'Contractor',
    can: 'View own assigned project, read BOQ/agreement summary, upload bills/photos/challans, submit material advance claim, view MB/possible billing, and track RA bill/payment milestone.',
    daily: 'Dashboard, Agreement & BOQ, Material Advance, Diesel, Materials, Labour, Maintenance, TPA Portal.',
    review: 'Own submissions, pending documents, rejected/flagged uploads, possible billing, RA bill status, and payment milestones.',
    cannot: 'Should not see unrelated government projects or change EE/AE/JE hierarchy.',
  },
  {
    role: 'Admin',
    can: 'Manage users, roles, activity logs, access control checks, and support EE workspace setup.',
    daily: 'Admin Activity Logs, Audit Logs, Enterprise Access, Assign Project, Workspace Setup.',
    review: 'Role/profile issues, login/page activity, assignment events, shared-login misuse, missing configuration, and blocked access.',
    cannot: 'Should not expose secrets, bypass production approval, or use shared accounts as a permanent operating model.',
  },
] as const;

export const loginGuide: readonly string[] = [
  'Open the official NIRMAN AI app link: https://nirman.apostolicredeem.com.',
  'Go to /login, enter your registered email and password, then sign in.',
  'After login, check your name, role, dashboard, and whether the expected project appears.',
  'If the dashboard is empty, open /govtrack/projects and ask the EE/Admin to verify project assignment.',
  'If project is not assigned, the EE/Admin should open /enterprise/start-pilot or /enterprise/assign-project.',
  'If access is blocked, confirm that the correct account is used and that access to https://nirman.apostolicredeem.com is enabled for pilot users.',
] as const;

export const startPilotWorkflow: readonly string[] = [
  'Open /enterprise/start-pilot.',
  'Select the workspace owned by the Executive Engineer.',
  'Select the project that will be used for the pilot.',
  'Select AE, JE, and Contractor users for the assignment.',
  'Save the assignment.',
  'Verify the assignment in /enterprise/access.',
  'Continue to the dashboard and begin field uploads/reviews.',
] as const;

export const enterpriseRoutes: readonly RouteInfoItem[] = [
  {
    route: USER_MANUAL_ROUTES.setup,
    purpose: 'Workspace and Google/department metadata setup for the EE workspace.',
    users: 'EE, Admin.',
    data: 'Workspace, department/division, district, EE identity, optional Google Drive root details.',
    steps: [
      'Open Enterprise > Workspace Setup.',
      'Check workspace identity.',
      'Enter or confirm department and Drive metadata.',
      'Save changes and return to Start Pilot.',
    ],
    result: 'Workspace context is ready for project assignment and Drive ownership planning.',
  },
  {
    route: USER_MANUAL_ROUTES.startPilot,
    purpose: 'Guided pilot assignment flow.',
    users: 'EE, Admin pilot operator.',
    data: 'Workspace, project, AE, JE, Contractor, assignment status.',
    steps: ['Select workspace.', 'Select project.', 'Select AE/JE/Contractor.', 'Save assignment.', 'Open Access Control to verify.'],
    result: 'A project assignment connects the project to the pilot hierarchy.',
  },
  {
    route: USER_MANUAL_ROUTES.assignProject,
    purpose: 'Advanced create/edit assignment screen.',
    users: 'EE, Admin.',
    data: 'Project ID, workspace ID, EE/AE/JE/Contractor IDs, status.',
    steps: ['Choose project and workspace.', 'Choose project owner and reviewers.', 'Set pilot/access status.', 'Save and review confirmation.'],
    result: 'Project access is mapped to the right hierarchy.',
  },
  {
    route: USER_MANUAL_ROUTES.accessControl,
    purpose: 'Verify saved assignments and access status.',
    users: 'EE, AE reviewers, Admin.',
    data: 'Existing assignment records.',
    steps: ['Open Access Control.', 'Search or scan for the project.', 'Confirm workspace, AE, JE, Contractor, and status.', 'Fix missing mapping in Assign Project or Start Pilot.'],
    result: 'Team can confirm who should see the project.',
  },
  {
    route: USER_MANUAL_ROUTES.pilot,
    purpose: 'Pilot admin overview and shortcuts.',
    users: 'EE, Admin.',
    data: 'Pilot mode configuration, assignment readiness, demo status.',
    steps: ['Open Pilot Admin.', 'Use shortcuts for Start Pilot, Guide, Assign Project, and Access Control.', 'Review readiness notes.'],
    result: 'Pilot operator gets a control page for rollout tasks.',
  },
  {
    route: USER_MANUAL_ROUTES.guide,
    purpose: 'Technical pilot guide for hierarchy and assignment concepts.',
    users: 'EE, Admin, implementation/support team.',
    data: 'No new data required.',
    steps: ['Open Pilot Guide.', 'Read role matrix and flow.', 'Use it when diagnosing assignment or pilot setup questions.'],
    result: 'Team understands the deeper pilot data model and limitations.',
  },
] as const;

export const projectManagement: readonly string[] = [
  'Open /govtrack/projects from GovTrack Pro > Projects.',
  'Use the new/create project flow when available, or open /govtrack/projects/new directly.',
  'Enter project name, code, department, type, contract value, dates, contractor name, and location.',
  'Save the project, then open /enterprise/start-pilot or /enterprise/assign-project.',
  'Connect the project with EE workspace, AE, JE, and Contractor.',
  'Open /enterprise/access and confirm the assignment is visible.',
  'If the project is missing, check whether it was created under the correct user/workspace and whether assignment/access filters are hiding it.',
] as const;

export const uploads: readonly UploadInfoItem[] = [
  {
    name: 'Site photo upload',
    route: '/govtrack/upload',
    upload: 'Work photos, category, description, milestone if available, GPS latitude/longitude.',
    who: 'JE and Contractor; EE/AE review.',
    verification: 'Review status, AI quality score when configured, photo/GPS evidence, and milestone linkage.',
    review: 'EE/AE/JE should check missing GPS, unclear photos, wrong category, duplicate uploads, and pending review status.',
  },
  {
    name: 'Document upload',
    route: 'Project/document modules',
    upload: 'Government documents, drawings, reports, photos, and evidence files connected to project metadata.',
    who: 'JE/Contractor upload; AE/EE review ownership and correctness.',
    verification: 'Supabase stores metadata; Drive or storage provider owns the file depending on production setup.',
    review: 'Confirm project, uploader, document type, Drive ownership, and whether the file belongs in EE-owned Drive.',
  },
  {
    name: 'TPA report upload',
    route: '/tpa-portal',
    upload: 'Third-party inspection reports and supporting files.',
    who: 'Contractor or JE uploads; AE/EE review.',
    verification: 'Checks include document completeness, suspicious naming, missing signatures, and AI/Edge Function review if configured.',
    review: 'AE/EE should compare TPA findings with site progress, QC results, and payment claims.',
  },
  {
    name: 'Material QC upload',
    route: '/material-tests',
    upload: 'Material test reports, quality documents, photos, and relevant project details.',
    who: 'JE/AE upload or review; Contractor may submit supporting evidence.',
    verification: 'AI material inspection and quality review can flag issues when server-side AI is configured.',
    review: 'Check test date, material type, project, pass/fail result, lab/TPA evidence, and AI flags.',
  },
  {
    name: 'Diesel entry',
    route: '/diesel/new',
    upload: 'Diesel issue/receipt quantities, equipment/operator context, project, timestamp, and remarks.',
    who: 'Contractor enters; JE/AE/EE monitor.',
    verification: 'Reports and alerts can show abnormal consumption or suspicious patterns.',
    review: 'Review usage against work progress, equipment deployment, and repeated high-consumption entries.',
  },
  {
    name: 'Hindrance entry',
    route: '/hindrance-register',
    upload: 'Delay reason, responsible party, start/end dates, description, and evidence.',
    who: 'JE or Contractor enters; AE/EE review.',
    verification: 'Hindrance impact can support extension and progress delay review.',
    review: 'Check whether the hindrance is genuine, documented, time-bound, and linked to the correct project.',
  },
  {
    name: 'GIS/location capture',
    route: '/gis-map and /govtrack/upload',
    upload: 'Project coordinates, map pins, GPS-tagged photos, route/location evidence.',
    who: 'JE/Contractor capture; AE/EE review.',
    verification: 'Map preview and GPS values help confirm that evidence belongs to the correct site.',
    review: 'Check location mismatch, missing coordinates, repeated coordinates for different sites, and route feasibility.',
  },
] as const;

export const aiFeatures: readonly string[] = [
  'AI material inspection reviews material/QC evidence and highlights likely quality problems.',
  'AI quality review can summarize work photos and inspection evidence for reviewer attention.',
  'AI budget/progress analytics compares physical progress, financial progress, and risk gaps.',
  'AI TPA review can flag suspicious or incomplete third-party report evidence.',
  'AI hindrance impact estimation helps explain likely delay impact for extension review.',
  'AI diesel anomaly detection highlights unusual usage patterns for fuel monitoring.',
] as const;

export const pilotPlan: readonly PilotDayItem[] = [
  {
    day: 'Day 1-2',
    task: 'Workspace and user setup',
    usage: 'Create/verify EE workspace, identify AE/JE/Contractor accounts, confirm login and access.',
  },
  {
    day: 'Day 3-4',
    task: 'Project creation and assignment',
    usage: 'Create project in /govtrack/projects, assign it in /enterprise/start-pilot, verify in /enterprise/access.',
  },
  {
    day: 'Day 5-8',
    task: 'Field uploads and evidence collection',
    usage: 'Use dashboard and upload modules to collect photos, documents, and progress evidence.',
  },
  {
    day: 'Day 9-12',
    task: 'Review and AI-assisted checks',
    usage: 'Review uploaded evidence, AI outputs, pending issues, and material/QC feedback.',
  },
  {
    day: 'Day 13-15',
    task: 'Pilot closeout and feedback',
    usage: 'Collect feedback, verify role access, and decide whether to continue the pilot.',
  },
] as const;

export const problems: readonly ProblemFixItem[] = [
  {
    problem: 'Login not working',
    fix: 'Check email/password, internet, account invitation, and whether the account is active in Supabase Auth.',
  },
  {
    problem: 'Assignment not visible',
    fix: 'Open /enterprise/access, then check /enterprise/assign-project or /enterprise/start-pilot for missing AE/JE/Contractor mapping.',
  },
  {
    problem: 'Uploads are missing GPS',
    fix: 'Use the field app or web upload flow and ensure location is captured before saving the evidence.',
  },
] as const;

export const checklists: readonly ChecklistItem[] = [
  {
    title: 'EE daily checklist',
    items: [
      'Open Dashboard and Gov Dashboard.',
      'Review project progress and payment risks.',
      'Check QC/TPA/hindrance/diesel alerts.',
      'Verify access for active pilot projects.',
      'Review Activity Logs during pilot.',
    ],
  },
  {
    title: 'AE daily checklist',
    items: [
      'Review assigned project uploads.',
      'Check material QC and TPA reports.',
      'Review JE inspection notes.',
      'Flag missing or poor evidence.',
      'Escalate major risks to EE.',
    ],
  },
  {
    title: 'JE daily checklist',
    items: [
      'Upload daily progress evidence.',
      'Verify GPS/photo requirements.',
      'Check pending reviews or returns.',
      'Log material and labour updates.',
    ],
  },
] as const;

export const faq: readonly FAQItem[] = [
  {
    q: 'Is it free for government engineers?',
    a: 'Pilot access can be provided to government engineers as part of the rollout. Commercial terms depend on ARSPL/NIRMAN AI policy.',
  },
  {
    q: 'Can multiple roles use one account?',
    a: 'Shared logins are discouraged because they reduce accountability for uploads, reviews, and access changes.',
  },
  {
    q: 'What if a project is missing from the dashboard?',
    a: 'Verify the project was created in the correct workspace and that the assignment is visible in Access Control.',
  },
] as const;

export const manualData: ManualData = Object.freeze({
  sections,
  overview,
  roles,
  loginGuide,
  startPilotWorkflow,
  enterpriseRoutes,
  projectManagement,
  uploads,
  aiFeatures,
  pilotPlan,
  problems,
  checklists,
  faq,
});
