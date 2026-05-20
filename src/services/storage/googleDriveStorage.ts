import { uploadMetadataRepository } from '../persistence/uploadMetadataRepository';
import { getDriveAuthState } from './driveAuth';

const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY as string | undefined;
const driveApiBase = 'https://www.googleapis.com/drive/v3';
const MAX_UPLOAD_SIZE = Number(import.meta.env.VITE_DRIVE_MAX_UPLOAD_BYTES || 100 * 1024 * 1024); // 100MB
const allowedMimeTypes = (import.meta.env.VITE_DRIVE_ALLOWED_MIMES as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean) || [];

export interface GoogleDriveFileReference {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  md5Checksum?: string;
}

function getAuthHeaders(accessToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=UTF-8',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function buildDriveUrl(path: string, params: Record<string, string | undefined> = {}, upload = false) {
  const query = new URLSearchParams();
  if (apiKey) query.set('key', apiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, value);
  });
  const base = upload ? 'https://www.googleapis.com/upload/drive/v3' : driveApiBase;
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return `${base}${path}${suffix}`;
}

export function isGoogleDriveAvailable() {
  return Boolean(apiKey || getDriveAuthState().enabled);
}

export async function createDriveFolder(name: string, parentId?: string, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Google Drive OAuth access token is required to create folders');
  }

  const url = buildDriveUrl('/files');
  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) body.parents = [parentId];

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Drive folder creation failed: ${data.error?.message || response.statusText}`);
  }

  return data as GoogleDriveFileReference;
}

export async function findDriveFileByNameOrMd5(name: string, md5?: string, parentId?: string, accessToken?: string) {
  if (!apiKey && !accessToken) return null;
  const escapedName = name.replace(/'/g, "\\'");
  const duplicateMatch = md5 ? `(name='${escapedName}' or md5Checksum='${md5}')` : `name='${escapedName}'`;
  const queryParts = [duplicateMatch, 'trashed=false'];
  if (parentId) queryParts.push(`'${parentId}' in parents`);
  const url = buildDriveUrl('/files', {
    q: queryParts.join(' and '),
    fields: 'files(id,name,mimeType,size,md5Checksum,parents)',
  });
  const response = await fetch(url, { headers: getAuthHeaders(accessToken) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google Drive file lookup failed: ${data.error?.message || response.statusText}`);
  return Array.isArray(data.files) && data.files.length ? (data.files[0] as GoogleDriveFileReference) : null;
}

export async function findDriveFolder(name: string, parentId?: string, accessToken?: string) {
  if (!apiKey && !accessToken) return null;
  const queryParts = [`mimeType='application/vnd.google-apps.folder'`, `name='${name.replace(/'/g, "\\'")}'`, 'trashed=false'];
  if (parentId) queryParts.push(`'${parentId}' in parents`);
  const url = buildDriveUrl('/files', {
    q: queryParts.join(' and '),
    fields: 'files(id,name,parents)',
  });

  const response = await fetch(url, { headers: getAuthHeaders(accessToken) });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google Drive folder lookup failed: ${data.error?.message || response.statusText}`);
  }

  return Array.isArray(data.files) ? (data.files[0] as GoogleDriveFileReference) : null;
}

export async function getOrCreateDriveFolder(name: string, parentId?: string, accessToken?: string) {
  const existing = await findDriveFolder(name, parentId, accessToken);
  if (existing) return existing;
  return createDriveFolder(name, parentId, accessToken);
}

export async function createResumableDriveUploadSession(
  parentId: string,
  file: File,
  accessToken?: string,
) {
  if (!accessToken) {
    throw new Error('Google Drive OAuth access token is required for resumable uploads');
  }

  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    parents: [parentId],
  };

  const url = buildDriveUrl('/files', { uploadType: 'resumable' }, true);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(accessToken),
      'X-Upload-Content-Type': file.type || 'application/octet-stream',
      'X-Upload-Content-Length': String(file.size),
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Drive resumable session failed: ${body.error?.message || response.statusText}`);
  }

  const uploadUrl = response.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Drive resumable upload session did not return a location');
  }

  return uploadUrl;
}

