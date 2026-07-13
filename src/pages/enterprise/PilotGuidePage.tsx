import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderTree,
  Landmark,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { featureFlags } from '../../lib/featureFlags';

type AccessLevel = 'Full Access' | 'Review Only' | 'Upload Only' | 'View Only' | 'No Access';

const roleColumns = ['EE', 'AE', 'JE', 'Contractor'] as const;

const accessColor: Record<AccessLevel, string> = {
  'Full Access': '#00D4AA',
  'Review Only': '#3B82F6',
  'Upload Only': '#F59E0B',
  'View Only': '#A0A0A0',
  'No Access': '#606060',
};

const roleMatrix: Array<{ action: string; EE: AccessLevel; AE: AccessLevel; JE: AccessLevel; Contractor: AccessLevel }> = [
  { action: 'Create Enterprise', EE: 'Full Access', AE: 'No Access', JE: 'No Access', Contractor: 'No Access' },
  { action: 'Add AE/JE', EE: 'Full Access', AE: 'Review Only', JE: 'No Access', Contractor: 'No Access' },
  { action: 'Add Contractor', EE: 'Full Access', AE: 'Review Only', JE: 'No Access', Contractor: 'No Access' },
  { action: 'Create Project', EE: 'Full Access', AE: 'Review Only', JE: 'No Access', Contractor: 'No Access' },
  { action: 'Assign Project', EE: 'Full Access', AE: 'Review Only', JE: 'View Only', Contractor: 'View Only' },
  { action: 'Upload Site Photo', EE: 'View Only', AE: 'Review Only', JE: 'Full Access', Contractor: 'Upload Only' },
  { action: 'Upload TPA Report', EE: 'Review Only', AE: 'Review Only', JE: 'Upload Only', Contractor: 'Upload Only' },
  { action: 'Upload Diesel Entry', EE: 'View Only', AE: 'Review Only', JE: 'Review Only', Contractor: 'Upload Only' },
  { action: 'Add Hindrance', EE: 'Review Only', AE: 'Review Only', JE: 'Full Access', Contractor: 'Upload Only' },
  { action: 'Review QC', EE: 'Review Only', AE: 'Full Access', JE: 'Full Access', Contractor: 'View Only' },
  { action: 'Approve Progress', EE: 'Full Access', AE: 'Review Only', JE: 'Review Only', Contractor: 'No Access' },
  { action: 'View Analytics', EE: 'Full Access', AE: 'Full Access', JE: 'View Only', Contractor: 'View Only' },
  { action: 'Export Report', EE: 'Full Access', AE: 'Full Access', JE: 'Review Only', Contractor: 'View Only' },
];

