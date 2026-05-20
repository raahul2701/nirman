import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NIRMAN_VERIFY_BUCKET || 'field-uploads';
const objectPath = `deployment-verification/${Date.now()}.txt`;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('[storage-verify] SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const anonymousUpload = await anon.storage.from(bucket).upload(objectPath, new Blob(['anonymous']), { upsert: false });
if (!anonymousUpload.error) {
  console.error('[storage-verify] anonymous upload was allowed; storage policy is too permissive');
  await admin.storage.from(bucket).remove([objectPath]);
  process.exit(1);
}
console.log('[storage-verify] anonymous upload rejected');

const signed = await admin.storage.from(bucket).createSignedUploadUrl(objectPath);
if (signed.error || !signed.data?.signedUrl) {
  console.error(`[storage-verify] signed upload URL failed: ${signed.error?.message || 'missing URL'}`);
  process.exit(1);
}
console.log('[storage-verify] signed upload URL created');

const upload = await admin.storage.from(bucket).uploadToSignedUrl(objectPath, signed.data.token, new Blob(['signed upload ok'], { type: 'text/plain' }));
if (upload.error) {
  console.error(`[storage-verify] signed upload failed: ${upload.error.message}`);
  process.exit(1);
}
console.log('[storage-verify] signed upload succeeded');

await admin.storage.from(bucket).remove([objectPath]);
console.log('[storage-verify] cleanup complete');

