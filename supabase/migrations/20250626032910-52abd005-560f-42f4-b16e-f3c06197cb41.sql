
-- Grant execution permissions on the RPC function to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.create_company_with_setup(text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_with_setup(text, text, text, text, text, text, text, text, text, text) TO anon;

-- Ensure the function is accessible via RPC calls
-- Also make sure all referenced tables have proper permissions for the function execution context

-- Grant necessary permissions on tables used by the function
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.company_subscriptions TO authenticated;

-- Also grant permissions to anon role for company creation (registration process)
GRANT SELECT, INSERT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon;
GRANT SELECT, INSERT ON public.user_roles TO anon;
GRANT SELECT, INSERT ON public.company_settings TO anon;
GRANT SELECT, INSERT ON public.company_subscriptions TO anon;
