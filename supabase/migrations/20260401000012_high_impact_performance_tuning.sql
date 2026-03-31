-- 1. Advisor Recommended Dashboard Indexes
-- Speeds up listing and sorting on administrative dashboards
CREATE INDEX IF NOT EXISTS idx_products_created_at_desc ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_asc ON public.orders (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider_created ON public.api_usage_logs (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active_desc ON public.user_sessions (last_active DESC);

-- 2. Outbox Job Performance Refinement
-- Adding created_at to the partial index allows the claim_outbox_job ORDER BY to use the index
DROP INDEX IF EXISTS public.idx_outbox_pending;
CREATE INDEX IF NOT EXISTS idx_outbox_pending_v2 
ON public.outbox_jobs (status, next_retry_at, created_at) 
WHERE status IN ('pending', 'processing');

-- 3. Abandoned Cart Discovery Index
-- Speeds up the SELECT DISTINCT ON (customer_id, seller_id) used in the discovery worker
CREATE INDEX IF NOT EXISTS idx_store_cart_items_lookup 
ON public.store_cart_items (customer_id, seller_id, created_at);

-- 4. Realtime Overhead Reduction
-- Remove high-write tables from publication to reduce list_changes overhead
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
END $$;

-- 5. Session Initialization Performance
-- Set default timezone for the authenticator role to minimize lookup overhead
ALTER ROLE authenticator SET timezone = 'UTC';

-- 6. Automated Maintenance Lifecycle
-- Ensure background tables don't grow indefinitely, which slows down indexes
SELECT cron.schedule(
    'nightly-log-purge',
    '0 1 * * *', -- 1 AM daily
    $$
    -- Keep only 7 days of cron history
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
    
    -- Keep only 14 days of API logs
    DELETE FROM public.api_usage_logs WHERE created_at < now() - interval '14 days';
    
    -- Keep only 30 days of user sessions
    DELETE FROM public.user_sessions WHERE last_active < now() - interval '30 days';
    
    -- Keep only 3 days of net responses (very high volume)
    DELETE FROM net._http_response WHERE created < now() - interval '3 days';
    $$
);

-- Optimize Outbox Workers to use index-only scan (when possible)
ANALYZE public.outbox_jobs;
ANALYZE public.store_cart_items;
ANALYZE public.audit_logs;
