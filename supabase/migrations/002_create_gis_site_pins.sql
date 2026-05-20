-- 002_create_gis_site_pins.sql
CREATE TABLE IF NOT EXISTS gis_site_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  properties jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gis_site_pins_project ON gis_site_pins (project_id);
CREATE INDEX IF NOT EXISTS idx_gis_site_pins_geog ON gis_site_pins USING gist (ll_to_earth(latitude, longitude));
