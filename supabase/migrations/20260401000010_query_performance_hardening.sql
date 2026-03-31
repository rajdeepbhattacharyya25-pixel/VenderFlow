-- 1. Realtime Noise Reduction
-- Remove user_sessions from realtime publication to resolve huge list_changes overhead
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_sessions;

-- 2. Performance Indexes for Abandoned Carts & Recovery Logs
-- Speeds up filtering for eligible carts and prevents duplicate notifications
CREATE INDEX IF NOT EXISTS idx_store_cart_items_created_at ON public.store_cart_items (created_at);
CREATE INDEX IF NOT EXISTS idx_cart_recovery_logs_lookup ON public.cart_recovery_logs (customer_id, seller_id, sent_at DESC);

-- 3. Outbox Worker Performance Hardening
-- Partial index ensures the minute-worker only scans pending jobs
CREATE INDEX IF NOT EXISTS idx_outbox_jobs_pending 
ON public.outbox_jobs (next_retry_at ASC) 
WHERE status = 'pending';

-- 4. High-Performance Async Abandoned Cart Processor
-- Refactored: Batch-oriented, uses Outbox pattern, and avoids synchronous HTTP loops.
CREATE OR REPLACE FUNCTION public.process_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Batch Insert into Outbox (Async Email Processing)
  -- Decouples the cron job from external API latency
  INSERT INTO public.outbox_jobs (job_type, payload)
  SELECT 
    'EMAIL',
    jsonb_build_object(
      'type', 'ABANDONED_CART',
      'recipient_email', u.email,
      'recipient_name', 'Valued Customer',
      'payload', jsonb_build_object(
        'cart_id', 'session_recovery',
        'recovery_link', 'https://modernapparel.store/checkout', 
        'logo_url', ss.logo_url,
        'store_name', COALESCE(ss.store_name, 'Modern Apparel Store')
      )
    )
  FROM (
      -- Find distinct customer/seller pairs with abandoned items
      SELECT DISTINCT ON (customer_id, seller_id) customer_id, seller_id
      FROM public.store_cart_items
      WHERE created_at < (now() - interval '1 hour')
  ) AS abandoned
  JOIN auth.users u ON u.id = abandoned.customer_id
  JOIN public.store_settings ss ON ss.seller_id = abandoned.seller_id
  WHERE NOT EXISTS (
      -- Filter out those notified in last 24 hours
      SELECT 1 FROM public.cart_recovery_logs crl 
      WHERE crl.customer_id = abandoned.customer_id 
      AND crl.seller_id = abandoned.seller_id 
      AND crl.sent_at > (now() - interval '24 hours')
  );

  -- Log the recovery attempts for tracking
  INSERT INTO public.cart_recovery_logs (customer_id, seller_id)
  SELECT DISTINCT ON (customer_id, seller_id) customer_id, seller_id
  FROM public.store_cart_items AS sci
  WHERE created_at < (now() - interval '1 hour')
  AND NOT EXISTS (
      SELECT 1 FROM public.cart_recovery_logs crl 
      WHERE crl.customer_id = sci.customer_id 
      AND crl.seller_id = sci.seller_id 
      AND crl.sent_at > (now() - interval '24 hours')
  );

END;
$$;
