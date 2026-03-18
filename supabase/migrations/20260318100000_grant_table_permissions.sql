-- Fix: Grant missing table-level permissions to authenticated/anon roles
-- Error 42501 "permission denied for table companies" confirms these GRANTs are missing.
-- Tables created via migrations don't get auto-grants like Dashboard-created tables.

GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;

GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_subscriptions TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.employees TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.payrolls TO authenticated;
