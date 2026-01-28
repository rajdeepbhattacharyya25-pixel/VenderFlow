-- Phase 2.5: Email Branding (Logo & Store Name)

CREATE OR REPLACE FUNCTION public.handle_email_trigger()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  function_url text := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/send-email';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI';
  
  -- Variables for branding
  params_logo_url text;
  params_store_name text;
BEGIN
  -- Fetch Branding Info (assuming 1 store per seller or just picking the matching seller)
  SELECT logo_url, store_name INTO params_logo_url, params_store_name
  FROM public.store_settings
  WHERE seller_id = NEW.seller_id
  LIMIT 1;

  -- Default fallback if no settings found
  IF params_store_name IS NULL THEN
    params_store_name := 'Modern Apparel Store';
  END IF;

  -- 1. ORDER CONFIRMED (INSERT)
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'orders' THEN
    payload := jsonb_build_object(
      'type', 'ORDER_CONFIRMED',
      'payload', jsonb_build_object(
        'order_id', NEW.id,
        'total', NEW.total,
        'currency', 'USD',
        'logo_url', params_logo_url,
        'store_name', params_store_name
      ),
      'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
      'recipient_name', 'Customer'
    );
  
  -- 2. STATUS UPDATES (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'orders' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Common payload builder helper could be used, but repeating for clarity
    payload := jsonb_build_object(
      'type', CASE 
        WHEN NEW.status = 'packed' THEN 'PACKED'
        WHEN NEW.status = 'out_for_delivery' THEN 'OUT_FOR_DELIVERY'
        WHEN NEW.status = 'refunded' THEN 'REFUND_INITIATED'
        ELSE 'STATUS_UPDATE'
      END,
      'payload', jsonb_build_object(
        'order_id', NEW.id,
        'status', NEW.status, -- Only used for generic STATUS_UPDATE
        'amount', NEW.total, -- Used for Refund
        'tracking_number', 'PENDING-TRACKING',
        'logo_url', params_logo_url,
        'store_name', params_store_name
      ),
      'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
      'recipient_name', 'Customer'
    );

    -- Filter out irrelevant status updates if needed, but generic STATUS_UPDATE handles them.
    -- Ensure we don't trigger for 'pending' -> 'pending' or similar if logic changes
    IF NEW.status NOT IN ('packed', 'out_for_delivery', 'refunded', 'processing', 'shipped', 'delivered', 'cancelled') THEN
       payload := NULL;
    END IF;

  END IF;

  -- Send request
  IF payload IS NOT NULL THEN
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
