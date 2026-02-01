-- Migration: Add Customer Push Notifications
-- Date: 2026-02-02
-- 1. Create table for storing Web Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint) -- One sub per browser per user
);
-- 2. RLS for Push Subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own subscriptions" ON push_subscriptions FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- 3. Trigger: Notify Customer on Order Status Update
CREATE OR REPLACE FUNCTION notify_customer_order_update() RETURNS TRIGGER AS $$ BEGIN -- Only notify if status changed
    IF OLD.status IS DISTINCT
FROM NEW.status THEN
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
        NEW.customer_id,
        -- Assuming orders table has customer_id linked to auth.users
        'order_update',
        'Order Status Updated',
        'Your order #' || LEFT(NEW.id::TEXT, 8) || ' is now ' || NEW.status,
        '/orders'
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_notify_customer_order_update ON orders;
CREATE TRIGGER trigger_notify_customer_order_update
AFTER
UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION notify_customer_order_update();
-- 4. Trigger: Send Push Notification calling Edge Function
-- (This uses pg_net or we can just rely on the client or a scheduled job, 
-- but simpler: The Edge Function 'send-push' can be called via Webhook from the Table 
-- OR strictly: we keep this logic in the 'send-push' function triggered by Database Webhook)
-- For now, we'll create the data structure. The actual "Push" sending will likely 
-- be triggered via Supabase Database Webhooks hitting the Edge Function, 
-- or we can call it directly if we had pg_net. 
-- Let's stick to the architecture: 
-- Event -> Row in 'notifications' -> (Realtime updates UI) -> (Webhook invokes Edge Function for Push)
-- We need to enable a webhook on the 'notifications' table to call our Edge Function.
-- However, creating webhooks via SQL in Supabase is done via the Dashboard or verify_webhook triggers.
-- We will assume the Edge Function 'send-push' will be set up as a Database Webhook in the Dashboard 
-- listening to INSERT on public.notifications.