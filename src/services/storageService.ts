import { supabase } from '../lib/supabase';
import { retryWithBackoff } from './offline/retryManager';

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
  const payload = options ? { ...options, cacheControl: options.cacheControl?.toString() } : undefined;
  const result = await supabase.storage.from(bucket).upload(path, file, payload);
  if (result.error) {
    throw result.error;
  }
  return result.data;
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