const features = [
  {
    name: 'Enterprise setup',
    appears: '/enterprise/setup, /enterprise',
    users: 'EE owns setup; AE/JE can view workspace context when assigned.',
    does: 'Creates the EE workspace boundary, stores department/division metadata, and maps Google project or Drive root metadata.',
    data: 'executive_engineer_workspaces, workspace_users, workspace_google_connections.',
    after: 'Workspace-scoped hierarchy, Drive folder naming, and project access rules become available.',
    limitation: 'Workspace creation and member creation are backend/RLS dependent; the current setup page edits Google metadata after a workspace exists.',
  },
  {
    name: 'Pilot onboarding',
    appears: '/enterprise/start-pilot, /enterprise/pilot, /enterprise/onboarding, /enterprise/pilot-guide',
    users: 'EE/admin pilot operator primarily; contractors receive onboarding recommendation context.',
    does: 'Shows pilot seed hierarchy, contractor licence status, manual checklist, and pilot readiness instructions.',
    data: 'pilotSeedData for demo, contractor_recommendations and contractor_licenses for live data.',
    after: 'Pilot team can verify who sees which projects and which contractor licences are active.',
    limitation: 'Demo flow is local simulation; invitation/payment automation is intentionally not triggered from the page.',
  },
  {
    name: 'EE workspace',
    appears: '/enterprise, /operations, /dashboard, /govtrack/reports',
    users: 'Executive Engineer and admin viewers.',
    does: 'Gives the owner a division-level view of projects, contractors, billing status, reports, approvals, and AI signals.',
    data: 'workspace membership, project_assignments, gov_projects, reports, uploads, inspections, payment requests.',
    after: 'EE monitors progress, approves or rejects payment/progress, and escalates issues.',
    limitation: 'Role labels are stored as workspace roles, while legacy app roles still use project_manager/site_engineer naming in some modules.',
  },
  {
    name: 'AE workspace',
    appears: '/enterprise/access, /govtrack, /budget-progress, /material-tests',
    users: 'Assistant Engineer assigned through project_assignments.assistant_engineer_id.',
    does: 'Reviews subdivision projects, QC, budget/progress, TPA reports, and JE field submissions.',
    data: 'workspace_users.parent_user_id, project_assignments, project data, upload/review rows.',
    after: 'AE review becomes the working layer between JE field verification and EE approval.',
    limitation: 'Dedicated AE dashboard is not separate yet; AE uses shared project/report pages filtered by assignment/RLS.',
  },
  {
    name: 'JE workspace',
    appears: '/govtrack/upload, /govtrack/inspect, /gis-map, /hindrance-register, /material-tests',
    users: 'Junior Engineer assigned through project_assignments.junior_engineer_id.',
    does: 'Captures field progress, photos, GIS pins, QC reports, inspection notes, and hindrances.',
    data: 'work_uploads, inspections, gis pins, hindrance records, material reports, project assignment.',
    after: 'Uploads enter review queues and dashboards for AE/EE monitoring.',
    limitation: 'JE specific route grouping is not separate; permissions come from assignment and module-level RLS.',
  },
  {
    name: 'Contractor access',
    appears: '/govtrack/upload, /diesel, /materials/reconciliation, /maintenance, /labour/payments',
    users: 'Licensed contractor and contractor users tied to assigned projects.',
    does: 'Lets contractor submit site photos, progress evidence, diesel/material/labour records, and documents.',
    data: 'contractor_licenses, contractor_license_users, project_assignments.contractor_id, document_metadata.',
    after: 'Submitted data is visible to JE/AE/EE according to project and workspace boundaries.',
    limitation: 'Contractor licence billing is modeled; payment collection is not performed in-app.',
  },
  {
    name: 'Project creation',
    appears: '/govtrack/projects and legacy /projects',
    users: 'EE/project manager style users with project management permission.',
    does: 'Creates project rows with department, contractor name, value, dates, location, type, and progress.',
    data: 'gov_projects for government pilot projects; projects for legacy construction sites.',
    after: 'Project appears in GovTrack project list and can receive uploads, payments, inspections, reports.',
    limitation: 'The creation form keeps project creation simple; use /enterprise/assign-project immediately after creation to map workspace, AE, JE, and Contractor.',
  },
  {
    name: 'Project assignment',
    appears: '/enterprise/start-pilot, /enterprise/assign-project, /enterprise/access, and /enterprise/pilot',
    users: 'EE owns assignment; AE/JE/Contractor consume assigned access.',
    does: 'Maps one project to EE, optional AE, optional JE, optional contractor, and access status.',
    data: 'project_assignments with workspace_id, project_id, assistant_engineer_id, junior_engineer_id, contractor_id.',
    after: 'RLS can limit project and document access to the assigned hierarchy; Access Control shows the saved rows.',
    limitation: 'Pilot and Paused are now supported directly; no manual Supabase edit is needed for normal assignment.',
  },
  {
    name: 'GIS module',
    appears: '/gis-map and GIS-related upload metadata.',
    users: 'JE/Contractor upload; AE/EE review.',
    does: 'Captures map pins, site locations, and geotagged field context for project evidence.',
    data: 'GIS pins/service data, project_id, coordinates, photos, uploaded_by.',
    after: 'Map context supports inspections, AI review, and dashboard risk signals.',
    limitation: 'Map provider configuration is environment dependent; Drive metadata linkage is documented but not fully automated.',
  },
  {
    name: 'Material QC',
    appears: '/material-tests, /materials/reconciliation, /materials/variance',
    users: 'JE and AE perform/review QC; contractor uploads supporting evidence; EE monitors.',
    does: 'Stores test reports, inspections, reconciliation, wastage variance, and AI quality review signals.',
    data: 'material reports, files, project_id, AI verification output, offline queue items.',
    after: 'Reports are queued/uploaded, optionally analyzed by AI, and shown for review.',
    limitation: 'Some AI verification depends on Supabase Edge Functions and configured server-side keys.',
  },
  {
    name: 'Budget analytics',
    appears: '/budget-progress, /govtrack/payments, /govtrack/reports',
    users: 'EE/AE review; JE contributes field basis; contractor sees own payment context.',
    does: 'Compares physical progress, financial progress, claimed amounts, and risk flags.',
    data: 'budget snapshots, payment_requests, gov_projects values, milestone/progress data.',
    after: 'Dashboards highlight gaps and payment approval risks.',
    limitation: 'Budget gap automation depends on scheduled Supabase functions and available project/payment data.',
  },
  {
    name: 'TPA verification',
    appears: '/tpa-portal',
    users: 'Contractor/JE upload; AE/EE review.',
    does: 'Accepts third-party report files and flags suspicious naming, missing signatures, and document anomalies.',
    data: 'TPA files, project_id, uploader, issue flags, optional AI review.',
    after: 'Reports enter review queues and can inform payment/QC decisions.',
    limitation: 'The current page includes lightweight local checks; deeper discrepancy analysis runs through Edge Functions when configured.',
  },
  {
    name: 'Hindrance management',
    appears: '/hindrance-register, /extensions, /dlp-tracker',
    users: 'JE/Contractor add events; AE/EE review and use for extensions/DLP.',
    does: 'Captures stoppages, causes, owner, dates, evidence, and extension context.',
    data: 'hindrance entries, project_id, dates, reason, owner, attachments.',
    after: 'Hindrances feed delay review, extension letters, and weekly reporting.',
    limitation: 'Final authority approval remains outside the current app workflow.',
  },
  {
    name: 'Diesel tracking',
    appears: '/diesel, /diesel/new, /diesel/alerts, /diesel/reports',
    users: 'Contractor uploads/issues entries; JE/AE/EE review anomalies.',
    does: 'Tracks diesel receipts, issues, equipment/operator usage, and fraud alerts.',
    data: 'diesel logs, operator/equipment references, quantities, project_id, timestamps.',
    after: 'Alerts and reports surface suspicious consumption patterns.',
    limitation: 'Full IoT/fuel sensor integration is not part of the current UI.',
  },
  {
    name: 'Offline queue',
    appears: 'Upload, material, TPA, hindrance, diesel, and offline sync indicator surfaces.',
    users: 'Field users on low network: JE, Contractor, field supervisors.',
    does: 'Queues submissions locally and retries sync when connectivity returns.',
    data: 'IndexedDB/local queue payloads, project_id, module payload, retry metadata.',
    after: 'Queued data syncs to Supabase/services without blocking field entry.',
    limitation: 'Conflict resolution is service-level; users should avoid duplicate manual submissions after reconnect.',
  },
  {
    name: 'Google Drive document ownership model',
    appears: '/enterprise/setup, /enterprise/pilot, document upload modules.',
    users: 'EE owns workspace Drive root; AE/JE/Contractor upload metadata under project scope.',
    does: 'Keeps government document ownership under EE workspace and stores Drive IDs in Supabase metadata.',
    data: 'workspace_google_connections, workspace_drive_folders, document_metadata.drive_file_id.',
    after: 'App can reference documents without storing government blobs directly in Supabase tables.',
    limitation: 'Drive OAuth write path falls back to Supabase storage unless provider/user token is configured.',
  },
  {
    name: 'AI inspection/reporting',
    appears: '/govtrack/inspect, /material-tests, /drawing-compare, /reports, Edge Function backed AI pages.',
    users: 'JE/AE/EE use AI review; contractor can receive feedback where module allows.',
    does: 'Generates inspection notes, discrepancy analysis, progress reports, drawing checks, and risk flags.',
    data: 'Project context, uploads, reports, file references, Edge Function response data.',
    after: 'AI output becomes review guidance; human approvers retain final decision.',
    limitation: 'Gemini keys must remain server-side via Supabase Edge Functions; client pages should never expose raw keys.',
  },
];

