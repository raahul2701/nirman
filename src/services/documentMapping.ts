import { supabase } from '../lib/supabase';
import { getDriveProjectFolderPath, type ExecutiveEngineerWorkspace } from './businessHierarchyService';

export const DRIVE_MODULE_FOLDERS = {
  agreement_boq: '01 Agreement & BOQ',
  drawings: '02 Drawings',
  daily_progress: '03 Daily Progress',
  labour: '04 Labour',
  materials: '05 Materials',
  equipment: '06 Equipment',
  survey_quantity: '07 Survey & Quantity',
  inspections: '08 Inspections',
  material_tests: '09 Material Tests',
  ra_bills: '10 RA Bills',
  payments: '11 Payments',
  material_advance: '12 Material Advance',
  bg_sd: '13 BG & SD',
  hindrance_extensions: '14 Hindrance & Extensions',
  dlp: '15 DLP',
  photos_site_evidence: '16 Photos & Site Evidence',
  reports: '17 Reports',
} as const;

export type DriveModuleName = keyof typeof DRIVE_MODULE_FOLDERS;
export type DriveSyncStatus = 'uploaded_to_supabase' | 'google_drive_sync_pending' | 'google_drive_synced' | 'google_drive_sync_failed';

type ProjectReference = {
  id: string;
  code?: string | null;
  name?: string | null;
};

export function sanitizeDriveSegment(value?: string | null) {
  return String(value || 'Unmapped')
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120) || 'Unmapped';
}

export function buildProjectDriveLabel(project?: ProjectReference | null) {
  const code = sanitizeDriveSegment(project?.code || 'NO-CODE');
  const name = sanitizeDriveSegment(project?.name || 'Project');
  return `${code} - ${name}`;
}

export function buildDriveFolderPath(
  workspace?: Pick<ExecutiveEngineerWorkspace, 'workspace_name'> | null,
  project?: ProjectReference | null,
  moduleName: DriveModuleName = 'agreement_boq',
) {
  const workspaceName = sanitizeDriveSegment(workspace?.workspace_name || 'Workspace');
  return [
    'NIRMAN AI',
    workspaceName,
    buildProjectDriveLabel(project),
    DRIVE_MODULE_FOLDERS[moduleName],
  ].join('/');
}

export function getLegacyDriveFolderPath(workspace?: Pick<ExecutiveEngineerWorkspace, 'workspace_name'> | null, project?: ProjectReference | null) {
  return getDriveProjectFolderPath(workspace?.workspace_name || 'Workspace', buildProjectDriveLabel(project));
}

type DocumentMetadataInput = {
  workspaceId: string;
  ownerExecutiveEngineerId: string;
  projectId: string;
  contractorId?: string | null;
  uploadedBy?: string | null;
  role?: string | null;
  documentType: string;
  moduleName: string;
  originalFilename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageProvider: 'supabase' | 'google_drive';
  supabasePath?: string | null;
  googleDriveFileId?: string | null;
  googleDriveFolderId?: string | null;
  fileUrl?: string | null;
  aiProcessingStatus?: string | null;
  driveSyncStatus?: DriveSyncStatus;
  driveFolderPath?: string | null;
};

export async function recordDocumentMetadata(input: DocumentMetadataInput) {
  const driveFileId = input.googleDriveFileId || (input.supabasePath ? `supabase://${input.supabasePath}` : `pending://${crypto.randomUUID()}`);
  const { error } = await supabase.from('document_metadata').insert({
    workspace_id: input.workspaceId,
    owner_executive_engineer_id: input.ownerExecutiveEngineerId,
    project_id: input.projectId,
    contractor_id: input.contractorId || null,
    uploaded_by: input.uploadedBy || null,
    role: input.role || null,
    document_type: input.documentType,
    module_name: input.moduleName,
    drive_file_id: driveFileId,
    drive_folder_id: input.googleDriveFolderId || null,
    file_name: input.originalFilename,
    original_filename: input.originalFilename,
    mime_type: input.mimeType || null,
    size_bytes: input.sizeBytes || null,
    storage_provider: input.storageProvider,
    supabase_path: input.supabasePath || null,
    google_drive_file_id: input.googleDriveFileId || null,
    google_drive_folder_id: input.googleDriveFolderId || null,
    file_url: input.fileUrl || null,
    ai_processing_status: input.aiProcessingStatus || null,
    google_drive_sync_status: input.driveSyncStatus || 'google_drive_sync_pending',
    drive_folder_path: input.driveFolderPath || null,
    metadata: {
      role: input.role || null,
      module_name: input.moduleName,
      original_filename: input.originalFilename,
      storage_provider: input.storageProvider,
      supabase_path: input.supabasePath || null,
      google_drive_file_id: input.googleDriveFileId || null,
      google_drive_folder_id: input.googleDriveFolderId || null,
      file_url: input.fileUrl || null,
      ai_processing_status: input.aiProcessingStatus || null,
      drive_sync_status: input.driveSyncStatus || 'google_drive_sync_pending',
      drive_folder_path: input.driveFolderPath || null,
    },
  });

  if (error) throw error;
}
