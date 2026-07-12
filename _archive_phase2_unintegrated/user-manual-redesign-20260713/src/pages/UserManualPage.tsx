import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/useToast';
import {
  ManualSection,
  RoleCard,
  Checklist,
  RouteInfo,
  UploadInfo,
  ProblemFix,
  FAQ,
  PilotDay,
} from '@/components/manual';
import * as ManualConstants from '@/lib/constants/userManual';
import type { Role } from '@/types/userManual';
import { featureFlags } from '@/lib/featureFlags';
import { ClipboardCopy } from 'lucide-react';

const TopRoleCard = React.memo(({ role }: { role: Role }) => (
  <Card className="p-4">
    <p className="text-xs font-semibold text-muted-foreground">{role.role}</p>
    <p className="mt-2 text-sm leading-relaxed text-foreground">{role.daily}</p>
  </Card>
));

const renderSectionIcon = (icon: React.ElementType, size = 18) =>
  React.createElement(icon, { size, 'aria-hidden': 'true' });

export function UserManualPage() {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const pilotInstructions = useMemo(
    () =>
      [
        `Open ${ManualConstants.USER_MANUAL_ROUTES.startPilot}.`,
        'Select the EE workspace.',
        'Select the pilot project.',
        'Select AE, JE, and Contractor.',
        'Save assignment.',
        `Verify in ${ManualConstants.USER_MANUAL_ROUTES.accessControl}.`,
        `Continue to ${ManualConstants.USER_MANUAL_ROUTES.dashboard} and start field uploads.`,
      ].join('\n'),
    []
  );

  const handleCopy = useCallback(async () => {
    const fallbackCopy = () => {
      const textArea = document.createElement('textarea');
      textArea.value = pilotInstructions;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      return copied;
    };

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(pilotInstructions);
        setCopied(true);
        toast('Pilot instructions copied to clipboard.', 'success');
        return;
      } catch {
        // fall through to fallback
      }
    }

    if (fallbackCopy()) {
      setCopied(true);
      toast('Pilot instructions copied to clipboard.', 'success');
      return;
    }

    toast('Clipboard access was unavailable and fallback copy failed.', 'error');
  }, [pilotInstructions, toast]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer); // Cleanup timer
  }, [copied]);
  return (
    <AppLayout
      title="NIRMAN AI User Manual"
      subtitle="Feature usage guide for EE, AE, JE, Contractor, and Admin users"
    >
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ManualConstants.roles.slice(0, 4).map((role) => (
          <TopRoleCard key={role.role} role={role} />
        ))}
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              Table of contents
            </p>
            <h1 className="mt-1 text-2xl font-black text-foreground">
              NIRMAN AI User Manual
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Use this guide to understand every major feature, who should use it,
              what data is required, and what to check during a government project
              pilot.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<ClipboardCopy size={14} aria-hidden="true" />}
            onClick={handleCopy}
            aria-label="Copy pilot instructions to clipboard"
          >
            {copied ? 'Copied!' : 'Copy Pilot Instructions'}
          </Button>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Table of Contents">
          {ManualConstants.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <section.icon size={16} aria-hidden="true" />
              {section.title}
            </a>
          ))}
        </nav>
      </Card>

      {/* Section 1: Overview */}
      <ManualSection
        id={ManualConstants.sections[0].id}
        title={`1. ${ManualConstants.sections[0].title}`}
        icon={renderSectionIcon(ManualConstants.sections[0].icon)}
      >
        <Checklist items={ManualConstants.overview} />
      </ManualSection>

      {/* Section 2: Roles */}
      <ManualSection
        id={ManualConstants.sections[1].id}
        title={`2. ${ManualConstants.sections[1].title}`}
        icon={renderSectionIcon(ManualConstants.sections[1].icon)}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ManualConstants.roles.map((role) => (
            <RoleCard key={role.role} role={role} />
          ))}
        </div>
      </ManualSection>

      {/* Section 3: Login Guide */}
      <ManualSection
        id={ManualConstants.sections[2].id}
        title={`3. ${ManualConstants.sections[2].title}`}
        icon={renderSectionIcon(ManualConstants.sections[2].icon)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Checklist items={ManualConstants.loginGuide} />
          <aside
            className="rounded-lg border border-border bg-card-muted p-4 text-sm leading-relaxed text-muted-foreground"
            role="note"
          >
            Shared logins are not ideal. Separate accounts help the app track who
            uploaded evidence, who reviewed it, and who visited each pilot page.
          </aside>
        </div>
      </ManualSection>

      {/* Section 4: Start Pilot */}
      <ManualSection
        id={ManualConstants.sections[3].id}
        title={`4. ${ManualConstants.sections[3].title}`}
        icon={renderSectionIcon(ManualConstants.sections[3].icon)}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ManualConstants.USER_MANUAL_ROUTES.startPilot,
            ManualConstants.USER_MANUAL_ROUTES.accessControl,
            ManualConstants.USER_MANUAL_ROUTES.dashboard,
          ].map((route) => (
            <Badge key={route} color="green" variant="ghost" className="font-mono">
              {route}
            </Badge>
          ))}
        </div>
        <Checklist items={ManualConstants.startPilotWorkflow} />
        <aside className="mt-4 rounded-lg border border-border bg-card-muted p-4">
          <h3 className="font-semibold text-gray-800">Demo pilot mode</h3>
          <Checklist
            items={[
              `Create Demo Pilot Data is available when pilot mode is enabled (${
                featureFlags.pilotMode ? 'currently enabled' : 'currently not enabled by flag'
              }).`,
              'Use Verify Access Control after demo creation to confirm the demo assignment appears.',
              'Use Pause Demo Assignment when you want to stop using the demo assignment without treating it as live project work.',
              'Demo data is for testing only; real pilots should use real EE, AE, JE, Contractor, and project records.',
            ]}
          />
        </aside>
      </ManualSection>

      {/* Section 5: Enterprise Module */}
      <ManualSection
        id={ManualConstants.sections[4].id}
        title={`5. ${ManualConstants.sections[4].title}`}
        icon={renderSectionIcon(ManualConstants.sections[4].icon)}
      >
        <div className="space-y-4">
          {ManualConstants.enterpriseRoutes.map((routeInfo) => (
            <RouteInfo key={routeInfo.route} {...routeInfo} />
          ))}
        </div>
      </ManualSection>

      {/* Section 6: Project Management */}
      <ManualSection
        id={ManualConstants.sections[5].id}
        title={`6. ${ManualConstants.sections[5].title}`}
        icon={renderSectionIcon(ManualConstants.sections[5].icon)}
      >
        <div className="mb-3">
          <Badge color="green" variant="ghost" className="font-mono">
            {ManualConstants.USER_MANUAL_ROUTES.projects}
          </Badge>
        </div>
        <Checklist items={ManualConstants.projectManagement} />
      </ManualSection>

      {/* Section 7: Uploads */}
      <ManualSection
        id={ManualConstants.sections[6].id}
        title={`7. ${ManualConstants.sections[6].title}`}
        icon={renderSectionIcon(ManualConstants.sections[6].icon)}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ManualConstants.uploads.map((uploadInfo) => (
            <UploadInfo key={uploadInfo.name} {...uploadInfo} />
          ))}
        </div>
      </ManualSection>

      {/* Section 8: AI Features */}
      <ManualSection
        id={ManualConstants.sections[7].id}
        title={`8. ${ManualConstants.sections[7].title}`}
        icon={renderSectionIcon(ManualConstants.sections[7].icon)}
      >
        <Checklist items={ManualConstants.aiFeatures} />
        <aside className="mt-4 rounded-lg border border-border bg-card-muted p-4 text-sm leading-relaxed text-muted-foreground" role="note">
          AI depends on server-side Supabase Edge Function and Gemini/provider configuration. No AI secret should be exposed client-side in Vite environment variables or browser code.
        </aside>
      </ManualSection>

      {/* ... other sections ... */}

      {/* Section 14: Pilot Plan */}
      <ManualSection
        id={ManualConstants.sections[13].id}
        title={`14. ${ManualConstants.sections[13].title}`}
        icon={renderSectionIcon(ManualConstants.sections[13].icon)}
      >
        <div className="space-y-3">
          {ManualConstants.pilotPlan.map((day) => (
            <PilotDay key={day.day} {...day} />
          ))}
        </div>
      </ManualSection>

      {/* Section 15: Problems & Fixes */}
      <ManualSection
        id={ManualConstants.sections[14].id}
        title={`15. ${ManualConstants.sections[14].title}`}
        icon={renderSectionIcon(ManualConstants.sections[14].icon)}
      >
        <div className="space-y-3">
          {ManualConstants.problems.map((item) => (
            <ProblemFix key={item.problem} {...item} />
          ))}
        </div>
      </ManualSection>

      {/* Section 16: Checklists */}
      <ManualSection
        id={ManualConstants.sections[15].id}
        title={`16. ${ManualConstants.sections[15].title}`}
        icon={renderSectionIcon(ManualConstants.sections[15].icon)}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ManualConstants.checklists.map((list) => (
            <Card key={list.title} className="p-4">
              <h3 className="mb-3 font-semibold text-foreground">{list.title}</h3>
              <Checklist items={list.items} />
            </Card>
          ))}
        </div>
      </ManualSection>

      {/* Section 17: FAQ */}
      <ManualSection
        id={ManualConstants.sections[16].id}
        title={`17. ${ManualConstants.sections[16].title}`}
        icon={renderSectionIcon(ManualConstants.sections[16].icon)}
      >
        <div className="space-y-3">
          {ManualConstants.faq.map((item) => (
            <FAQ key={item.q} {...item} />
          ))}
        </div>
      </ManualSection>

    </AppLayout>
  );
}
