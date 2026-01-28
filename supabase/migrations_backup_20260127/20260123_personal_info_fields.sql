-- Add missing columns to store_customers for personal information
ALTER TABLE public.store_customers 
ADD COLUMN IF NOT EXISTS alt_phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS dob TEXT;