export async function uploadDriveFileChunk(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  // Wrap XHR upload in retry/backoff for transient network errors
  const tryUpload = () => new Promise<GoogleDriveFileReference>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl, true);
    request.responseType = 'json';
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    if (signal) {
      signal.addEventListener('abort', () => {
        request.abort();
        reject(new DOMException('Upload cancelled', 'AbortError'));
      });
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response as GoogleDriveFileReference);
      } else {
        reject(new Error(`Drive upload failed with status ${request.status}`));
      }
    };

    request.onerror = () => reject(new Error('Drive upload network failure'));
    request.send(file);
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await tryUpload();
    } catch (err) {
      lastError = err;
      if (signal?.aborted) throw err;
      const delay = Math.min(500 * 2 ** attempt, 4000);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Drive upload failed after retries');
}

export async function uploadFileToDrive(
  bucket: string,
  path: string,
  file: File,
  accessToken?: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
  projectId?: string,
  prepareThumbnail?: (file: File) => Promise<Blob | null>,
) {
  if (!accessToken) {
    throw new Error('Google Drive writes require OAuth access tokens');
  }

  if (file.size > MAX_UPLOAD_SIZE) throw new Error(`File exceeds max upload size of ${MAX_UPLOAD_SIZE} bytes`);
  if (allowedMimeTypes.length && file.type && !allowedMimeTypes.includes(file.type)) throw new Error('File MIME type not allowed');

  const categoryName = (bucket || 'Documents').toString();
  // Build nested project folder path: NIRMAN -> Projects -> {projectId} -> {category}
  const rootFolder = await getOrCreateDriveFolder('NIRMAN', undefined, accessToken);
  let parentId = rootFolder.id;

  const projectsFolder = await getOrCreateDriveFolder('Projects', parentId, accessToken);
  parentId = projectsFolder.id;

  if (projectId) {
    const projectFolder = await getOrCreateDriveFolder(String(projectId), parentId, accessToken);
    parentId = projectFolder.id;
  }

  // sanitize category (avoid slashes or unsafe chars)
  const safeCategory = categoryName.replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  const categoryFolder = await getOrCreateDriveFolder(safeCategory, parentId, accessToken);

  // Pre-upload: compute hash and detect duplicates
  let fileHash: string | undefined;
  try {
    fileHash = await calculateFileHash(file);
  } catch {
    // best-effort
  }

  try {
    const dup = await findDriveFileByNameOrMd5(file.name, fileHash, categoryFolder.id, accessToken);
    if (dup) return dup; // Return existing file reference instead of re-uploading
  } catch (err) {
    // ignore lookup failures
  }

  // Optional thumbnail generation (best-effort)
  try {
    if (prepareThumbnail) {
      const thumb = await prepareThumbnail(file);
      if (thumb) {
        // Store thumbnail metadata entry but do not block main upload
        void (async () => {
          try { /* placeholder for thumbnail upload hook */ } catch { /* ignore */ }
        })();
      }
    }
  } catch {}

  const uploadSessionUrl = await createResumableDriveUploadSession(categoryFolder.id, file, accessToken);
  const uploaded = await uploadDriveFileChunk(uploadSessionUrl, file, onProgress, signal);

  try {
    await uploadMetadataRepository.create({
      file_name: file.name,
      content_type: file.type,
      size: file.size,
      storage_path: `drive://${uploaded.id}`,
      uploaded_by: undefined,
      uploaded_at: new Date().toISOString(),
      metadata: { bucket, path, driveId: uploaded.id, parents: uploaded.parents, sha256: fileHash },
    } as any);
  } catch {
    // metadata persistence is best effort; do not fail the upload for analytics storage.
  }

  return uploaded;
}

export async function generateSignedMetadata(payload: Record<string, unknown>) {
  return { payload, signature: null, serverSideRequired: true };
}

export async function calculateFileHash(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getDriveFileMetadata(fileId: string, accessToken?: string) {
  if (!apiKey && !accessToken) {
    throw new Error('Google Drive API key or auth token is required to read metadata');
  }

  const url = buildDriveUrl(`/files/${encodeURIComponent(fileId)}`, {
    fields: 'id,name,mimeType,size,webViewLink,webContentLink,parents,md5Checksum',
  });
  const response = await fetch(url, { headers: getAuthHeaders(accessToken) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Drive metadata lookup failed: ${data.error?.message || response.statusText}`);
  return data as GoogleDriveFileReference;
}

export async function getDriveFileUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}
