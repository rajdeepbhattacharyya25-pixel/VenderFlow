-- Migration: Create Support Ticket System
-- This creates the support_tickets and support_messages tables with proper RLS policies
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_seller_id ON support_tickets(seller_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON support_tickets(updated_at DESC);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'seller')),
    content TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- ============================================
-- 2. ENABLE RLS
-- ============================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES FOR SUPPORT_TICKETS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Sellers can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Sellers can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;

-- Sellers can view their own tickets
CREATE POLICY "Sellers can view own tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Sellers can create tickets
CREATE POLICY "Sellers can create tickets"
ON support_tickets FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

-- Admins can view ALL tickets (using profiles.role = 'admin')
CREATE POLICY "Admins can view all tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Admins can update tickets (e.g., close them)
CREATE POLICY "Admins can update tickets"
ON support_tickets FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- ============================================
-- 4. RLS POLICIES FOR SUPPORT_MESSAGES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Sellers can view messages on own tickets" ON support_messages;
DROP POLICY IF EXISTS "Sellers can send messages on own tickets" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON support_messages;

-- Sellers can view messages on their own tickets
CREATE POLICY "Sellers can view messages on own tickets"
ON support_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = support_messages.ticket_id 
        AND support_tickets.seller_id = auth.uid()
    )
);

-- Sellers can send messages on their own tickets
CREATE POLICY "Sellers can send messages on own tickets"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_role = 'seller' 
    AND sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = ticket_id 
        AND support_tickets.seller_id = auth.uid()
    )
);

-- Admins can view ALL messages
CREATE POLICY "Admins can view all messages"
ON support_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Admins can send messages on any ticket
CREATE POLICY "Admins can send messages"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_role = 'admin'
    AND sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- ============================================
-- 5. STORAGE BUCKET FOR ATTACHMENTS
-- ============================================

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'support-attachments',
    'support-attachments',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime'];

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- Allow public read access to support attachments
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'support-attachments');

-- ============================================
-- 6. UPDATE TRIGGER FOR updated_at
-- ============================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();
