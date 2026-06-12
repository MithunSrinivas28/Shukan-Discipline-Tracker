
-- Restrict profile SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Restrict study_logs SELECT to authenticated users only
DROP POLICY IF EXISTS "Study logs are publicly readable" ON public.study_logs;
CREATE POLICY "Authenticated users can view study logs"
  ON public.study_logs FOR SELECT
  TO authenticated
  USING (true);

-- Clean orphaned rows before adding FK (defensive)
DELETE FROM public.study_logs
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Add FK on study_logs.user_id -> profiles(id)
ALTER TABLE public.study_logs
  ADD CONSTRAINT study_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
