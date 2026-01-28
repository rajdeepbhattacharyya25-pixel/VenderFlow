-- Migration: Create Notifications System & Update Support Messages
-- This creates the notifications table and adds tracking for read status on support messages

-- ============================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for system-wide notifs
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error', 'order', 'seller', 'support')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications
-- Admin can view all notifications (or their own if user_id is set)
CREATE POLICY "Admins can view notifications"
ON notifications FOR SELECT
TO authenticated
USING (
    (user_id = auth.uid()) OR 
    (user_id IS NULL AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ))
);

-- Admins can update their notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
    (user_id = auth.uid()) OR 
    (user_id IS NULL AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    ))
);

-- ============================================
-- 2. UPDATE SUPPORT MESSAGES
-- ============================================

-- Add is_read column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_messages' AND column_name = 'is_read') THEN
        ALTER TABLE support_messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_support_messages_is_read ON support_messages(ticket_id) WHERE is_read = false;
