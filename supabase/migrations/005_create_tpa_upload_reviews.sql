-- 005_create_tpa_upload_reviews.sql
CREATE TABLE IF NOT EXISTS tpa_upload_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES upload_metadata(id) ON DELETE SET NULL,
  review jsonb,
  reviewer_id uuid,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpa_reviews_reviewer ON tpa_upload_reviews (reviewer_id);
