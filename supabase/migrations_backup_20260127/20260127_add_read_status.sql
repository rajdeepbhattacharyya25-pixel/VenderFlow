-- Migration: Add is_read column to support_messages
-- Run this in your Supabase SQL Editor

-- Add is_read column to support_messages if it doesn't exist
ALTER TABLE support_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Create index for faster counting of unread messages
CREATE INDEX IF NOT EXISTS idx_support_messages_is_read ON support_messages(is_read);

-- Update RLS policies to allow updating is_read?
-- Generally "Admins can update tickets" policy on support_tickets handles ticket updates.
-- But for messages, we typically don't update content, but we DO update is_read.

-- Add policy for Admins to update messages (for marking as read)
DROP POLICY IF EXISTS "Admins can update messages" ON support_messages;
CREATE POLICY "Admins can update messages"
ON support_messages FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Add policy for Sellers to update messages (for marking admin replies as read)
DROP POLICY IF EXISTS "Sellers can update own ticket messages" ON support_messages;
CREATE POLICY "Sellers can update own ticket messages"
ON support_messages FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = support_messages.ticket_id 
        AND support_tickets.seller_id = auth.uid()
    )
);
