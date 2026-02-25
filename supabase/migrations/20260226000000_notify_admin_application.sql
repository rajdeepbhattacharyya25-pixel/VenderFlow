-- Migration: Add Admin Notification Trigger for New Seller Applications
-- Date: 2026-02-26
-- Purpose: Notify admins automatically when a new seller applies
-- ============================================
CREATE OR REPLACE FUNCTION notify_admin_new_application() RETURNS TRIGGER AS $$
DECLARE v_admin RECORD;
BEGIN -- Notify all admins
FOR v_admin IN
SELECT id
FROM profiles
WHERE role = 'admin' LOOP
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
        v_admin.id,
        'seller',
        'New Seller Application',
        'New application pending review: "' || COALESCE(NEW.business_name, 'Unknown Store') || '" (' || COALESCE(NEW.name, '') || ')',
        '/admin/sellers'
    );
END LOOP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
SET search_path = public;
DROP TRIGGER IF EXISTS trigger_notify_admin_new_application ON seller_applications;
CREATE TRIGGER trigger_notify_admin_new_application
AFTER
INSERT ON seller_applications FOR EACH ROW EXECUTE FUNCTION notify_admin_new_application();