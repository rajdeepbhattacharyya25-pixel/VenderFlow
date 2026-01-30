-- Trigger function to call notify-admin on new support ticket
create or replace function notify_admin_on_new_ticket()
returns trigger
language plpgsql
security definer
as $$
declare
  seller_email text;
begin
  -- Fetch seller email
  select email into seller_email
  from auth.users
  where id = new.seller_id;

  -- Call the Edge Function
  perform net.http_post(
    url := 'https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/notify-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claim.sub', true) -- Use internal auth or anon key if needed
    ),
    body := jsonb_build_object(
      'type', 'NEW_MESSAGE',
      'message', new.subject, -- Using subject as the message body for notification
      'data', jsonb_build_object(
        'email', seller_email,
        'subject', 'New Ticket via Telegram',
        'ticket_id', new.id
      )
    )
  );

  return new;
end;
$$;

-- Create Trigger
drop trigger if exists on_new_support_ticket on support_tickets;
create trigger on_new_support_ticket
  after insert on support_tickets
  for each row
  execute function notify_admin_on_new_ticket();
