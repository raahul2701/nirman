import { useEffect, useState } from 'react';
import { Building2, LockKeyhole } from 'lucide-react';
import { featureFlags } from '../../lib/featureFlags';
import { getMyWorkspaceSummary, normalizeWorkspaceSummary, WorkspaceSummary } from '../../services/businessHierarchyService';
import { getPilotWorkspaceSummary } from '../../services/pilotSeedData';

export function WorkspaceBadge() {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(featureFlags.pilotMode ? getPilotWorkspaceSummary() : null);
  const [source, setSource] = useState<'live' | 'pilot' | 'pending'>(featureFlags.pilotMode ? 'pilot' : 'pending');

  useEffect(() => {
    if (!featureFlags.eeWorkspaceIsolation) return;

    let cancelled = false;
    getMyWorkspaceSummary()
      .then((data) => {
        if (cancelled) return;
        if (data.workspace) {
          setSummary(normalizeWorkspaceSummary(data));
          setSource('live');
        } else if (featureFlags.pilotMode) {
          setSummary(getPilotWorkspaceSummary());
          setSource('pilot');
        } else {
          setSummary(normalizeWorkspaceSummary(data));
          setSource('pending');
        }
      })
      .catch(() => {
        if (!cancelled && featureFlags.pilotMode) {
          setSummary(getPilotWorkspaceSummary());
          setSource('pilot');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!featureFlags.eeWorkspaceIsolation) return null;

  const workspaceName = summary?.workspace?.workspace_name || 'Workspace pending';
  const division = summary?.workspace?.division_code || 'No division';

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1F1F2E] bg-[#111111] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-[#00D4AA]/10 text-[#00D4AA]">
          <Building2 size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{workspaceName}</p>
          <p className="text-[#808080] text-xs truncate">{division}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-[#00D4AA]/20 bg-[#00D4AA]/10 px-3 py-1 text-[11px] font-semibold text-[#00D4AA]">
        <LockKeyhole size={12} />
        {source === 'live' ? 'Workspace Locked' : source === 'pilot' ? 'Pilot Workspace Locked' : 'Workspace Pending'}
      </div>
    </div>
  );
}
