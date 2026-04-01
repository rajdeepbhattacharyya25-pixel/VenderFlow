-- Migration: Throttle Critical Alerts
-- Purpose: Prevent Telegram bot spamming by implementing a 5-minute suppression window for 'critical' alerts.
-- Author: Antigravity AI

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
    -- UPDATED: critical alerts now have a 5-minute throttle instead of 0 to prevent spam on retries
    v_throttle_minutes := CASE 
        WHEN p_severity = 'critical' THEN 5     -- 5 min suppression (prevents spam on rapid retries)
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
