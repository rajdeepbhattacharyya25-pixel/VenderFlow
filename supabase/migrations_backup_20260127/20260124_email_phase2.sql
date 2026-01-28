-- Phase 2: Enhanced Email Triggers
-- Supports 'packed', 'out_for_delivery', 'refunded'

CREATE OR REPLACE FUNCTION public.handle_email_trigger()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  function_url text := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/send-email';
  anon_key text := '[SECRET]';
BEGIN
  -- 1. ORDER CONFIRMED (INSERT)
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'orders' THEN
    payload := jsonb_build_object(
      'type', 'ORDER_CONFIRMED',
      'payload', jsonb_build_object(
        'order_id', NEW.id,
        'total', NEW.total,
        'currency', 'USD' -- Default
      ),
      'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
      'recipient_name', 'Customer'
    );
  
  -- 2. STATUS UPDATES (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'orders' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Case: PACKED
    IF NEW.status = 'packed' THEN
      payload := jsonb_build_object(
        'type', 'PACKED',
        'payload', jsonb_build_object('order_id', NEW.id),
        'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
        'recipient_name', 'Customer'
      );

    -- Case: OUT FOR DELIVERY
    ELSIF NEW.status = 'out_for_delivery' THEN
      payload := jsonb_build_object(
        'type', 'OUT_FOR_DELIVERY',
        'payload', jsonb_build_object('order_id', NEW.id),
        'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
        'recipient_name', 'Customer'
      );

    -- Case: REFUNDED
    ELSIF NEW.status = 'refunded' THEN
      payload := jsonb_build_object(
        'type', 'REFUND_INITIATED',
        'payload', jsonb_build_object(
          'order_id', NEW.id,
          'amount', NEW.total -- Assuming full refund for now
        ),
        'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
        'recipient_name', 'Customer'
      );

    -- Case: GENERIC STATUS (proccessing, shipped, delivered, cancelled)
    ELSIF NEW.status IN ('processing', 'shipped', 'delivered', 'cancelled') THEN
       payload := jsonb_build_object(
        'type', 'STATUS_UPDATE',
        'payload', jsonb_build_object(
          'order_id', NEW.id,
          'status', NEW.status,
          'tracking_number', 'PENDING-TRACKING', 
          'carrier', 'Standard Shipping'
        ),
        'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
        'recipient_name', 'Customer'
      );
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
