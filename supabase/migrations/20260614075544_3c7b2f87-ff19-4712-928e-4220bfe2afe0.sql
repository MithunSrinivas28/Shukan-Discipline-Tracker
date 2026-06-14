CREATE OR REPLACE FUNCTION public.get_leaderboard_minutes()
RETURNS TABLE(user_id uuid, total_minutes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id AS user_id,
    COALESCE((
      SELECT SUM(s.duration_seconds) / 60
      FROM public.study_sessions s
      WHERE s.user_id = p.id
    ), 0)
    + COALESCE((
      SELECT COUNT(*) * 60
      FROM public.study_logs l
      WHERE l.user_id = p.id
    ), 0) AS total_minutes
  FROM public.profiles p;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_minutes() TO authenticated, anon;