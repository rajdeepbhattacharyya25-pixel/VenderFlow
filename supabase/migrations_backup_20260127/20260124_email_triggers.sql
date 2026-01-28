-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Function to trigger the email edge function
CREATE OR REPLACE FUNCTION public.handle_email_trigger()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  request_body jsonb;
  function_url text := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/send-email';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI';
BEGIN
  -- 1. ORDER CONFIRMED (INSERT)
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'orders' THEN
    payload := jsonb_build_object(
      'type', 'ORDER_CONFIRMED',
      'payload', jsonb_build_object(
        'order_id', NEW.id,
        'total', NEW.total,
        'currency', 'USD' -- Defaulting, you might want to fetch from settings
      ),
      'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id), -- Assuming customer_id links to auth.users
      'recipient_name', 'Valued Customer' -- You could fetch this from profiles
    );
  
  -- 2. STATUS UPDATE (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'orders' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Only trigger for specific statuses
    IF NEW.status IN ('processing', 'shipped', 'delivered', 'cancelled') THEN
       payload := jsonb_build_object(
        'type', 'STATUS_UPDATE',
        'payload', jsonb_build_object(
          'order_id', NEW.id,
          'status', NEW.status,
          'tracking_number', 'PENDING-TRACKING', -- You might want to add tracking column to orders
          'carrier', 'Standard Shipping'
        ),
        'recipient_email', (SELECT email FROM auth.users WHERE id = NEW.customer_id),
        'recipient_name', 'Valued Customer'
      );
    ELSE
      RETURN NEW;
    END IF;

  -- 3. PAYMENT FAILED (UPDATE) - Example logic if you have a payment_status column
  -- ELSIF ... THEN ...

  END IF;

  -- Send the request via pg_net
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

-- Create Triggers
DROP TRIGGER IF EXISTS on_order_created_email ON public.orders;
CREATE TRIGGER on_order_created_email
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_trigger();

DROP TRIGGER IF EXISTS on_order_status_email ON public.orders;
CREATE TRIGGER on_order_status_email
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_trigger();
