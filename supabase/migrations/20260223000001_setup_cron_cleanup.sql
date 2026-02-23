-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Create function to call the cleanup-previews edge function
-- Replace the URL with your actual production URL when deploying
CREATE OR REPLACE FUNCTION cleanup_expired_previews() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE project_url text;
service_role_key text;
BEGIN -- This assumes you have secrets set up in vault, or you can hardcode for local dev
-- For this example, we'll try to get it from current settings if possible, or just execute a direct delete
-- Actually, it's safer and easier to just delete directly in the DB
-- and log to audit_logs without HTTP overhead
WITH deleted_previews AS (
    DELETE FROM previews
    WHERE expires_at < now()
    RETURNING id,
        vendor_id,
        published
)
INSERT INTO audit_logs (
        actor_id,
        action,
        target_type,
        target_id,
        metadata
    )
SELECT vendor_id,
    'preview_auto_deleted',
    'preview',
    id,
    jsonb_build_object('reason', 'expired', 'was_published', published)
FROM deleted_previews;
END;
$$;
-- Schedule it to run every hour
SELECT cron.schedule(
        'cleanup-expired-previews',
        '0 * * * *',
        'SELECT cleanup_expired_previews();'
    );