-- Migration: Seller Notifications System
-- Adds RLS policies for sellers and triggers for auto-generating notifications

-- ============================================
-- 1. ADD SELLER RLS POLICIES FOR NOTIFICATIONS
-- ============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Sellers can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Sellers can update their notifications" ON notifications;

-- Sellers can view their own notifications
CREATE POLICY "Sellers can view their notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Sellers can update their own notifications (mark as read)
CREATE POLICY "Sellers can update their notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 2. CREATE NOTIFICATION FUNCTIONS
-- ============================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (p_user_id, p_type, p_title, p_message, p_link)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. ORDER NOTIFICATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_new_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for the seller
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
        NEW.seller_id,
        'order',
        'New Order Received',
        'Order #' || LEFT(NEW.id::TEXT, 8) || ' - ₹' || NEW.total_amount,
        '/dashboard/orders'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON orders;

-- Create trigger for new orders
CREATE TRIGGER trigger_notify_seller_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_seller_new_order();

-- ============================================
-- 4. LOW STOCK NOTIFICATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if stock drops to 5 or below and was previously above 5
    IF NEW.stock <= 5 AND (OLD.stock IS NULL OR OLD.stock > 5) THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
            NEW.seller_id,
            'warning',
            'Low Stock Alert',
            'Product "' || NEW.name || '" has only ' || NEW.stock || ' units left',
            '/dashboard/products'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_seller_low_stock ON products;

-- Create trigger for low stock
CREATE TRIGGER trigger_notify_seller_low_stock
AFTER UPDATE OF stock ON products
FOR EACH ROW
EXECUTE FUNCTION notify_seller_low_stock();

-- ============================================
-- 5. SUPPORT MESSAGE NOTIFICATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_support_message()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_subject TEXT;
BEGIN
    -- Only notify sellers when admin sends a message
    IF NEW.sender_role = 'admin' THEN
        -- Get seller_id and subject from related ticket
        SELECT t.seller_id, t.subject INTO v_seller_id, v_subject
        FROM support_tickets t
        WHERE t.id = NEW.ticket_id;
        
        IF v_seller_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (
                v_seller_id,
                'support',
                'New Support Reply',
                'Admin replied to: "' || v_subject || '"',
                '/dashboard/support'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_seller_support_message ON support_messages;

-- Create trigger for support messages
CREATE TRIGGER trigger_notify_seller_support_message
AFTER INSERT ON support_messages
FOR EACH ROW
EXECUTE FUNCTION notify_seller_support_message();
