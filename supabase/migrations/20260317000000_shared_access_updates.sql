-- Migration: Add permissions to store_staff and store_id to audit_logs
-- Date: 2026-03-17

-- 1. Add permissions to store_staff
ALTER TABLE public.store_staff 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonB;

-- 2. Add store_id to audit_logs
-- First, add the column
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON public.audit_logs(store_id);

-- 3. Update RLS for audit_logs to allow sellers to view their own logs
-- (Assuming RLS is enabled as per the schema check)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audit_logs' AND policyname = 'Sellers can view their own store logs'
    ) THEN
        DROP POLICY "Sellers can view their own store logs" ON public.audit_logs;
    END IF;
END $$;

CREATE POLICY "Sellers can view their own store logs" ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    store_id IN (
        SELECT id FROM public.sellers WHERE user_id = auth.uid()
        UNION
        SELECT store_id FROM public.store_staff WHERE user_id = auth.uid()
    )
);

-- 4. Add a function/trigger to auto-set store_id if possible, or we handle it in edge functions/app logic.
-- For now, we will handle it in the application logic to keep it simple.