const pilotFlow = [
  'EE creates or joins the enterprise workspace, becoming the workspace owner.',
  'EE enters department, division, district, project namespace, and optional Google Drive root details.',
  'EE adds AE, JE, and Contractor hierarchy in workspace_users, with AE reporting to EE and JE reporting to AE.',
  'EE creates the pilot project in GovTrack Projects with name, code, department, value, dates, location, and contractor name.',
  'EE assigns the project in project_assignments to AE, JE, and Contractor; this is the ownership link for hierarchy and access.',
  'Contractor uploads site/project data through Upload Work, Diesel, Materials, Labour, TPA, or Maintenance modules.',
  'JE verifies field data, GIS context, QC evidence, hindrances, and inspection notes.',
  'AE reviews progress, quality, budget gap, and exceptions before EE-level approval.',
  'EE monitors dashboards, reports, access control, billing readiness, and final approvals.',
  'AI modules generate inspection insights, material flags, budget risks, document review notes, and project reports.',
];

const usageSteps = [
  'Open Enterprise > Start Pilot or go directly to /enterprise/start-pilot.',
  'Select the EE workspace that will own the pilot.',
  'Select an existing project, or create it first from /govtrack/projects and return.',
  'Select AE, JE, Contractor, and pilot status.',
  'Save the assignment; the wizard writes or updates the project_assignments row.',
  'Verify the saved row in Access Control.',
  'Contractor opens GovTrack Upload Work or module-specific pages and submits site evidence.',
  'JE opens Upload/Inspect/GIS/Material/Hindrance pages to verify field data.',
  'AE reviews reports, QC, budget, and progress pages.',
  'EE opens Dashboard, Ops Center, GovTrack Reports, and Enterprise pages for monitoring and approval.',
];

