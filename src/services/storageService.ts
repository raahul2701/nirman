import { supabase } from '../lib/supabase';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: number; upsert?: boolean }
) {
  const result = await supabase.storage.from(bucket).upload(path, file, options);
  if (result.error) {
    throw result.error;
  }
  return result.data;
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
