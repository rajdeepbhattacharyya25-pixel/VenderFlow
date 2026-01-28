-- Fix ambiguous column reference in trigger function
-- "store_name" was both a column name and a variable name

CREATE OR REPLACE FUNCTION public.trigger_support_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_name text; -- Renamed variable to avoid ambiguity
  v_ticket_subject text;
BEGIN
  -- Get store name from seller profile
  SELECT store_name INTO v_store_name FROM public.sellers WHERE id = NEW.sender_id;
  
  -- Fallback if null
  IF v_store_name IS NULL THEN
    v_store_name := 'Seller ' || NEW.sender_id;
  END IF;

  -- Get ticket subject
  SELECT subject INTO v_ticket_subject FROM public.support_tickets WHERE id = NEW.ticket_id;

  -- Call the Edge Function
  PERFORM
    net.http_post(
      url:='https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/notify-admin',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI'
      ),
      body:=jsonb_build_object(
        'type', 'NEW_MESSAGE',
        'message', NEW.content,
        'data', jsonb_build_object(
          'ticket_id', NEW.ticket_id,
          'sender_id', NEW.sender_id,
          'email', v_store_name, -- Mapped to email field in template for now, or just sender name
          'subject', v_ticket_subject
        )
      )
    );

  RETURN NEW;
END;
$$;
