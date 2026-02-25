-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Unschedule if it already exists to allow safe reruns
DO $$ BEGIN PERFORM cron.unschedule('telegram-daily-report-job');
EXCEPTION
WHEN OTHERS THEN -- Ignore error if job doesn't exist yet
END $$;
-- Schedule the Telegram Daily Report to run everyday at 2:30 AM UTC (equivalent to 8:00 AM IST)
-- NOTE: In local development, you generally don't run pg_cron. 
-- In production, replace `YOUR_SUPABASE_URL` and `YOUR_ANON_KEY` when executing this in the SQL Editor.
SELECT cron.schedule(
        'telegram-daily-report-job',
        '30 2 * * *',
        $$
        SELECT net.http_post(
                url := 'YOUR_SUPABASE_URL/functions/v1/telegram-daily-report',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
            );
$$
);