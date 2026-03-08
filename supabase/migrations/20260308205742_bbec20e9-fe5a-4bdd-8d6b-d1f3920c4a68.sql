
-- =============================================
-- P0: CRITICAL SECURITY FIXES
-- =============================================

-- 1. Fix processed_commands: Replace USING(true) ALL policy with authenticated-only + company scoped
DROP POLICY IF EXISTS "System can manage processed commands" ON public.processed_commands;

CREATE POLICY "Authenticated users manage their company processed commands"
ON public.processed_commands
FOR ALL
TO authenticated
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- 2. Fix session_states: Replace USING(true) ALL policy with authenticated-only + company scoped
DROP POLICY IF EXISTS "System can manage session states" ON public.session_states;

CREATE POLICY "Authenticated users manage their company session states"
ON public.session_states
FOR ALL
TO authenticated
USING (company_id = get_current_user_company_id())
WITH CHECK (company_id = get_current_user_company_id());

-- Keep the SELECT policy as it's already scoped
-- "Users can view their company session states" is fine

-- 3. Fix user_roles: Remove overly permissive ALL policies that allow privilege escalation
DROP POLICY IF EXISTS "Basic: Users manage their company roles" ON public.user_roles;
DROP POLICY IF EXISTS "Manage company roles" ON public.user_roles;

-- Keep "Simple user roles management" (admin/soporte only) - this is correct
-- Keep "Users can self-assign admin role when no roles exist" - this is correct for bootstrap
-- Keep all SELECT policies - they're fine

-- 4. Fix employee_identity_ledger: Restrict INSERT to authenticated users with company match
DROP POLICY IF EXISTS "Allow inserts into identity ledger" ON public.employee_identity_ledger;

CREATE POLICY "Authenticated users insert identity ledger for their company"
ON public.employee_identity_ledger
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_current_user_company_id());

-- 5. Fix security_audit_log: Restrict INSERT to authenticated users with company match
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_audit_log;

CREATE POLICY "Authenticated users insert security logs for their company"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_current_user_company_id());

-- 6. Fix conversation_events: Restrict INSERT to authenticated users with company match
DROP POLICY IF EXISTS "System can insert conversation events" ON public.conversation_events;

CREATE POLICY "Authenticated users insert conversation events for their company"
ON public.conversation_events
FOR INSERT
TO authenticated
WITH CHECK (company_id = get_current_user_company_id());

-- =============================================
-- P1: Fix search_path on SQL functions
-- =============================================

-- Fix functions that don't have search_path set
-- (Only fixing the ones used in RLS that we can identify)

-- Note: get_current_user_company_id, has_role_in_company, has_role, 
-- validate_employee_company_access, validate_support_company_access, 
-- user_owns_maya_conversation already have search_path set correctly.
