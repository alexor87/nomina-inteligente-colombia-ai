
-- Drop the 6-parameter version of create_company_with_setup to resolve function ambiguity
DROP FUNCTION IF EXISTS public.create_company_with_setup(text, text, text, text, text, text);

-- Verify that only the 10-parameter version remains
-- This function should handle the complete company creation with user setup
