-- Daily Heartbeat for Secret Drift Detection
-- Scheduled for 00:00 UTC every day

-- Function to execute the heartbeat check
CREATE OR REPLACE FUNCTION check_dispatcher_heartbeat() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    project_url text;
    service_role_key text;
    api_url text;
BEGIN
    SELECT current_setting('request.headers', true)::json->>'x-forwarded-proto' || '://' || current_setting('request.headers', true)::json->>'host' INTO project_url;
    
    -- Using net_http_post from pg_net extension
    -- This sends an async trigger to the Edge Function
    -- Note: Project URL is usually better from ENV but DB functions are tricky here.
    -- We'll assume the standard Supabase Edge Function URL format.
    
    -- If project URL is null (not from request), we might need another way or just skip/log.
    -- Actually, it's safer to just log a system alert when a manual check is needed, 
    -- but cron runs are NOT within a request context.
    
    -- For real-world use, we often use the DB secrets via vault.
    
    PERFORM net.http_post(
        url := 'https://' || (SELECT split_part(current_setting('request.headers', true)::json->>'host', '.', 1)) || '.supabase.co/functions/v1/heartbeat',
        headers := jsonb_build_object('Content-Type', 'application/json', 'X-Dispatcher-Secret', 'HEARTBEAT_CRON_TRIGGER'),
        body := jsonb_build_object('triggered_by', 'cron_daily')
    );
END;
$$;

-- Wait, pg_net is better used with direct URLs.
-- Let's use the standard format.
DROP FUNCTION IF EXISTS check_dispatcher_heartbeat();

CREATE OR REPLACE FUNCTION check_dispatcher_heartbeat() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- This assumes your project is properly configured with pg_net.
    -- The actual URL can be fetched from current_setting or env if available, 
    -- but usually it's static for the project.
    
    -- Logging that heartbeat was triggered
    INSERT INTO audit_logs (
        action,
        target_type,
        metadata
    ) VALUES (
        'heartbeat_triggered',
        'system',
        jsonb_build_object('reason', 'daily_schedule')
    );
    
    -- In Supabase, if we want to call an edge function FROM a DB function:
    -- The most common way is using pg_net or net.http_post.
    -- We'll use a placeholder URL and rely on pg_net.
    
    PERFORM net.http_post(
        url := 'https://' || (SELECT split_part(current_setting('request.headers', true)::json->>'host', '.', 1)) || '.supabase.co/functions/v1/heartbeat',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('type', 'daily_check')
    );
END;
$$;

-- Note: Since 'request.headers' is only available during an HTTP request, 
-- cron jobs (running in separate worker) might not have it.
-- Better approach: just use a direct cron.schedule to call the URL.

SELECT cron.schedule(
    'daily-secret-heartbeat',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/heartbeat',
        headers := jsonb_build_object('Content-Type', 'application/json')
    );
    $$
);
