-- Fix Admin RLS Permissions
-- Purpose: Re-define is_admin() and update related table policies to fix "permission denied" errors.

-- 1. Create or Replace is_admin() function
-- Using SECURITY DEFINER to bypass RLS on the profiles table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO is_admin_user
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(is_admin_user, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 3. update email_logs policies
DROP POLICY IF EXISTS "Admin only log management" ON public.email_logs;
CREATE POLICY "Admin only log management" ON public.email_logs
FOR ALL TO authenticated
USING (public.is_admin());

-- 4. update api_usage_logs policies (replace inefficient subqueries)
DROP POLICY IF EXISTS "Admins can view API logs" ON public.api_usage_logs;
CREATE POLICY "Admin only view api logs" ON public.api_usage_logs
FOR SELECT TO authenticated
USING (public.is_admin());

-- 5. update api_limits_config policies
DROP POLICY IF EXISTS "Admins can manage API limits" ON public.api_limits_config;
CREATE POLICY "Admin only manage api limits" ON public.api_limits_config
FOR ALL TO authenticated
USING (public.is_admin());

-- 6. update platform_settings policies (to be consistent)
DROP POLICY IF EXISTS "Admin only read access" ON public.platform_settings;
CREATE POLICY "Admin only manage platform settings" ON public.platform_settings
FOR ALL TO authenticated
USING (public.is_admin());
