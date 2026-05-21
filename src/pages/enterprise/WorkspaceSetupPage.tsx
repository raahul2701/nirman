import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, FolderTree, KeyRound, Map } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EMPTY_WORKSPACE_SUMMARY, getDriveProjectFolderPath, getMyWorkspaceSummary, normalizeWorkspaceSummary, upsertWorkspaceGoogleConnection, WorkspaceSummary } from '../../services/businessHierarchyService';

export function WorkspaceSetupPage() {
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [googleProjectId, setGoogleProjectId] = useState('');
  const [driveRootFolderId, setDriveRootFolderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await getMyWorkspaceSummary();
    const safeData = normalizeWorkspaceSummary(data);
    setSummary(safeData);
    setGoogleProjectId(safeData.googleConnection?.google_project_id || '');
    setDriveRootFolderId(safeData.googleConnection?.drive_root_folder_id || safeData.workspace?.drive_root_folder_id || '');
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workspace setup'));
  }, []);

  async function saveConnection() {
    if (!summary?.workspace) return;
    setSaving(true);
    setError(null);
    try {
      await upsertWorkspaceGoogleConnection(summary.workspace.id, {
        google_project_id: googleProjectId || null,
        drive_root_folder_id: driveRootFolderId || null,
        maps_api_status: googleProjectId ? 'manual_configured' : 'not_configured',
        gemini_api_status: googleProjectId ? 'manual_configured' : 'not_configured',
        drive_api_status: driveRootFolderId ? 'manual_configured' : 'not_configured',
        setup_status: googleProjectId || driveRootFolderId ? 'connected' : 'manual_pending',
      });
      await load();
      setMessage('Workspace Google configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  const samplePath = getDriveProjectFolderPath(summary?.workspace?.workspace_name || 'EE_ID', 'Sample_Project');
  const safeSummary = normalizeWorkspaceSummary(summary || EMPTY_WORKSPACE_SUMMARY);

  return (
    <AppLayout title="Workspace Setup" subtitle="Per-EE Google ownership and project namespace">
      {error && (
        <Card className="mb-6 border-red-500/20">
          <div className="flex items-center gap-3 text-red-300">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </Card>
      )}
      {message && (
        <Card className="mb-6 border-green-500/20">
          <div className="flex items-center gap-3 text-green-300">
            <CheckCircle2 size={18} />
            <span className="text-sm">{message}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Cloud size={24} className="text-[#00D4AA]" />
            <div>
              <h2 className="text-white font-semibold">Google API Ownership</h2>
              <p className="text-[#606060] text-xs">Pilot supports manual Drive folder and Gemini/Maps project references per EE workspace.</p>
            </div>
          </div>
          {!safeSummary.workspace && (
            <p className="mb-4 rounded-lg border border-[#CDBD82] bg-[#C89B3C]/10 px-3 py-2 text-sm text-[#6B5A1E]">
              No workspace is assigned yet. Setup fields can be reviewed, but saving is disabled until an EE workspace exists.
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#808080] mb-2" htmlFor="googleProject">Google project ID</label>
              <input
                id="googleProject"
                value={googleProjectId}
                onChange={(event) => setGoogleProjectId(event.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]"
                placeholder="manual-google-project-id"
              />
            </div>
            <div>
              <label className="block text-xs text-[#808080] mb-2" htmlFor="driveRoot">Drive root folder ID</label>
              <input
                id="driveRoot"
                value={driveRootFolderId}
                onChange={(event) => setDriveRootFolderId(event.target.value)}
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-white outline-none focus:border-[#FF6B00]"
                placeholder="Google Drive folder ID"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button variant="primary" loading={saving} disabled={!safeSummary.workspace} onClick={saveConnection}>Save Setup</Button>
            <Badge color="#F59E0B">OAuth for writes remains disabled until provider is configured</Badge>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-5">
            <KeyRound size={22} className="text-[#FF6B00]" />
            <div>
              <h2 className="text-white font-semibold">Connection Status</h2>
              <p className="text-[#606060] text-xs">Metadata only in Supabase</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Drive</span><StatusBadge status={summary?.googleConnection?.drive_api_status || 'not_configured'} /></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Gemini</span><StatusBadge status={summary?.googleConnection?.gemini_api_status || 'not_configured'} /></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Maps</span><StatusBadge status={summary?.googleConnection?.maps_api_status || 'not_configured'} /></div>
            <div className="flex justify-between text-sm"><span className="text-[#808080]">Setup</span><StatusBadge status={summary?.googleConnection?.setup_status || 'manual_pending'} /></div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center gap-3 mb-5">
          <FolderTree size={22} className="text-[#00D4AA]" />
          <div>
            <h2 className="text-white font-semibold">Drive Folder Standard</h2>
            <p className="text-[#606060] text-xs">Government documents stay in the EE-owned Drive namespace.</p>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-[#111111] border border-[#2A2A2A] p-4 text-[#D0D0D0] text-xs">{`${samplePath}/
  DPR/
  QC/
  TPA/
  MB/
  Bills/
  Drawings/
  Diesel/
  Hindrance/
  GIS/
  Photos/
  Videos/`}</pre>
        <div className="mt-4 flex items-center gap-2 text-[#808080] text-sm">
          <Map size={16} />
          <span>Project files, GIS snapshots, and AI reports reference Drive IDs through `document_metadata`.</span>
        </div>
      </Card>
    </AppLayout>
  );
}
