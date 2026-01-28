-- Phase 3 Part 2: Review Request Automation

-- 1. Add tracking column to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz;

-- 2. Create Processing Function
CREATE OR REPLACE FUNCTION public.process_review_requests()
RETURNS void AS $$
DECLARE
  order_record RECORD;
  payload jsonb;
  function_url text := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/send-email';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI';
  
  cust_email text;
  store_logo text;
  store_biz_name text;
BEGIN
  -- Loop through delivered orders (longer than 7 days ago, not notified)
  FOR order_record IN
    SELECT id, customer_id, seller_id, updated_at
    FROM public.orders
    WHERE status = 'delivered'
    AND updated_at < (now() - interval '7 days')
    AND review_request_sent_at IS NULL
  LOOP
    
    -- Fetch Customer Info
    SELECT email INTO cust_email FROM auth.users WHERE id = order_record.customer_id;
    
    -- Fetch Store Branding
    SELECT logo_url, store_name INTO store_logo, store_biz_name
    FROM public.store_settings WHERE seller_id = order_record.seller_id;

    IF store_biz_name IS NULL THEN store_biz_name := 'Modern Apparel Store'; END IF;

    -- Build Payload
    payload := jsonb_build_object(
      'type', 'REVIEW_REQUEST',
      'recipient_email', cust_email,
      'recipient_name', 'Valued Customer',
      'payload', jsonb_build_object(
        'order_id', order_record.id,
        'review_link', 'https://modernapparel.store/account/orders', -- Direct to order history
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

        -- Mark as Sent
        UPDATE public.orders 
        SET review_request_sent_at = now() 
        WHERE id = order_record.id;
    END IF;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule Job (Daily at 9 AM UTC approx)
SELECT cron.schedule(
  'process_review_requests_job', 
  '0 9 * * *',                   
  'SELECT public.process_review_requests()'
);
