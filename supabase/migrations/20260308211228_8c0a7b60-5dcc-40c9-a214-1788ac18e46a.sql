-- Fix search_path on custom functions to prevent schema confusion attacks

ALTER FUNCTION public.calculate_period_intersection_days(date, date, date, date) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_commands() SET search_path = public;
ALTER FUNCTION public.cleanup_snapshots_on_session_complete() SET search_path = public;
ALTER FUNCTION public.complete_incomplete_registration(text, text, text) SET search_path = public;
ALTER FUNCTION public.fix_malformed_fragmented_absences() SET search_path = public;
ALTER FUNCTION public.get_period_adjustments(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.sync_novedad_to_vacation() SET search_path = public;
ALTER FUNCTION public.update_legal_kb_updated_at() SET search_path = public;
ALTER FUNCTION public.update_pending_adjustments_updated_at() SET search_path = public;
ALTER FUNCTION public.update_session_states_timestamp() SET search_path = public;
ALTER FUNCTION public.update_updated_at_timestamp() SET search_path = public;