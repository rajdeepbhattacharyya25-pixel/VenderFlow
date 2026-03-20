-- Migration: 20260319000001_grant_select_email_logs.sql
-- Description: Grants missing SELECT privileges to authenticated and anon roles for email_logs table and ensures is_admin() is robust.

-- 1. Ensure SELECT privileges are granted (Required for any SELECT operation even with RLS)
GRANT SELECT ON public.email_logs TO authenticated;
GRANT SELECT ON public.email_logs TO anon;
GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT SELECT ON public.api_usage_logs TO anon;
GRANT SELECT ON public.api_limits_config TO authenticated;
GRANT SELECT ON public.api_limits_config TO anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT SELECT ON public.platform_settings TO anon;

-- 2. Redefine is_admin function to be SECURITY DEFINER and use a fixed search_path for safety
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$;

-- 3. Re-apply RLS policies for email_logs to ensure they are using the latest is_admin function correctly
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
CREATE POLICY "Admins can view email logs"
    ON public.email_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only log management" ON public.email_logs;
CREATE POLICY "Admin only log management"
    ON public.email_logs
    FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 4. Ensure RLS is enabled on all tables
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_limits_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
