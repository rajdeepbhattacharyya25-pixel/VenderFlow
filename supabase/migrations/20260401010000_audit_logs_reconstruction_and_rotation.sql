-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Reconstruct/Ensure Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID REFERENCES public.sellers(id)
);

-- 2. Create Audit Logs History Table (same schema)
CREATE TABLE IF NOT EXISTS public.audit_logs_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID REFERENCES public.sellers(id)
);

-- 3. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON public.audit_logs (store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_history_created_at ON public.audit_logs_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_history_store_id ON public.audit_logs_history (store_id);

-- 4. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs_history ENABLE ROW LEVEL SECURITY;

-- 5. Apply Policies (Preserving existing logic)
DROP POLICY IF EXISTS "Relevant audit logs access" ON public.audit_logs;
CREATE POLICY "Relevant audit logs access" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        OR store_id IN (
            SELECT id FROM public.sellers WHERE user_id = auth.uid()
            UNION
            SELECT store_id FROM public.store_staff WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Relevant historical audit logs access" ON public.audit_logs_history;
CREATE POLICY "Relevant historical audit logs access" ON public.audit_logs_history
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
        OR store_id IN (
            SELECT id FROM public.sellers WHERE user_id = auth.uid()
            UNION
            SELECT store_id FROM public.store_staff WHERE user_id = auth.uid()
        )
    );

-- 6. Rotation Function
CREATE OR REPLACE FUNCTION public.rotate_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    moved_count INTEGER;
BEGIN
    -- Move old logs to history
    WITH moved_rows AS (
        DELETE FROM public.audit_logs
        WHERE created_at < (now() - (days_to_keep || ' days')::INTERVAL)
        RETURNING *
    )
    INSERT INTO public.audit_logs_history
    SELECT * FROM moved_rows;
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    -- Log the rotation event itself
    INSERT INTO public.audit_logs (
        action,
        target_type,
        metadata
    ) VALUES (
        'audit_logs_rotated',
        'system',
        jsonb_build_object(
            'days_retention', days_to_keep,
            'rows_moved', moved_count,
            'timestamp', now()
        )
    );
END;
$$;

-- 7. Schedule Rotation (Daily at 02:00 UTC)
-- We use DO block to prevent error if job already exists
DO $$
BEGIN
    -- Remove existing job if any to ensure clean update
    PERFORM cron.unschedule('rotate-audit-logs');
EXCEPTION WHEN OTHERS THEN
    -- Ignore if job doesn't exist
END $$;

SELECT cron.schedule(
    'rotate-audit-logs',
    '0 2 * * *',
    'SELECT public.rotate_audit_logs(90);'
);
