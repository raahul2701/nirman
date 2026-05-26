import { ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  FolderOpen,
  HardHat,
  Landmark,
  MapPin,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  WifiOff,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type FeatureItem = {
  name: string;
  utility: string;
};

type AiFeature = {
  name: string;
  utility: string;
  benefit: string;
};

const introPoints = [
  'Roads, bridges, buildings, irrigation, PHE, and government infrastructure projects.',
  'AI-assisted monitoring for quality, progress, documents, budget risk, hindrances, and diesel anomalies.',
  'GIS-based field tracking with GPS-tagged site evidence and project mapping.',
  'Mobile-first execution for engineers, contractors, and field staff.',
  'Offline-ready workflows for remote and rural project locations.',
  'Enterprise hierarchy for EE, AE, JE, Contractor, and project-level coordination.',
];

const fieldProblems = [
  'Project records are often scattered across registers, WhatsApp messages, files, and separate spreadsheets.',
  'Progress reporting is delayed because site evidence reaches officers late or without proper context.',
  'Coordination between EE, AE, JE, contractor, and field staff depends heavily on manual follow-up.',
  'Site verification is difficult when photos do not carry GPS, project, date, or milestone context.',
  'Manual monitoring creates extra burden during reviews, inspections, meetings, and payment checks.',
  'Contractor coordination becomes slow when documents, QC evidence, and site updates are not centralized.',
  'Quality checks and TPA report review can be delayed or disconnected from daily progress.',
  'Departments lack field visibility when projects are remote, rural, or spread across long road/irrigation stretches.',
  'Poor connectivity makes real-time upload difficult unless the platform is designed for offline field use.',
];

const engineerBenefits = [
  {
    role: 'Executive Engineer',
    benefits: [
      'Division-level visibility across active projects and pilot assignments.',
      'Faster review meetings with project status, uploads, QC, TPA, hindrance, and diesel signals in one place.',
      'Better accountability because activity, uploads, and assignment context are traceable by user.',
      'AI-assisted quality and progress summaries to support faster decision-making.',
      'Controlled workspace ownership so department documents and access stay under the right hierarchy.',
    ],
  },
  {
    role: 'Assistant Engineer',
    benefits: [
      'Cleaner subdivision/project review with assigned project visibility.',
      'Easier review of JE site evidence, contractor uploads, QC reports, TPA records, and budget/progress gaps.',
      'Geo-tagged monitoring support without waiting for separate manual reports.',
      'Faster escalation of missing evidence, quality issues, and delay risks to EE.',
      'Mobile monitoring from office, field, or review meetings.',
    ],
  },
  {
    role: 'Junior Engineer',
    benefits: [
      'Simple mobile-first field upload for photos, GPS, inspection notes, and project evidence.',
      'Reduced paperwork because site updates, QC records, and hindrance entries are captured digitally.',
      'Better proof of work completed at the actual location and date.',
      'Offline support for low-network sites with later sync.',
      'Clearer coordination with AE/EE and contractor through centralized project records.',
    ],
  },
];

const contractorBenefits = [
  'Faster communication with engineers because progress evidence is uploaded against the correct project.',
  'Centralized photos, TPA reports, material QC documents, diesel records, labour/maintenance context, and site evidence.',
  'Reduced paperwork and repeated manual sharing during reviews.',
  'Better transparency because submitted work, pending review, and flagged items are easier to trace.',
  'Faster issue escalation for hindrances, remote-site constraints, missing approvals, or field blockers.',
  'Progress tracking that helps prepare review meetings and payment-support documentation.',
  'QC evidence preservation so important reports are not lost in informal channels.',
  'Future digital compliance readiness for departments moving toward evidence-based monitoring.',
];

const aiFeatures: AiFeature[] = [
  {
    name: 'AI Material QC',
    utility: 'Reviews material test evidence, quality notes, and report context.',
    benefit: 'Helps AE/JE/EE quickly identify suspicious, incomplete, or poor-quality material evidence.',
  },
  {
    name: 'AI TPA Review',
    utility: 'Checks third-party inspection reports for completeness and discrepancy signals.',
    benefit: 'Supports faster review before payments, approvals, or corrective action discussions.',
  },
  {
    name: 'AI Budget Analytics',
    utility: 'Compares financial progress, physical progress, and risk indicators.',
    benefit: 'Helps officers spot gaps between money claimed, work done, and project progress.',
  },
  {
    name: 'AI Progress Tracking',
    utility: 'Summarizes uploaded work evidence and progress descriptions.',
    benefit: 'Reduces manual reading load and improves meeting preparation.',
  },
  {
    name: 'AI Hindrance Impact Estimation',
    utility: 'Assists in understanding delay reasons, likely impact, and extension context.',
    benefit: 'Creates clearer decision support for delay review while keeping final authority with engineers.',
  },
  {
    name: 'AI Diesel Monitoring',
    utility: 'Highlights abnormal diesel usage and repeated consumption patterns.',
    benefit: 'Improves fuel monitoring and makes suspicious entries easier to review.',
  },
  {
    name: 'AI Project Insights',
    utility: 'Combines project data, field uploads, reviews, and operational signals.',
    benefit: 'Gives leadership a practical project risk view without replacing human judgement.',
  },
];

const currentFeatures: FeatureItem[] = [
  { name: 'Project Management', utility: 'Create, view, and monitor government projects with core contract and progress details.' },
  { name: 'AI Material QC', utility: 'Use AI-assisted review to support material quality checks and evidence review.' },
  { name: 'GIS Tracking', utility: 'Connect photos, pins, and project locations with GPS context.' },
  { name: 'Hindrance Monitoring', utility: 'Record delay events, causes, dates, evidence, and extension context.' },
  { name: 'Diesel Tracking', utility: 'Capture diesel entries and review usage reports or anomaly alerts.' },
  { name: 'TPA Verification', utility: 'Upload and review third-party reports with discrepancy support.' },
  { name: 'Dashboard Analytics', utility: 'Review operational status, progress, and risk signals from one dashboard.' },
  { name: 'Activity Tracking', utility: 'Monitor login, page visits, pilot actions, and assignment activity during rollout.' },
  { name: 'Role-based Access', utility: 'Limit project visibility through EE, AE, JE, Contractor, and Admin responsibilities.' },
  { name: 'Offline Queue', utility: 'Queue field submissions when connectivity is poor and sync after reconnection.' },
  { name: 'PWA Support', utility: 'Use the app in a mobile-friendly installed experience where supported by the browser.' },
  { name: 'Mobile-first Uploads', utility: 'Let site users submit photos, GPS, descriptions, and reports from the field.' },
  { name: 'Enterprise Workspace', utility: 'Organize project monitoring around department/workspace ownership.' },
  { name: 'Access Control', utility: 'Verify which AE, JE, and Contractor are mapped to each pilot project.' },
  { name: 'Pilot Wizard', utility: 'Start a controlled pilot by selecting workspace, project, AE, JE, and Contractor.' },
  { name: 'Activity Logs', utility: 'Review pilot usage and identify whether separate user accounts are being used properly.' },
  { name: 'User Manual', utility: 'Give new EE/AE/JE/Contractor users a full in-app feature usage guide.' },
];

const differentiators = [
  'Designed around real infrastructure workflows, not a generic ERP screen renamed for construction.',
  'Field-oriented: evidence, GPS, uploads, QC, TPA, hindrance, diesel, and progress are treated as daily operations.',
  'Government workflow focused: EE, AE, JE, contractor, project, and department ownership are part of the model.',
  'Contractor coordination aware: the platform supports submission, transparency, and compliance without making the contractor blind to project context.',
  'Mobile-first and offline-ready for remote roads, irrigation stretches, bridges, rural works, and low-network locations.',
  'AI-assisted, but not AI-dependent: engineers remain the authority, and AI supports review instead of replacing field judgement.',
];

const pilotSteps = [
  'Start Pilot from the enterprise pilot workflow.',
  'Create or verify the EE workspace.',
  'Create/select the project and add the team.',
  'Assign AE, JE, and Contractor to the project.',
  'Upload field photos, documents, QC, TPA, diesel, hindrance, and GIS data.',
  'Review dashboard, access control, reports, and AI-assisted insights.',
  'Use the 15-day pilot onboarding approach to collect feedback and decide rollout readiness.',
];

const salesPitch = `NIRMAN AI is an AI-assisted project monitoring and field execution platform built for government infrastructure work such as roads, bridges, buildings, irrigation, PHE, and rural projects.

It helps Executive Engineers, Assistant Engineers, Junior Engineers, contractors, and field staff work from one practical digital system. Site photos, project documents, GIS locations, QC evidence, TPA reports, hindrances, diesel records, and progress updates can be captured and reviewed with clearer accountability.

For government engineers, NIRMAN AI improves visibility, review speed, field verification, reporting, and decision support. For contractors, it improves communication, evidence submission, transparency, and digital compliance readiness. AI supports material QC, TPA review, budget/progress analytics, hindrance impact review, diesel anomaly checks, and project insights while keeping final decisions with engineers.

Department data should remain under department ownership. NIRMAN AI supports a controlled EE-AE-JE-Contractor hierarchy, role-based access, Google Drive ownership planning, and metadata-based tracking through Supabase.

The platform is designed for practical field execution: mobile-first, GIS-aware, offline-ready, and suitable for a 15-day pilot adoption model.`;

const pilotInvitation = `NIRMAN AI invites selected departments and project teams to run a structured 15-day pilot for AI-assisted project monitoring and field execution.

The pilot can begin with one workspace, one project, assigned EE/AE/JE/Contractor users, mobile field uploads, GIS tagging, QC/TPA review, dashboard monitoring, and activity tracking. Feedback from engineers and contractors will be used to improve the workflow before wider adoption.

For pilot support, contact Rahul Narayan, Founder - NIRMAN AI, Apostolic Redeem Services Pvt Ltd (ARSPL). WhatsApp: +91 74880 82696. App: https://nirman.apostolicredeem.com`;

function Section({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
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

function CopyButton({ label, copiedLabel, text }: { label: string; copiedLabel: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button variant="outline" size="sm" icon={<Copy size={14} />} onClick={handleCopy}>
      {copied ? copiedLabel : label}
    </Button>
  );
}

export function NirmanAiValuePage() {
  const contactLine = useMemo(
    () => 'Rahul Narayan | Founder - NIRMAN AI | Apostolic Redeem Services Pvt Ltd (ARSPL) | WhatsApp: +91 74880 82696 | App: https://nirman.apostolicredeem.com',
    []
  );

  return (
    <AppLayout
      title="NIRMAN AI - AI-assisted Project Monitoring & Field Execution Platform"
      subtitle="A practical value proposition for government engineers, contractors, departments, and field teams"
    >
      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {[
          { label: 'For Government', value: 'Visibility + accountability', icon: <Landmark size={18} /> },
          { label: 'For Contractors', value: 'Coordination + evidence', icon: <HardHat size={18} /> },
          { label: 'For Field Staff', value: 'Mobile + offline work', icon: <Smartphone size={18} /> },
          { label: 'For Departments', value: 'Controlled data ownership', icon: <ShieldCheck size={18} /> },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8B15A]/30 bg-[#C89B3C]/12 text-[#D8B15A]">
              {item.icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6C7568]">{item.label}</p>
            <p className="mt-2 text-base font-bold text-[#12332D]">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8B7A4A]">Value proposition</p>
            <h1 className="mt-1 text-2xl font-black text-[#12332D]">
              Practical monitoring for infrastructure execution
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[#4D5B52]">
              NIRMAN AI is built to support the daily reality of public works: field evidence, hierarchy, contractor coordination, quality review,
              project visibility, and decision support. The platform is intended to reduce monitoring burden while improving trust in project data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton label="Copy Sales Pitch" copiedLabel="Sales Pitch Copied" text={salesPitch} />
            <CopyButton label="Copy Pilot Invitation" copiedLabel="Invitation Copied" text={pilotInvitation} />
          </div>
        </div>
      </Card>

      <Section id="introduction" title="1. Introduction" icon={<Building2 size={18} />}>
        <p className="mb-4 text-sm leading-relaxed text-[#4D5B52]">
          NIRMAN AI is a digital project monitoring and field execution platform designed for departments and contractors working on infrastructure projects.
          It brings project records, site evidence, GIS, mobile uploads, AI-assisted review, and enterprise hierarchy into one practical operating flow.
        </p>
        <BulletList items={introPoints} />
      </Section>

      <Section id="created" title="2. Why NIRMAN AI Was Created" icon={<AlertTriangle size={18} />}>
        <BulletList items={fieldProblems} />
      </Section>

      <Section id="engineers" title="3. Win-Win for Government Engineers" icon={<Landmark size={18} />}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {engineerBenefits.map((group) => (
            <div key={group.role} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <h3 className="mb-3 font-semibold text-[#12332D]">{group.role}</h3>
              <BulletList items={group.benefits} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="contractors" title="4. Win-Win for Contractors" icon={<HardHat size={18} />}>
        <BulletList items={contractorBenefits} />
      </Section>

      <Section id="ai" title="5. AI-Powered Features" icon={<Bot size={18} />}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {aiFeatures.map((feature) => (
            <div key={feature.name} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <h3 className="font-semibold text-[#12332D]">{feature.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4D5B52]">
                <span className="font-semibold text-[#12332D]">Utility:</span> {feature.utility}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#4D5B52]">
                <span className="font-semibold text-[#12332D]">Real field benefit:</span> {feature.benefit}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="gis" title="6. GIS & Geo-Tagging" icon={<MapPin size={18} />}>
        <BulletList
          items={[
            'GPS tagging connects site photos and uploads to actual project locations.',
            'Geo verification helps officers confirm that field evidence belongs to the right work site.',
            'Project mapping improves visibility for long roads, irrigation canals, bridge sites, and rural infrastructure.',
            'Route/location visibility helps compare site progress with field geography.',
            'Field validation becomes stronger when photo, date, project, user, and location context are reviewed together.',
          ]}
        />
      </Section>

      <Section id="offline" title="7. Offline-First Capability" icon={<WifiOff size={18} />}>
        <BulletList
          items={[
            'Designed for poor-network field environments where instant upload may not always be possible.',
            'Field uploads can be queued and synced after connectivity returns.',
            'Mobile users can continue capturing site evidence in remote areas.',
            'Background sync reduces the risk of losing field data due to temporary internet failure.',
            'This matters for rural roads, irrigation stretches, remote bridges, and scattered project sites.',
          ]}
        />
      </Section>

      <Section id="safety" title="8. Data Safety & Ownership" icon={<ShieldCheck size={18} />}>
        <div className="mb-4 rounded-lg border border-[#CDBD82] bg-[#FFF8E1] p-4 text-sm font-semibold leading-relaxed text-[#6B5A1E]">
          Department data should remain under department ownership.
        </div>
        <BulletList
          items={[
            'Government document ownership should remain under department-controlled systems such as the EE Google Drive structure.',
            'Supabase stores metadata such as project, uploader, document type, status, timestamps, and file references.',
            'Controlled access hierarchy limits project visibility by EE, AE, JE, Contractor, and Admin roles.',
            'Project files should not be publicly exposed; access should flow through authenticated users and assigned project relationships.',
            'Role-based access and assignment controls support safer monitoring during pilots and production use.',
            'Future Google Drive OAuth integration is the correct production path for secure department-owned write access.',
          ]}
        />
      </Section>

      <Section id="hierarchy" title="9. Enterprise Hierarchy" icon={<Users size={18} />}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {['EE', 'AE', 'JE', 'Contractor', 'Projects'].map((item) => (
            <Badge key={item} color="#005F56" variant="secondary">{item}</Badge>
          ))}
        </div>
        <BulletList
          items={[
            'Executive Engineer owns the workspace and project monitoring chain.',
            'Assistant Engineer reviews assigned project/subdivision data and escalates exceptions.',
            'Junior Engineer verifies field data, uploads evidence, and maintains site-level records.',
            'Contractor submits progress evidence, documents, diesel/material/labour records, and project updates.',
            'Project assignments control who can see, upload, review, and monitor the work.',
          ]}
        />
      </Section>

      <Section id="pilot" title="10. Pilot Workflow" icon={<ClipboardCheck size={18} />}>
        <BulletList items={pilotSteps} />
      </Section>

      <Section id="features" title="11. Current Features Available" icon={<FileText size={18} />}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {currentFeatures.map((feature) => (
            <div key={feature.name} className="rounded-lg border border-[#D9D0B5] bg-[#FAF7EC] p-4">
              <p className="font-semibold text-[#12332D]">{feature.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#4D5B52]">{feature.utility}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="different" title="12. Why This Platform Is Different" icon={<TrendingUp size={18} />}>
        <BulletList items={differentiators} />
      </Section>

      <Section id="invitation" title="13. Pilot Invitation" icon={<FolderOpen size={18} />}>
        <p className="mb-4 text-sm leading-relaxed text-[#4D5B52] whitespace-pre-line">{pilotInvitation}</p>
        <CopyButton label="Copy Pilot Invitation" copiedLabel="Invitation Copied" text={pilotInvitation} />
      </Section>

      <Section id="closing" title="14. Final Closing" icon={<CheckCircle2 size={18} />}>
        <div className="rounded-lg border border-[#B7E4D8] bg-[#EAF8F3] p-4 text-sm leading-relaxed text-[#12332D]">
          NIRMAN AI is built for practical field execution. It supports engineers and contractors together through technology-assisted monitoring,
          not additional operational burden. The goal is clearer project visibility, safer data ownership, better field coordination, and faster review.
        </div>
      </Section>

      <Section id="contact" title="15. Contact Section" icon={<Users size={18} />}>
        <div className="space-y-2 text-sm leading-relaxed text-[#4D5B52]">
          <p><span className="font-semibold text-[#12332D]">Rahul Narayan</span></p>
          <p>Founder - NIRMAN AI</p>
          <p>Apostolic Redeem Services Pvt Ltd (ARSPL)</p>
          <p>WhatsApp: +91 74880 82696</p>
          <p>App: https://nirman.apostolicredeem.com</p>
        </div>
        <div className="mt-4">
          <CopyButton label="Copy Contact" copiedLabel="Contact Copied" text={contactLine} />
        </div>
      </Section>
    </AppLayout>
  );
}
