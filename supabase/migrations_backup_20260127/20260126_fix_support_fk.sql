-- Fix Migration: Correct Foreign Key for support_tickets
-- Run this in Supabase SQL Editor

-- 1. Drop the incorrect foreign key
ALTER TABLE support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_seller_id_fkey;

-- 2. Add the correct foreign key referencing sellers table
ALTER TABLE support_tickets
ADD CONSTRAINT support_tickets_seller_id_fkey
FOREIGN KEY (seller_id)
REFERENCES sellers(id)
ON DELETE CASCADE;

-- 3. Just in case, refresh simple schema cache (sometimes needed for PostgREST)
NOTIFY pgrst, 'reload schema';
