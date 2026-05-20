import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const buckets = (process.env.NIRMAN_BUCKETS || 'project-files,reports,field-uploads').split(',');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[bucket-bootstrap] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

for (const bucket of buckets.map((item) => item.trim()).filter(Boolean)) {
  const { data: existing } = await supabase.storage.getBucket(bucket);
  if (existing) {
    console.log(`[bucket-bootstrap] exists: ${bucket}`);
    continue;
  }

  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf', 'text/csv'],
  });

  if (error) {
    console.error(`[bucket-bootstrap] failed ${bucket}: ${error.message}`);
    process.exit(1);
  }
  console.log(`[bucket-bootstrap] created: ${bucket}`);
}

