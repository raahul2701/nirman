-- Repair production error_logs drift against the canonical logging schema.
-- This migration is additive and does not rewrite existing error log rows.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS id UUID,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS context JSONB,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS stack TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.error_logs
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS error_logs_pkey ON public.error_logs(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.error_logs'::regclass
      AND conname = 'error_logs_pkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.error_logs WHERE id IS NULL
  ) THEN
    ALTER TABLE public.error_logs
      ADD CONSTRAINT error_logs_pkey PRIMARY KEY USING INDEX error_logs_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.error_logs'::regclass
      AND conname = 'error_logs_level_check'
  ) THEN
    ALTER TABLE public.error_logs
      ADD CONSTRAINT error_logs_level_check
      CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.error_logs
    WHERE level IS NOT NULL
      AND level NOT IN ('debug', 'info', 'warn', 'error', 'critical')
  ) THEN
    ALTER TABLE public.error_logs VALIDATE CONSTRAINT error_logs_level_check;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.error_logs WHERE level IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.error_logs'::regclass
        AND conname = 'error_logs_level_not_null'
    ) THEN
      ALTER TABLE public.error_logs
        ADD CONSTRAINT error_logs_level_not_null CHECK (level IS NOT NULL) NOT VALID;
    END IF;
  ELSE
    ALTER TABLE public.error_logs ALTER COLUMN level SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.error_logs WHERE message IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.error_logs'::regclass
        AND conname = 'error_logs_message_not_null'
    ) THEN
      ALTER TABLE public.error_logs
        ADD CONSTRAINT error_logs_message_not_null CHECK (message IS NOT NULL) NOT VALID;
    END IF;
  ELSE
    ALTER TABLE public.error_logs ALTER COLUMN message SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.error_logs'::regclass
      AND conname = 'error_logs_user_id_fkey'
  ) THEN
    ALTER TABLE public.error_logs
      ADD CONSTRAINT error_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.error_logs e
    WHERE e.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = e.user_id
      )
  ) THEN
    ALTER TABLE public.error_logs VALIDATE CONSTRAINT error_logs_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'error_logs'
      AND policyname = 'Admins can view error logs'
  ) THEN
    CREATE POLICY "Admins can view error logs" ON public.error_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;
