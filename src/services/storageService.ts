import { supabase } from '../lib/supabase';
import { retryWithBackoff } from './offline/retryManager';
import { trackUploadDiagnostic } from './observability/diagnostics';
import { uploadFileToDrive, isGoogleDriveAvailable } from './storage/googleDriveStorage';
import { getOptionalDriveAccessToken } from './storage/driveAuth';

const bucketPaths = {
  attendance: 'attendance',
  gateEntry: 'gate-entry',
  diesel: 'diesel',
  bills: 'bills',
  tools: 'tools',
  nightWatch: 'night-watch',
  raBills: 'ra-bills',
  tenders: 'tenders',
  reports: 'reports',
  maintenance: 'maintenance',
  labour: 'labour',
  clientPortal: 'client-portal',
};

const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB || 25);
const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.csv', '.txt', '.doc', '.docx', '.xls', '.xlsx'];
const activeStorageProvider = (import.meta.env.VITE_STORAGE_PROVIDER as 'supabase' | 'googleDrive' | 'local' | undefined) || 'supabase';
type DriveUploadResult = {
  path: string;
  data: Awaited<ReturnType<typeof uploadFileToDrive>>;
};
type UploadMetadataUpsert = {
  user_id?: string;
  bucket: string;
  path: string;
  file_hash: string;
  size_bytes: number;
  mime_type: string;
  status: string;
  updated_at: string;
};

export function isGoogleDriveStorageActive() {
  return activeStorageProvider === 'googleDrive' && isGoogleDriveAvailable();
}

export function assertUploadAllowed(file: File) {
  const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Upload too large. Limit is ${MAX_UPLOAD_MB} MB.`);
  }
  const lowerName = file.name.toLowerCase();
  const allowedByExtension = ALLOWED_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (!ALLOWED_MIME_PREFIXES.some((mime) => file.type === mime || file.type.startsWith(mime)) && !allowedByExtension) {
    throw new Error(`Unsupported upload type: ${file.type || 'unknown'}`);
  }
}

export function buildStoragePath(bucket: keyof typeof bucketPaths, filename: string) {
  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/[-]{2,}/g, '-');
  return `${bucketPaths[bucket]}/${Date.now()}-${cleanName}`;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string | number; upsert?: boolean }
) {
  assertUploadAllowed(file);
  const fileHash = await calculateFileHash(file);
  const duplicate = await findDuplicateUpload(bucket, fileHash, file.size);
  if (duplicate?.path) {
    trackUploadDiagnostic('deduplicated', { bucket, path: duplicate.path, size: file.size });
    return { path: duplicate.path };
  }

  if (isGoogleDriveStorageActive()) {
    try {
      const accessToken = await getOptionalDriveAccessToken();
      if (!accessToken) {
        throw new Error('Google Drive writes require OAuth; falling back to Supabase storage');
      }
      const driveResult = await uploadFileToDrive(bucket, path, file, accessToken || undefined, (percent) => {
        trackUploadDiagnostic('drive-upload-progress', { bucket, path, percent });
      });
      trackUploadDiagnostic('drive-upload-completed', { bucket, path, fileId: driveResult.id, size: file.size });
      return { path: `drive://${driveResult.id}`, data: driveResult } as DriveUploadResult;
    } catch (driveError) {
      trackUploadDiagnostic('drive-upload-failed', {
        bucket,
        path,
        error: driveError instanceof Error ? driveError.message : 'unknown',
      });
      // Fall back to Supabase storage to preserve runtime stability.
    }
  }

  const payload = options ? { ...options, cacheControl: options.cacheControl?.toString() } : undefined;
  const result = await supabase.storage.from(bucket).upload(path, file, payload);
  if (result.error) {
    throw result.error;
  }
  await recordUploadMetadata(bucket, path, file, fileHash, 'uploaded');
  return result.data;
}

export async function calculateFileHash(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function findDuplicateUpload(bucket: string, fileHash: string, sizeBytes: number) {
  try {
    const { data } = await supabase
      .from('upload_metadata')
      .select('path')
      .eq('bucket', bucket)
      .eq('file_hash', fileHash)
      .eq('size_bytes', sizeBytes)
      .eq('status', 'uploaded')
      .maybeSingle();
    return data as { path: string } | null;
  } catch {
    return null;
  }
}

export async function recordUploadMetadata(bucket: string, path: string, file: File, fileHash: string, status: string) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    await supabase.from('upload_metadata').upsert({
      user_id: sessionData?.session?.user?.id,
      bucket,
      path,
      file_hash: fileHash,
      size_bytes: file.size,
      mime_type: file.type,
      status,
      updated_at: new Date().toISOString(),
    } as UploadMetadataUpsert, { onConflict: 'bucket,path' });
  } catch (error) {
    trackUploadDiagnostic('metadata-write-failed', { bucket, path, message: error instanceof Error ? error.message : 'unknown' });
  }
}

export async function createSignedUploadUrl(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;
  return data;
}

export async function verifySignedUploadUrl(bucket: string, path: string) {
  const data = await createSignedUploadUrl(bucket, path);
  const ok = Boolean(data?.signedUrl && data?.path);
  trackUploadDiagnostic('signed-url-verify', { bucket, path, ok });
  return ok;
}

export async function createImageThumbnail(file: File, maxDimension = 320): Promise<Blob | null> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') return null;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72));
}

export function prepareVideoCompression(file: File) {
  return {
    file,
    shouldCompress: file.type.startsWith('video/') && file.size > 15 * 1024 * 1024,
    target: { maxHeight: 720, videoBitrate: '1800k', audioBitrate: '96k' },
  };
}

export async function cleanupOrphanUploadMetadata(olderThanHours = 24) {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('upload_metadata')
    .update({ status: 'orphaned' })
    .lt('updated_at', cutoff)
    .in('status', ['pending', 'uploading'])
    .select('id');
  if (error) throw error;
  trackUploadDiagnostic('orphan-cleanup', { count: data?.length || 0 });
  return data?.length || 0;
}

export async function uploadFileWithRetry(
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: number; upsert?: boolean },
  retries = 3
) {
  return retryWithBackoff(() => uploadFile(bucket, path, file, options), retries, 800);
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(file);
      } else {
        resolve(new File([blob], file.name, { type: blob.type }));
      }
    }, 'image/jpeg', 0.8);
  });
}

export function getPublicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path);
}

export async function createSignedUrl(bucket: string, path: string, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
}

export async function listFiles(bucket: string, options?: { limit?: number; offset?: number; sortBy?: { column: string; order?: 'asc' | 'desc' } }) {
  const { data, error } = await supabase.storage.from(bucket).list('', options);
  if (error) throw error;
  return data;
}
