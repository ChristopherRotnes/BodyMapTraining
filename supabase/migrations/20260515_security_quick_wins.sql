-- Revoke direct RPC access to handle_new_user().
-- This is an auth trigger that should only fire internally on user creation,
-- never be callable via /rest/v1/rpc/ by anon or authenticated roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Fix mutable search_path on all three stored functions.
-- Without SET search_path, a privileged attacker could shadow public schema
-- tables and redirect writes to malicious objects.
ALTER FUNCTION public.replace_template_exercises(p_template_id uuid, p_exercises jsonb)
  SET search_path = public;

ALTER FUNCTION public.save_session(p_gym_calendar_id uuid, p_session_date date, p_image_url text, p_notes text, p_training_group_id uuid, p_exercises jsonb, p_replace boolean)
  SET search_path = public;

ALTER FUNCTION public.update_session(p_session_id uuid, p_gym_calendar_id uuid, p_exercises jsonb, p_replace boolean)
  SET search_path = public;
