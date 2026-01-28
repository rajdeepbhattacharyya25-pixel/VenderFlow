-- Enable the pg_net extension to make HTTP requests
-- We strictly specify schema extensions to avoid pollution
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Ensure the function is created in public
CREATE OR REPLACE FUNCTION public.trigger_support_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  store_name text;
  ticket_subject text;
  response_id uuid;
BEGIN
  -- Get store name from seller profile
  SELECT store_name INTO store_name FROM public.sellers WHERE id = NEW.sender_id;
  IF store_name IS NULL THEN
    store_name := 'Seller ' || NEW.sender_id;
  END IF;

  -- Get ticket subject
  SELECT subject INTO ticket_subject FROM public.support_tickets WHERE id = NEW.ticket_id;

  -- Call the Edge Function
  -- URL: https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/notify-admin
  -- We use the Anon Key for authorization
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
          'email', store_name,
          'subject', ticket_subject
        )
      )
    );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_support_message_created ON public.support_messages;
CREATE TRIGGER on_support_message_created
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  WHEN (NEW.sender_role = 'seller')
  EXECUTE FUNCTION public.trigger_support_notification();
