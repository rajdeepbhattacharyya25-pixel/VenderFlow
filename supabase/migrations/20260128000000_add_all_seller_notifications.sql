-- Migration: Add All Seller Notifications (Customer, Order, Stock)
-- Combines missing triggers into one active migration

-- ============================================
-- 1. NOTIFICATION FUNCTION (Generic)
-- ============================================

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
-- 2. NEW CUSTOMER TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_new_customer()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify seller when a new customer registers
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
        NEW.seller_id,
        'customer',
        'New Customer Registered',
        'Customer ' || COALESCE(NEW.display_name, NEW.email) || ' just joined your store!',
        '/dashboard/customers'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_seller_new_customer ON store_customers;

CREATE TRIGGER trigger_notify_seller_new_customer
AFTER INSERT ON store_customers
FOR EACH ROW
EXECUTE FUNCTION notify_seller_new_customer();

-- ============================================
-- 3. NEW ORDER TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_new_order()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trigger_notify_seller_new_order ON orders;

CREATE TRIGGER trigger_notify_seller_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_seller_new_order();

-- ============================================
-- 4. LOW STOCK TRIGGER (Product Variants)
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_product_name TEXT;
BEGIN
    -- Only notify if stock drops to 5 or below and was previously > 5
    IF NEW.stock_quantity <= 5 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 5) THEN
        
        -- Get Product Info
        SELECT seller_id, name INTO v_seller_id, v_product_name
        FROM products
        WHERE id = NEW.product_id;

        IF v_seller_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (
                v_seller_id,
                'warning',
                'Low Stock Alert',
                'Product "' || v_product_name || '" (' || COALESCE(NEW.variant_name, 'Variant') || ') has only ' || NEW.stock_quantity || ' units left',
                '/dashboard/products'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_seller_low_stock ON product_variants;

CREATE TRIGGER trigger_notify_seller_low_stock
AFTER UPDATE OF stock_quantity ON product_variants
FOR EACH ROW
EXECUTE FUNCTION notify_seller_low_stock();

-- ============================================
-- 5. SUPPORT REPLY TRIGGER (Admin -> Seller)
-- ============================================

CREATE OR REPLACE FUNCTION notify_seller_support_reply()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_subject TEXT;
BEGIN
    -- Only notify sellers when ADMIN sends a message
    IF NEW.sender_role = 'admin' THEN
        -- Get ticket info
        SELECT seller_id, subject INTO v_seller_id, v_subject
        FROM support_tickets
        WHERE id = NEW.ticket_id;
        
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

DROP TRIGGER IF EXISTS trigger_notify_seller_support_reply ON support_messages;

CREATE TRIGGER trigger_notify_seller_support_reply
AFTER INSERT ON support_messages
FOR EACH ROW
EXECUTE FUNCTION notify_seller_support_reply();
