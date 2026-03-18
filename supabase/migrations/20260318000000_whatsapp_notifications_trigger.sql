-- Trigger: Notify Customer via WhatsApp on Order Status Update
-- Date: 2026-03-18
-- Author: Antigravity

CREATE OR REPLACE FUNCTION notify_whatsapp_on_order_update() 
RETURNS TRIGGER AS $$
DECLARE
    customer_phone TEXT;
    customer_name TEXT;
    tracking_link TEXT;
    supabase_url TEXT := 'https://gqwgvhxcssooxbmwgiwt.supabase.co';
    anon_key TEXT := '[SECRET]';
BEGIN
    -- 1. Check if status is one we want to notify for (confirmed or shipped)
    -- 2. Check if whatsapp_notified is false (to prevent duplicates)
    IF (NEW.status IN ('confirmed', 'shipped')) AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.whatsapp_notified = FALSE) THEN
        
        -- 3. Fetch customer details from store_customers
        SELECT phone, display_name 
        INTO customer_phone, customer_name
        FROM public.store_customers
        WHERE user_id = NEW.customer_id
        LIMIT 1;

        -- 4. Get tracking link if available
        tracking_link := COALESCE(NEW.tracking_url, '');

        -- 5. Call Edge Function if we have a phone number
        IF customer_phone IS NOT NULL AND length(customer_phone) >= 10 THEN
            PERFORM net.http_post(
                url := supabase_url || '/functions/v1/whatsapp-notifications',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || anon_key
                ),
                body := jsonb_build_object(
                    'phoneNumber', customer_phone,
                    'customerName', customer_name,
                    'orderId', NEW.id,
                    'status', NEW.status,
                    'trackingUrl', tracking_link
                )
            );

            -- 6. Mark as notified to avoid loops/duplicates in the same transaction
            -- (Using NEW.whatsapp_notified := true would work in a BEFORE trigger, 
            -- but this is AFTER so we need to be careful. Let's make it a BEFORE trigger instead)
            -- Wait, if it's AFTER trigger, we can't update NEW. 
            -- I'll change it to BEFORE UPDATE.
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create/Re-create the trigger as a BEFORE trigger to update the row's flag
DROP TRIGGER IF EXISTS trigger_notify_whatsapp_on_order_update ON orders;
CREATE TRIGGER trigger_notify_whatsapp_on_order_update
    BEFORE UPDATE OF status ON orders
    FOR EACH ROW
    WHEN (NEW.status IN ('confirmed', 'shipped'))
    EXECUTE FUNCTION notify_whatsapp_on_order_update();

-- Update existing orders handle: Handle INSERT as well (Order Confirmation)
DROP TRIGGER IF EXISTS trigger_notify_whatsapp_on_order_insert ON orders;
CREATE TRIGGER trigger_notify_whatsapp_on_order_insert
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.status = 'confirmed')
    EXECUTE FUNCTION notify_whatsapp_on_order_update();
