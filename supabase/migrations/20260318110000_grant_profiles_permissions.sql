-- Fix: Grant missing INSERT/UPDATE permissions on profiles to authenticated role
-- The SELECT grant exists (GET returns 406 not 403) but INSERT/UPDATE are missing,
-- causing UPSERT on profiles to fail with 42501 "permission denied for table profiles".

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.profiles TO anon;
