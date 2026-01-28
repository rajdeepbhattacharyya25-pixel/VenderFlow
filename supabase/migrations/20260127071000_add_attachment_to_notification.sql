-- Update trigger to include attachment details in payload

CREATE OR REPLACE FUNCTION public.trigger_support_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name text;
  v_ticket_subject text;
  v_contact_person text;
  v_user_email text;
BEGIN
  -- Get store name and contact person from seller profile
  SELECT store_name, contact_person INTO v_sender_name, v_contact_person 
  FROM public.sellers 
  WHERE id = NEW.sender_id;

  -- 1. Try Store Name
  IF v_sender_name IS NULL OR v_sender_name = '' THEN
    v_sender_name := v_contact_person;
  END IF;

  -- 2. Try Contact Person
  IF v_sender_name IS NULL OR v_sender_name = '' THEN
      -- 3. Try Email from auth.users (requires SECURITY DEFINER)
      SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.sender_id;
      v_sender_name := v_user_email;
  END IF;

  -- 4. Fallback to ID
  IF v_sender_name IS NULL OR v_sender_name = '' THEN
    v_sender_name := 'Seller ' || NEW.sender_id;
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
          'email', v_sender_name,
          'subject', v_ticket_subject,
          'attachment_url', NEW.attachment_url,
          'attachment_name', NEW.attachment_name,
          'attachment_type', NEW.attachment_type
        )
      )
    );

  RETURN NEW;
END;
$$;