const pilotPlan = [
  { day: 'Day 1-2', focus: 'Enterprise setup, EE onboarding, hierarchy creation', outcome: 'Workspace exists, EE is owner, AE/JE/Contractor users are identified.' },
  { day: 'Day 3-4', focus: 'Project creation, AE/JE/Contractor assignment', outcome: 'First project exists and has a project_assignments row.' },
  { day: 'Day 5-7', focus: 'Site photo, GIS pinning, material QC upload', outcome: 'Field evidence arrives with project, uploader, and location context.' },
  { day: 'Day 8-10', focus: 'Budget progress, hindrance, diesel logs', outcome: 'Financial/physical gaps, delay causes, and fuel usage are visible.' },
  { day: 'Day 11-13', focus: 'TPA documents, AI review, issue tracking', outcome: 'TPA/QC documents and AI review notes are ready for AE/EE review.' },
  { day: 'Day 14', focus: 'Dashboard review', outcome: 'EE/AE/JE review pilot metrics, missing data, and approval bottlenecks.' },
  { day: 'Day 15', focus: 'Pilot feedback and billing readiness discussion', outcome: 'Pilot decision, contractor licence readiness, and rollout next steps are agreed.' },
];

const requiredData = [
  'EE profile ID, department, division code, district, workspace name.',
  'AE and JE profile IDs, reporting relationship, subdivision if available.',
  'Contractor profile ID, company name, licence status, contractor user count.',
  'Project name, code, department, location, type, contract value, start/end dates.',
  'Assignment IDs: workspace_id, project_id, executive_engineer_id, assistant_engineer_id, junior_engineer_id, contractor_id.',
  'Google Drive root folder ID and project folder naming convention if Drive ownership is enabled.',
  'Module evidence: photos, TPA reports, QC reports, diesel entries, hindrance notes, GIS coordinates.',
];

