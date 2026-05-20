-- 003_create_upload_metadata.sql
CREATE TABLE IF NOT EXISTS upload_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  content_type text,
  size bigint,
  storage_path text NOT NULL,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_upload_metadata_uploaded_by ON upload_metadata (uploaded_by);
