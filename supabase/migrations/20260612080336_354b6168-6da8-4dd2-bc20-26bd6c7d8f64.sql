
CREATE OR REPLACE FUNCTION public.validate_study_session_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mode NOT IN ('timer', 'stopwatch', 'countdown') THEN
    RAISE EXCEPTION 'Invalid mode: must be timer, stopwatch, or countdown';
  END IF;
  RETURN NEW;
END;
$function$;