const commonMistakes = [
  'Creating a GovTrack project but not creating the matching project_assignments row.',
  'Typing contractor name only without linking contractor_id where assignment/RLS needs a user ID.',
  'Uploading documents before workspace Drive metadata or document_metadata ownership is clarified.',
  'Expecting AE/JE dashboards to be separate pages; today they use shared pages with assignment-based access.',
  'Putting Gemini or other AI keys in Vite client environment variables instead of Supabase Edge Function secrets.',
  'Submitting the same offline payload manually again after reconnect instead of letting the queue retry.',
];

const limitations = [
  'Assignment UI is available at /enterprise/assign-project, but project creation still remains separate from assignment.',
  'Drive folder rows and document metadata are not auto-created by the assignment save yet.',
  'Google Drive write automation depends on OAuth/provider setup; metadata model is present.',
  'Role naming is partly legacy: app roles use project_manager/site_engineer while enterprise hierarchy uses EE/AE/JE.',
  'Supabase RLS and Edge Functions must be deployed separately; Vercel hosts the static SPA only.',
];

const nextSteps = [
  'Add project dashboard chips for assigned AE, JE, Contractor, workspace, and Drive folder status.',
  'Add a Supabase-safe member picker sourced from workspace_users.',
  'Automate document_metadata creation when Drive or fallback storage upload completes.',
  'Create pilot feedback report export from Day 15 metrics.',
];

const demoTesting = [
  'Open /enterprise/start-pilot with VITE_ENABLE_PILOT_MODE=true.',
  'Click Create Demo Pilot Data only when you intentionally want test records.',
  'The app creates or reuses NIRMAN Pilot Demo Workspace, Demo Road Construction Pilot Project, and a pilot assignment.',
  'Demo AE, JE, and Contractor are placeholders unless real invited users exist; the client does not create fake auth users.',
  'Use demo data only for first testing. Real pilots should use actual EE workspace, project, AE, JE, and contractor records.',
  'Demo assignment can be paused later; records are not deleted by the wizard.',
];

