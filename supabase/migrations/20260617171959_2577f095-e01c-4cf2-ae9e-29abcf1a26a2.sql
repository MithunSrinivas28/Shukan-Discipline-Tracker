ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS interview_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS resume_data jsonb NOT NULL DEFAULT '{}'::jsonb;