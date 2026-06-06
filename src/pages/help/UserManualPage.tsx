import { ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  FolderOpen,
  HelpCircle,
  Landmark,
  MapPin,
  Shield,
  Smartphone,
  Upload,
  Users,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { featureFlags } from '../../lib/featureFlags';

type ManualSection = {
  id: string;
  title: string;
  icon: ReactNode;
};

type RouteGuide = {
  route: string;
  purpose: string;
  users: string;
  data: string;
  steps: string[];
  result: string;
};

const sections: ManualSection[] = [
  { id: 'overview', title: 'Platform Overview', icon: <Landmark size={18} /> },
  { id: 'roles', title: 'User Roles', icon: <Users size={18} /> },
  { id: 'login', title: 'First-Time Login Guide', icon: <Shield size={18} /> },
  { id: 'start-pilot', title: 'Start Pilot Workflow', icon: <ClipboardCheck size={18} /> },
  { id: 'enterprise', title: 'Enterprise Module', icon: <Landmark size={18} /> },
  { id: 'projects', title: 'Project Management', icon: <FolderOpen size={18} /> },
  { id: 'uploads', title: 'Upload & Field Reporting', icon: <Upload size={18} /> },
  { id: 'ai', title: 'AI Features', icon: <Bot size={18} /> },
  { id: 'gis', title: 'GIS & Location Features', icon: <MapPin size={18} /> },
  { id: 'reports', title: 'Reports & Dashboard', icon: <FileText size={18} /> },
  { id: 'activity', title: 'Admin Activity Logs', icon: <ClipboardCheck size={18} /> },
  { id: 'drive', title: 'Google Drive Document Ownership', icon: <FolderOpen size={18} /> },
  { id: 'offline', title: 'Offline/PWA Usage', icon: <Smartphone size={18} /> },
  { id: 'pilot-plan', title: '15-Day Pilot Plan', icon: <CalendarDays size={18} /> },
  { id: 'problems', title: 'Common Problems & Fixes', icon: <AlertTriangle size={18} /> },
  { id: 'checklists', title: 'Quick Checklist', icon: <CheckCircle2 size={18} /> },
  { id: 'faq', title: 'FAQ', icon: <HelpCircle size={18} /> },
  { id: 'support', title: 'Pilot Support', icon: <FileText size={18} /> },
];

const platformPoints = [
  'Government project monitoring for roads, bridges, buildings, PHE, irrigation, and similar public works.',
  'Field execution tracking through site photos, documents, GIS coordinates, inspection notes, and progress data.',
  'AI-assisted inspection for material quality, work evidence, TPA documents, budget/progress risk, hindrance impact, and diesel anomalies.',
  'GIS and project mapping so photos, pins, routes, and project locations can be reviewed with field context.',
  'Contractor coordination for uploads, diesel, material, labour, maintenance, and payment-support evidence.',
  'EE/AE/JE hierarchy where EE owns the workspace, AE reviews subdivision/project work, and JE verifies site evidence.',
  'Pilot project workflow for creating a workspace, assigning AE/JE/Contractor, verifying access, and measuring adoption over 15 days.',
];

const roleGuides = [
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
];

const enterpriseRoutes: RouteGuide[] = [
  {
    route: '/enterprise/setup',
    purpose: 'Workspace and Google/department metadata setup for the EE workspace.',
    users: 'EE, Admin.',
    data: 'Workspace, department/division, district, EE identity, optional Google Drive root details.',
    steps: ['Open Enterprise > Workspace Setup.', 'Check workspace identity.', 'Enter or confirm department and Drive metadata.', 'Save changes and return to Start Pilot.'],
    result: 'Workspace context is ready for project assignment and Drive ownership planning.',
  },
  {
    route: '/enterprise/start-pilot',
    purpose: 'Guided pilot assignment flow.',
    users: 'EE, Admin pilot operator.',
    data: 'Workspace, project, AE, JE, Contractor, assignment status.',
    steps: ['Select workspace.', 'Select project.', 'Select AE/JE/Contractor.', 'Save assignment.', 'Open Access Control to verify.'],
    result: 'A project assignment connects the project to the pilot hierarchy.',
  },
  {
    route: '/enterprise/assign-project',
    purpose: 'Advanced create/edit assignment screen.',
    users: 'EE, Admin.',
    data: 'Project ID, workspace ID, EE/AE/JE/Contractor IDs, status.',
    steps: ['Choose project and workspace.', 'Choose project owner and reviewers.', 'Set pilot/access status.', 'Save and review confirmation.'],
    result: 'Project access is mapped to the right hierarchy.',
  },
  {
    route: '/enterprise/access',
    purpose: 'Verify saved assignments and access status.',
    users: 'EE, AE reviewers, Admin.',
    data: 'Existing assignment records.',
    steps: ['Open Access Control.', 'Search or scan for the project.', 'Confirm workspace, AE, JE, Contractor, and status.', 'Fix missing mapping in Assign Project or Start Pilot.'],
    result: 'Team can confirm who should see the project.',
  },
  {
    route: '/enterprise/pilot',
    purpose: 'Pilot admin overview and shortcuts.',
    users: 'EE, Admin.',
    data: 'Pilot mode configuration, assignment readiness, demo status.',
    steps: ['Open Pilot Admin.', 'Use shortcuts for Start Pilot, Guide, Assign Project, and Access Control.', 'Review readiness notes.'],
    result: 'Pilot operator gets a control page for rollout tasks.',
  },
  {
    route: '/enterprise/pilot-guide',
    purpose: 'Technical pilot guide for hierarchy and assignment concepts.',
    users: 'EE, Admin, implementation/support team.',
    data: 'No new data required.',
    steps: ['Open Pilot Guide.', 'Read role matrix and flow.', 'Use it when diagnosing assignment or pilot setup questions.'],
    result: 'Team understands the deeper pilot data model and limitations.',
  },
  {
    route: '/enterprise/billing',
    purpose: 'Contractor licensing and billing readiness.',
    users: 'Admin, EE, contractor licensing operator.',
    data: 'Contractor company, license status, seat/user count, billing context.',
    steps: ['Open Licensing.', 'Review contractor license records.', 'Check active/inactive status.', 'Coordinate payment outside app where required.'],
    result: 'Contractor access can be tracked against licensing readiness.',
  },
  {
    route: '/enterprise/onboarding',
    purpose: 'Contractor onboarding recommendations and setup assistance.',
    users: 'Admin, EE, Contractor coordinator.',
    data: 'Contractor identity, company details, assigned project context.',
    steps: ['Open Onboarding.', 'Review recommended contractor setup.', 'Invite or coordinate users as per production process.', 'Confirm project assignment after onboarding.'],
    result: 'Contractor team is prepared to upload project evidence.',
  },
];

const uploadGuides = [
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
];

const projectSteps = [
  'Open /govtrack/projects from GovTrack Pro > Projects.',
  'Use the new/create project flow when available, or open /govtrack/projects/new directly.',
  'Enter project name, code, department, type, contract value, dates, contractor name, and location.',
  'Save the project, then open /enterprise/start-pilot or /enterprise/assign-project.',
  'Connect the project with EE workspace, AE, JE, and Contractor.',
  'Open /enterprise/access and confirm the assignment is visible.',
  'If the project is missing, check whether it was created under the correct user/workspace and whether assignment/access filters are hiding it.',
];

const aiFeatures = [
  'AI material inspection reviews material/QC evidence and highlights likely quality problems.',
  'AI quality review can summarize work photos and inspection evidence for reviewer attention.',
  'AI budget/progress analytics compares physical progress, financial progress, and risk gaps.',
  'AI TPA review can flag suspicious or incomplete third-party report evidence.',
  'AI hindrance impact estimation helps explain likely delay impact for extension review.',
  'AI diesel anomaly detection highlights unusual usage patterns for fuel monitoring.',
];

const dashboardGuides = [
  'Dashboard: daily overview for project status, alerts, progress, and operational signals.',
  'Gov Dashboard: government-project monitoring, project creation shortcut, and project summaries.',
  'Project progress review: compare physical completion, payments, milestones, and uploaded evidence.',
  'QC report: use Material Tests and Reports to review pass/fail, missing evidence, and AI quality flags.',
  'TPA report: use TPA Portal and Reports to review uploaded third-party reports and discrepancy notes.',
  'Hindrance report: use Hindrance Register, Extensions, and Reports to understand delay events and extension context.',
  'Export/PDF: reporting/export availability depends on the specific report page; use built-in report actions where visible.',
  'EE should monitor approvals, budget risk, contractor performance, and pilot adoption.',
  'AE should monitor assigned project progress, QC, TPA, JE verification, and exceptions.',
  'JE should monitor pending field uploads, rejected items, inspections, GIS, and hindrance evidence.',
  'Contractor should monitor own submissions, missing evidence, diesel/material/labour records, and returned items.',
];

const commonProblems = [
  { problem: 'Login not working', fix: 'Check email/password, internet, account invitation, and whether the account is active in Supabase Auth.' },
  { problem: 'App link not opening', fix: 'Confirm the deployed URL, browser cache, and mobile network. Try refresh or install/open the PWA again.' },
  { problem: 'Vercel protection issue', fix: 'Disable Vercel protection for pilot users or provide the correct Vercel access process before sharing the app link.' },
  { problem: 'No project showing', fix: 'Confirm project exists in /govtrack/projects and is assigned to the logged-in user/workspace.' },
  { problem: 'Assignment not visible', fix: 'Open /enterprise/access, then check /enterprise/assign-project or /enterprise/start-pilot for missing AE/JE/Contractor mapping.' },
  { problem: 'Access status issue', fix: 'Confirm the assignment status is active/pilot as intended and that the user is not using the wrong account.' },
  { problem: 'AI not responding', fix: 'AI depends on server-side Supabase Edge Function and Gemini/provider configuration. Do not add secrets to the client.' },
  { problem: 'Upload stuck', fix: 'Check internet, file size, storage configuration, and whether the offline queue is pending retry.' },
  { problem: 'Offline sync pending', fix: 'Reconnect, keep the app open for a short time, and avoid duplicate manual uploads until sync completes.' },
  { problem: 'Activity logs empty', fix: 'Confirm migration 016_user_activity_logs.sql is applied, user is logged in, and activity tracker is deployed.' },
];

const checklists = [
  {
    title: 'EE daily checklist',
    items: ['Open Dashboard and Gov Dashboard.', 'Review project progress and payment risks.', 'Check QC/TPA/hindrance/diesel alerts.', 'Verify access for active pilot projects.', 'Review Activity Logs during pilot.'],
  },
  {
    title: 'AE daily checklist',
    items: ['Review assigned project uploads.', 'Check material QC and TPA reports.', 'Review JE inspection notes.', 'Flag missing or poor evidence.', 'Escalate major risks to EE.'],
  },
  {
    title: 'JE daily checklist',
    items: ['Upload site photos with GPS.', 'Complete inspections and QC records.', 'Add hindrance entries quickly.', 'Check AI/reviewer feedback.', 'Confirm offline uploads sync after reconnect.'],
  },
  {
    title: 'Contractor daily checklist',
    items: ['Upload work evidence for assigned project.', 'Submit diesel/material/labour records.', 'Upload TPA/supporting documents.', 'Review rejected or pending items.', 'Avoid shared login usage.'],
  },
  {
    title: 'Admin pilot checklist',
    items: ['Confirm workspace, users, and project exist.', 'Verify project assignment in /enterprise/access.', 'Check Activity Logs.', 'Confirm AI/Edge Functions are configured.', 'Collect Day 15 feedback.'],
  },
];

const faqs = [
  { q: 'Is it free for government engineers?', a: 'Pilot access can be provided to government engineers as part of the rollout. Commercial terms depend on ARSPL/NIRMAN AI policy.' },
  { q: 'Who pays?', a: 'The intended paid model is generally contractor/platform licensing, while government users can be onboarded for monitoring and approval workflows as decided by ARSPL.' },
  { q: 'Can contractors use it?', a: 'Yes. Contractors can upload project evidence and operational records when they are assigned and licensed for the project.' },
  { q: 'Can it work offline?', a: 'Yes, field uploads can queue while connectivity is poor. Users should reconnect and check that pending sync finishes.' },
  { q: 'Is Google Drive required?', a: 'Google Drive is recommended for government document ownership. Production write access needs Google Drive OAuth, not only an API key.' },
  { q: 'Is AI mandatory?', a: 'No. Core project and upload workflows should remain human-reviewable. AI adds review assistance when server-side configuration is available.' },
  { q: 'Can it be used for roads, bridges, buildings, PHE, and irrigation?', a: 'Yes. The project model and field evidence flow are designed for multiple public works categories.' },
];

const pilotPlan = [
  { day: 'Day 1-2', task: 'Workspace and user setup', usage: 'Create/verify EE workspace, identify AE/JE/Contractor accounts, confirm login and access.' },
  { day: 'Day 3-4', task: 'Project creation and assignment', usage: 'Create project in /govtrack/projects, assign it in /enterprise/start-pilot, verify in /enterprise/access.' },
  { day: 'Day 5-7', task: 'Site upload, GIS, material QC', usage: 'JE/Contractor upload photos with GPS, add GIS context, upload material QC evidence.' },
  { day: 'Day 8-10', task: 'Hindrance, diesel, progress', usage: 'Enter hindrances, diesel records, and progress evidence; AE reviews exceptions.' },
  { day: 'Day 11-13', task: 'TPA and AI review', usage: 'Upload TPA reports, review AI material/quality/budget/hindrance/diesel flags where configured.' },
  { day: 'Day 14', task: 'Dashboard review', usage: 'EE/AE/JE review dashboard, reports, access, and missing evidence.' },
  { day: 'Day 15', task: 'Feedback and continuation decision', usage: 'Collect user feedback, confirm contractor readiness, and decide continuation or wider rollout.' },
];

function RouteBadge({ children }: { children: ReactNode }) {
  return <Badge color="#005F56" variant="ghost" className="font-mono">{children}</Badge>;
}

function ManualCard({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="mb-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#D8B15A]/30 bg-[#C89B3C]/12 text-[#D8B15A]">
            {icon}
          </div>
          <h2 className="text-lg font-bold text-[#12332D]">{title}</h2>
        </div>
        {children}
      </Card>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-[#4D5B52]">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-[#005F56]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function UserManualPage() {
  const [copied, setCopied] = useState(false);
  const pilotInstructions = useMemo(
    () => [
      'Open /enterprise/start-pilot.',
      'Select the EE workspace.',
      'Select the pilot project.',
      'Select AE, JE, and Contractor.',
      'Save assignment.',
      'Verify in /enterprise/access.',
      'Continue to dashboard and start field uploads.',
    ].join('\n'),
    []
  );

  async function copyPilotInstructions() {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(pilotInstructions);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <AppLayout title="NIRMAN AI User Manual" subtitle="Feature usage guide for EE, AE, JE, Contractor, and Admin users">
      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {roleGuides.slice(0, 4).map((role) => (
          <Card key={role.role} className="p-4">
            <p className="text-xs font-semibold text-[#6C7568]">{role.role}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#12332D]">{role.daily}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8B7A4A]">Table of contents</p>
            <h1 className="mt-1 text-2xl font-black text-[#12332D]">NIRMAN AI User Manual</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#4D5B52]">
              Use this guide to understand every major feature, who should use it, what data is required, and what to check during a government project pilot.
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<Copy size={14} />} onClick={copyPilotInstructions}>
            {copied ? 'Copied' : 'Copy Pilot Instructions'}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CDBD82] px-3 py-1.5 text-xs font-medium text-[#005F56] hover:border-[#005F56]/50 hover:bg-[#005F56]/5"
            >
              {section.icon}
              {section.title}
            </a>
          ))}
        </div>
      </Card>

      <ManualCard id="overview" title="1. Platform Overview" icon={<Landmark size={18} />}>
        <BulletList items={platformPoints} />
      </ManualCard>

      <ManualCard id="roles" title="2. User Roles" icon={<Users size={18} />}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {roleGuides.map((role) => (
            <div key={role.role} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <h3 className="font-semibold text-[#12332D]">{role.role}</h3>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#4D5B52]">
                <p><span className="font-semibold text-[#12332D]">Can do:</span> {role.can}</p>
                <p><span className="font-semibold text-[#12332D]">Use daily:</span> {role.daily}</p>
                <p><span className="font-semibold text-[#12332D]">Review:</span> {role.review}</p>
                <p><span className="font-semibold text-[#12332D]">Cannot do:</span> {role.cannot}</p>
              </div>
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="login" title="3. First-Time Login Guide" icon={<Shield size={18} />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BulletList
            items={[
              'Open the official NIRMAN AI app link: https://nirman.apostolicredeem.com.',
              'Go to /login, enter your registered email and password, then sign in.',
              'After login, check your name, role, dashboard, and whether the expected project appears.',
              'If the dashboard is empty, open /govtrack/projects and ask the EE/Admin to verify project assignment.',
              'If project is not assigned, the EE/Admin should open /enterprise/start-pilot or /enterprise/assign-project.',
              'If access is blocked, confirm that the correct account is used and that access to https://nirman.apostolicredeem.com is enabled for pilot users.',
            ]}
          />
          <div className="rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4 text-sm leading-relaxed text-[#6B5A1E]">
            Shared logins are not ideal. Separate accounts help the app track who uploaded evidence, who reviewed it, and who visited each pilot page.
          </div>
        </div>
      </ManualCard>

      <ManualCard id="start-pilot" title="4. Start Pilot Workflow" icon={<ClipboardCheck size={18} />}>
        <div className="mb-4 flex flex-wrap gap-2">
          <RouteBadge>/enterprise/start-pilot</RouteBadge>
          <RouteBadge>/enterprise/access</RouteBadge>
          <RouteBadge>/dashboard</RouteBadge>
        </div>
        <BulletList
          items={[
            'Open /enterprise/start-pilot.',
            'Select the workspace owned by the Executive Engineer.',
            'Select the project that will be used for the pilot.',
            'Select AE, JE, and Contractor users for the assignment.',
            'Save the assignment.',
            'Verify the assignment in /enterprise/access.',
            'Continue to the dashboard and begin field uploads/reviews.',
          ]}
        />
        <div className="mt-4 rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
          <h3 className="font-semibold text-[#12332D]">Demo pilot mode</h3>
          <BulletList
            items={[
              `Create Demo Pilot Data is available when pilot mode is enabled (${featureFlags.pilotMode ? 'currently enabled' : 'currently not enabled by flag'}).`,
              'Use Verify Access Control after demo creation to confirm the demo assignment appears.',
              'Use Pause Demo Assignment when you want to stop using the demo assignment without treating it as live project work.',
              'Demo data is for testing only; real pilots should use real EE, AE, JE, Contractor, and project records.',
            ]}
          />
        </div>
      </ManualCard>

      <ManualCard id="enterprise" title="5. Enterprise Module" icon={<Landmark size={18} />}>
        <div className="space-y-4">
          {enterpriseRoutes.map((route) => (
            <div key={route.route} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <RouteBadge>{route.route}</RouteBadge>
                <span className="text-sm font-semibold text-[#12332D]">{route.purpose}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm leading-relaxed text-[#4D5B52] lg:grid-cols-2">
                <p><span className="font-semibold text-[#12332D]">Who should use it:</span> {route.users}</p>
                <p><span className="font-semibold text-[#12332D]">Required data:</span> {route.data}</p>
                <div>
                  <p className="font-semibold text-[#12332D]">Step-by-step usage:</p>
                  <BulletList items={route.steps} />
                </div>
                <p><span className="font-semibold text-[#12332D]">Output/result:</span> {route.result}</p>
              </div>
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="projects" title="6. Project Management" icon={<FolderOpen size={18} />}>
        <div className="mb-3"><RouteBadge>/govtrack/projects</RouteBadge></div>
        <BulletList items={projectSteps} />
      </ManualCard>

      <ManualCard id="uploads" title="7. Upload & Field Reporting" icon={<Upload size={18} />}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {uploadGuides.map((guide) => (
            <div key={guide.name} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#12332D]">{guide.name}</h3>
                <RouteBadge>{guide.route}</RouteBadge>
              </div>
              <div className="space-y-2 text-sm leading-relaxed text-[#4D5B52]">
                <p><span className="font-semibold text-[#12332D]">What to upload:</span> {guide.upload}</p>
                <p><span className="font-semibold text-[#12332D]">Who uploads:</span> {guide.who}</p>
                <p><span className="font-semibold text-[#12332D]">How verification works:</span> {guide.verification}</p>
                <p><span className="font-semibold text-[#12332D]">What to review:</span> {guide.review}</p>
              </div>
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="ai" title="8. AI Features" icon={<Bot size={18} />}>
        <BulletList items={aiFeatures} />
        <div className="mt-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4 text-sm leading-relaxed text-[#6B5A1E]">
          AI depends on server-side Supabase Edge Function and Gemini/provider configuration. No AI secret should be exposed client-side in Vite environment variables or browser code.
        </div>
      </ManualCard>

      <ManualCard id="gis" title="9. GIS & Location Features" icon={<MapPin size={18} />}>
        <BulletList
          items={[
            'GPS tagging connects uploads and pins to field coordinates.',
            'Map preview helps reviewers confirm that evidence belongs to the correct project site.',
            'Project location should be entered during project creation and reviewed during assignment.',
            'Site verification uses photos, GPS, map pins, and inspection notes together.',
            'Route/location use cases include road stretches, bridge sites, water pipeline works, irrigation canals, and building locations.',
          ]}
        />
      </ManualCard>

      <ManualCard id="reports" title="10. Reports & Dashboard" icon={<FileText size={18} />}>
        <BulletList items={dashboardGuides} />
      </ManualCard>

      <ManualCard id="activity" title="11. Admin Activity Logs" icon={<ClipboardCheck size={18} />}>
        <div className="mb-3"><RouteBadge>/admin/activity</RouteBadge></div>
        <BulletList
          items={[
            'Tracks login, page visits, pilot workflow actions, and assignment events where the activity logger is called.',
            'Used for pilot monitoring so Admin/EE can see whether users are actually using the app.',
            'Shows user, event type, page path, event details, and timestamps depending on logged event data.',
            'Shared login is not ideal because activity cannot prove which real person uploaded, reviewed, or visited.',
            'Separate user accounts are better for accountability, audit trail, access control, and pilot feedback.',
          ]}
        />
      </ManualCard>

      <ManualCard id="drive" title="12. Google Drive Document Ownership" icon={<FolderOpen size={18} />}>
        <BulletList
          items={[
            'Government documents should remain in the EE Google Drive or EE-owned workspace Drive structure.',
            'Required path is NIRMAN AI / Workspace or Division Name / Project Code - Project Name / numbered module folder.',
            'Module folders are 01 Agreement & BOQ, 02 Drawings, 03 Daily Progress, 04 Labour, 05 Materials, 06 Equipment, 07 Survey & Quantity, 08 Inspections, 09 Material Tests, 10 RA Bills, 11 Payments, 12 Material Advance, 13 BG & SD, 14 Hindrance & Extensions, 15 DLP, 16 Photos & Site Evidence, and 17 Reports.',
            'Supabase stores metadata such as workspace_id, project_id, uploaded_by, role, document_type, module_name, original_filename, storage_provider, Supabase path, Drive file/folder IDs, file URL, AI processing status, and timestamps.',
            'If Drive OAuth is not configured, files stay linked in Supabase with google_drive_sync_pending or uploaded_to_supabase status instead of becoming scattered.',
            'Google Drive OAuth is required for final production write access to an EE-owned Drive.',
            'A Google API key alone is not enough for secure write access to a user or government Drive.',
            'Until Drive OAuth is fully configured, verify where documents are stored and who owns them before production rollout.',
          ]}
        />
      </ManualCard>

      <ManualCard id="offline" title="13. Offline/PWA Usage" icon={<Smartphone size={18} />}>
        <BulletList
          items={[
            'The app includes offline/PWA services and queue logic for poor-network field use.',
            'When internet is poor, eligible field submissions can remain pending in the offline queue.',
            'Background sync/retry attempts to send queued data after connection returns.',
            'Field users should upload from site with project, description, photo, and GPS as completely as possible.',
            'After reconnecting, users should check that pending uploads disappear and the project/report page shows the submitted data.',
            'Do not submit the same evidence repeatedly while the queue is pending unless the first upload clearly failed.',
          ]}
        />
      </ManualCard>

      <ManualCard id="pilot-plan" title="14. 15-Day Pilot Plan" icon={<CalendarDays size={18} />}>
        <div className="space-y-3">
          {pilotPlan.map((item) => (
            <div key={item.day} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <p className="font-semibold text-[#12332D]">{item.day}: {item.task}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#4D5B52]">{item.usage}</p>
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="problems" title="15. Common Problems & Fixes" icon={<AlertTriangle size={18} />}>
        <div className="space-y-3">
          {commonProblems.map((item) => (
            <div key={item.problem} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <p className="font-semibold text-[#12332D]">{item.problem}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#4D5B52]">{item.fix}</p>
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="checklists" title="16. Quick Checklist" icon={<CheckCircle2 size={18} />}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {checklists.map((list) => (
            <div key={list.title} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <h3 className="mb-3 font-semibold text-[#12332D]">{list.title}</h3>
              <BulletList items={list.items} />
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="faq" title="17. FAQ" icon={<HelpCircle size={18} />}>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <p className="font-semibold text-[#12332D]">{faq.q}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#4D5B52]">{faq.a}</p>
            </div>
          ))}
        </div>
      </ManualCard>

      <ManualCard id="support" title="18. Pilot Support" icon={<FileText size={18} />}>
        <p className="text-base font-semibold text-[#12332D]">For pilot support, contact ARSPL / NIRMAN AI team.</p>
      </ManualCard>
    </AppLayout>
  );
}
