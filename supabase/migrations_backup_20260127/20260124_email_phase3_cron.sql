-- Phase 3: Abandoned Cart Recovery (Fixed for No-Cart-Table Schema)

-- 1. Enable pg_cron (if not enabled)
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Create Log Table
CREATE TABLE IF NOT EXISTS public.cart_recovery_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    sent_at timestamptz DEFAULT now()
);

-- 3. Create Processing Function
CREATE OR REPLACE FUNCTION public.process_abandoned_carts()
RETURNS void AS $$
DECLARE
  cart_record RECORD;
  payload jsonb;
  function_url text := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/send-email';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI';
  
  cust_email text;
  store_logo text;
  store_biz_name text;
BEGIN
  -- Loop through distinct abandoned sessions (items exist, older than 1 hr)
  FOR cart_record IN
    SELECT DISTINCT sci.customer_id, sci.seller_id
    FROM public.store_cart_items sci
    -- Find items last touched > 1 hr ago
    WHERE sci.created_at < (now() - interval '1 hour') -- Assuming created_at is the main timestamp if updated_at is missing or check both
    -- AND NOT notified in last 24 hours
    AND NOT EXISTS (
        SELECT 1 FROM public.cart_recovery_logs crl 
        WHERE crl.customer_id = sci.customer_id 
        AND crl.seller_id = sci.seller_id 
        AND crl.sent_at > (now() - interval '24 hours')
    )
  LOOP
    
    -- Fetch Customer Info
    SELECT email INTO cust_email FROM auth.users WHERE id = cart_record.customer_id;
    
    -- Fetch Store Branding
    SELECT logo_url, store_name INTO store_logo, store_biz_name
    FROM public.store_settings WHERE seller_id = cart_record.seller_id;

    IF store_biz_name IS NULL THEN store_biz_name := 'Modern Apparel Store'; END IF;

    -- Build Payload
    payload := jsonb_build_object(
      'type', 'ABANDONED_CART',
      'recipient_email', cust_email,
      'recipient_name', 'Valued Customer',
      'payload', jsonb_build_object(
        'cart_id', 'session_recovery', -- No cart ID
        'recovery_link', 'https://modernapparel.store/checkout', 
        'logo_url', store_logo,
        'store_name', store_biz_name
      )
    );

    -- Send Email
    IF cust_email IS NOT NULL THEN
        PERFORM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key
        ),
        body := payload
        );

        -- Log Verification
        INSERT INTO public.cart_recovery_logs (customer_id, seller_id)
        VALUES (cart_record.customer_id, cart_record.seller_id);
    END IF;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Schedule Job (Every 60 mins)
SELECT cron.schedule(
  'process_abandoned_carts_job', 
  '0 * * * *',                   
  'SELECT public.process_abandoned_carts()'
);
