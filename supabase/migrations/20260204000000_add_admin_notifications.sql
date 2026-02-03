-- Migration: Add Admin Notification Triggers
-- Date: 2026-02-04
-- Purpose: Create notifications for admins when key platform events occur
-- ============================================
-- 1. NOTIFY ADMIN ON NEW SUPPORT TICKET
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_new_ticket() RETURNS TRIGGER AS $$
DECLARE v_admin RECORD;
v_seller_name TEXT;
BEGIN -- Get seller name for context
SELECT store_name INTO v_seller_name
FROM sellers
WHERE id = NEW.seller_id;
-- Notify all admins
FOR v_admin IN
SELECT id
FROM profiles
WHERE role = 'admin' LOOP
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
        v_admin.id,
        'support',
        'New Support Ticket',
        'Seller "' || COALESCE(v_seller_name, 'Unknown') || '" created: "' || NEW.subject || '"',
        '/admin/support'
    );
END LOOP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_admin_new_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_admin_new_ticket
AFTER
INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION notify_admin_new_ticket();
-- ============================================
-- 2. NOTIFY ADMIN ON NEW SELLER REGISTRATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_new_seller() RETURNS TRIGGER AS $$
DECLARE v_admin RECORD;
BEGIN -- Notify all admins when a new seller joins
FOR v_admin IN
SELECT id
FROM profiles
WHERE role = 'admin' LOOP
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
        v_admin.id,
        'seller',
        'New Seller Registered',
        'New seller "' || COALESCE(NEW.store_name, 'Unknown Store') || '" joined the platform',
        '/admin/sellers'
    );
END LOOP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_admin_new_seller ON sellers;
CREATE TRIGGER trigger_notify_admin_new_seller
AFTER
INSERT ON sellers FOR EACH ROW EXECUTE FUNCTION notify_admin_new_seller();
-- ============================================
-- 3. NOTIFY ADMIN ON SELLER REPLY TO SUPPORT
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_support_reply() RETURNS TRIGGER AS $$
DECLARE v_admin RECORD;
v_subject TEXT;
v_seller_name TEXT;
BEGIN -- Only notify admins when SELLER sends a message
IF NEW.sender_role = 'seller' THEN -- Get ticket info
SELECT t.subject,
    s.store_name INTO v_subject,
    v_seller_name
FROM support_tickets t
    LEFT JOIN sellers s ON s.id = t.seller_id
WHERE t.id = NEW.ticket_id;
-- Notify all admins
FOR v_admin IN
SELECT id
FROM profiles
WHERE role = 'admin' LOOP
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
        v_admin.id,
        'support',
        'New Support Reply',
        'Seller "' || COALESCE(v_seller_name, 'Unknown') || '" replied to: "' || v_subject || '"',
        '/admin/support'
    );
END LOOP;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_admin_support_reply ON support_messages;
CREATE TRIGGER trigger_notify_admin_support_reply
AFTER
INSERT ON support_messages FOR EACH ROW EXECUTE FUNCTION notify_admin_support_reply();