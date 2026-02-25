-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Unschedule if the daily report exists to replace it
DO $$ BEGIN PERFORM cron.unschedule('telegram-daily-report-job');
EXCEPTION
WHEN OTHERS THEN -- Ignore error if job doesn't exist
END $$;
-- Also unschedule the weekly one just in case we run this script repeatedly
DO $$ BEGIN PERFORM cron.unschedule('telegram-weekly-report-job');
EXCEPTION
WHEN OTHERS THEN
END $$;
-- Schedule the Telegram Weekly Report to run every Sunday at 2:30 AM UTC (equivalent to 8:00 AM IST)
-- Cron syntax for Sunday is 0 (or 7)
SELECT cron.schedule(
        'telegram-weekly-report-job',
        '30 2 * * 0',
        $$
        SELECT net.http_post(
                url := 'YOUR_SUPABASE_URL/functions/v1/telegram-daily-report',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
            );
$$
);