function SectionHeader({ icon, title, eyebrow }: { icon: ReactNode; title: string; eyebrow?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8B15A]/30 bg-[#C89B3C]/12 text-[#D8B15A]">
        {icon}
      </div>
      <div>
        {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8B7A4A]">{eyebrow}</p>}
        <h2 className="text-base font-semibold text-[#12332D]">{title}</h2>
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-[#4D5B52]">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-[#005F56]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PilotGuidePage() {
  return (
    <AppLayout title="Pilot Project Usage & Assignment Guide" subtitle="How EE, AE, JE, Contractor, projects, Drive, and AI connect in NIRMAN AI">
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-[#6C7568]">Project owner</p>
          <p className="mt-2 text-xl font-bold text-[#12332D]">EE</p>
          <p className="mt-1 text-xs text-[#4D5B52]">Creates workspace, creates project, assigns hierarchy, approves progress.</p>
        </Card>
        <Card>
          <p className="text-xs text-[#6C7568]">Review chain</p>
          <p className="mt-2 text-xl font-bold text-[#12332D]">EE - AE - JE</p>
          <p className="mt-1 text-xs text-[#4D5B52]">AE reviews subdivision work; JE verifies field evidence.</p>
        </Card>
        <Card>
          <p className="text-xs text-[#6C7568]">Contractor role</p>
          <p className="mt-2 text-xl font-bold text-[#12332D]">Upload + comply</p>
          <p className="mt-1 text-xs text-[#4D5B52]">Uploads site, material, TPA, diesel, labour, and maintenance data.</p>
        </Card>
        <Card>
          <p className="text-xs text-[#6C7568]">Pilot mode</p>
          <p className="mt-2 text-xl font-bold text-[#12332D]">{featureFlags.pilotMode ? 'Enabled' : 'Guide available'}</p>
          <p className="mt-1 text-xs text-[#4D5B52]">Safe documentation and demo flow only; no runtime routing rewrite.</p>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader icon={<Landmark size={18} />} title="How To Start Pilot" eyebrow="Start here" />
          <BulletList items={usageSteps} />
        </Card>
        <Card>
          <SectionHeader icon={<FolderTree size={18} />} title="How To Assign First Project" eyebrow="Assignment rule" />
          <div className="space-y-3 text-sm text-[#4D5B52]">
            <p>The EE is the owner of the workspace and first pilot project. EE creates the project, then links that project to AE, JE, and Contractor through project_assignments.</p>
            <p>Recommended path: /enterprise/start-pilot. Direct create screen: /govtrack/projects. Advanced assignment editor: /enterprise/assign-project. Assignment visibility: /enterprise/access.</p>
            <p className="rounded-lg border border-[#CDBD82] bg-[#FFF8E1] px-3 py-2 text-[#6B5A1E]">
              Step-by-step: EE opens Start Pilot Wizard, selects workspace, selects project, selects AE/JE/Contractor, saves assignment, then verifies the row on Access Control.
            </p>
          </div>
          {/* TODO: Add assigned AE/JE/Contractor chips on GovProjectDetailPage once live assignment reads are wired. */}
        </Card>
      </div>

      <Card className="mb-6">
        <SectionHeader icon={<Users size={18} />} title="Pilot Project Assignment Flow" eyebrow="End to end" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {pilotFlow.map((step, index) => (
            <div key={step} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
              <p className="text-[10px] font-bold uppercase text-[#8B7A4A]">Step {index + 1}</p>
              <p className="mt-1 text-sm text-[#12332D]">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <SectionHeader icon={<ShieldCheck size={18} />} title="Role-Wise Responsibilities" eyebrow="Access matrix" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[#D9D0B5] text-left text-[#6C7568]">
                <th className="py-3 pr-4 font-medium">Action</th>
                {roleColumns.map((role) => (
                  <th key={role} className="py-3 pr-4 font-medium">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row) => (
                <tr key={row.action} className="border-b border-[#E8DFC6]">
                  <td className="py-3 pr-4 font-medium text-[#12332D]">{row.action}</td>
                  {roleColumns.map((role) => (
                    <td key={role} className="py-3 pr-4">
                      <Badge color={accessColor[row[role]]}>{row[role]}</Badge>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mb-6">
        <SectionHeader icon={<ClipboardCheck size={18} />} title="Feature-Wise Usage" eyebrow="Platform map" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.name} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="font-semibold text-[#12332D]">{feature.name}</h3>
                <Badge color="#005F56">{feature.appears}</Badge>
              </div>
              <div className="space-y-2 text-xs leading-relaxed text-[#4D5B52]">
                <p><span className="font-semibold text-[#12332D]">What it does:</span> {feature.does}</p>
                <p><span className="font-semibold text-[#12332D]">Who can use it:</span> {feature.users}</p>
                <p><span className="font-semibold text-[#12332D]">Data required:</span> {feature.data}</p>
                <p><span className="font-semibold text-[#12332D]">After submission:</span> {feature.after}</p>
                <p><span className="font-semibold text-[#12332D]">Limitation/TODO:</span> {feature.limitation}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader icon={<CalendarDays size={18} />} title="Recommended 15-Day Pilot Plan" eyebrow="Timeline" />
          <div className="space-y-3">
            {pilotPlan.map((item) => (
              <div key={item.day} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-3">
                <p className="text-sm font-semibold text-[#12332D]">{item.day}</p>
                <p className="mt-1 text-sm text-[#4D5B52]">{item.focus}</p>
                <p className="mt-1 text-xs text-[#6C7568]">{item.outcome}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeader icon={<FileText size={18} />} title="Required Data Before Starting" eyebrow="Checklist" />
          <BulletList items={requiredData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <SectionHeader icon={<AlertTriangle size={18} />} title="Common Mistakes" />
          <BulletList items={commonMistakes} />
        </Card>
        <Card>
          <SectionHeader icon={<MapPin size={18} />} title="Current Limitations" />
          <BulletList items={limitations} />
        </Card>
        <Card>
          <SectionHeader icon={<Bot size={18} />} title="Next Steps After Pilot" />
          <BulletList items={nextSteps} />
        </Card>
      </div>

      <Card className="mt-6">
        <SectionHeader icon={<ClipboardCheck size={18} />} title="Testing With Demo Pilot Data" eyebrow="Pilot mode only" />
        <BulletList items={demoTesting} />
      </Card>
    </AppLayout>
  );
}
