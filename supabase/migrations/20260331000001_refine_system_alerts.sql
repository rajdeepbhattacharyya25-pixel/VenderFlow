-- Phase 1: Database Refinement for System Alerts

-- 1. Alter system_alerts table
ALTER TABLE public.system_alerts 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.sellers(id),
ADD COLUMN IF NOT EXISTS fingerprint TEXT,
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS action_payload JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1;

-- Add index for fingerprint searches
CREATE INDEX IF NOT EXISTS idx_system_alerts_fingerprint ON public.system_alerts (fingerprint)
    WHERE acknowledged = FALSE;

-- 2. Refine the create_system_alert RPC
CREATE OR REPLACE FUNCTION public.create_system_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_seller_id UUID DEFAULT NULL,
    p_fingerprint TEXT DEFAULT NULL,
    p_action_type TEXT DEFAULT NULL,
    p_action_payload JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
    v_existing_id UUID;
    v_throttle_minutes INTEGER;
    v_last_seen TIMESTAMPTZ;
BEGIN
    -- Determine throttle window based on severity
    v_throttle_minutes := CASE 
        WHEN p_severity = 'critical' THEN 0     -- No suppression
        WHEN p_severity = 'warning'  THEN 30    -- 30 min suppression
        WHEN p_severity = 'info'     THEN 120   -- 2 hour suppression
        ELSE 60                                 -- Default 1 hour
    END;

    -- Check for existing unacknowledged alert with same fingerprint
    IF p_fingerprint IS NOT NULL THEN
        SELECT id, last_seen_at INTO v_existing_id, v_last_seen
        FROM public.system_alerts
        WHERE fingerprint = p_fingerprint
          AND acknowledged = FALSE
          AND (p_seller_id IS NULL OR seller_id = p_seller_id)
        LIMIT 1;
    END IF;

    -- If duplicate found within window, just increment count
    IF v_existing_id IS NOT NULL AND (now() - v_last_seen) < (v_throttle_minutes * INTERVAL '1 minute') THEN
        UPDATE public.system_alerts
        SET occurrence_count = occurrence_count + 1,
            last_seen_at = now(),
            message = p_message, -- Keep message fresh
            metadata = p_metadata -- Keep metadata fresh
        WHERE id = v_existing_id
        RETURNING id INTO v_alert_id;
    ELSE
        -- Insert new alert
        INSERT INTO public.system_alerts (
            alert_type, severity, title, message, metadata, 
            seller_id, fingerprint, action_type, action_payload
        )
        VALUES (
            p_alert_type, p_severity, p_title, p_message, p_metadata, 
            p_seller_id, p_fingerprint, p_action_type, p_action_payload
        )
        RETURNING id INTO v_alert_id;
    END IF;

    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for Alert Dispatcher
-- We use a generic trigger that will notify our edge function
-- The dispatcher will decide based on occurrence_count (1 = first time, or if window passed)
CREATE OR REPLACE FUNCTION public.on_system_alert_notify()
RETURNS TRIGGER AS $$
DECLARE
    v_service_key TEXT;
    v_url TEXT := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/alert-dispatcher';
BEGIN
    -- Secure service-role-based authentication: Load from vault
    SELECT secret INTO v_service_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_key';
    
    IF v_service_key IS NULL THEN
        RAISE LOG 'System alert skipped: service_key not found in vault.secrets. Please add it using vault.create_secret()';
        RETURN NEW;
    END IF;

    -- Only dispatch on new alerts (occurrence_count = 1)
    -- This avoids spamming notifications for throttled updates
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.occurrence_count = 1) THEN
        PERFORM net.http_post(
            url     := v_url,
            body    := jsonb_build_object(
                'alert_id',   NEW.id,
                'alert_type', NEW.alert_type,
                'severity',   NEW.severity,
                'seller_id',  NEW.seller_id,
                'title',      NEW.title,
                'message',    NEW.message
            ),
            params  := '{}'::jsonb,
            headers := jsonb_build_object(
                'Content-Type',  'application/json',
                'Authorization', 'Bearer ' || v_service_key
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_system_alert_dispatcher ON public.system_alerts;
CREATE TRIGGER tr_system_alert_dispatcher
    AFTER INSERT OR UPDATE ON public.system_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.on_system_alert_notify();
