-- Add all missing columns to store_settings table

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS bank_details TEXT,
ADD COLUMN IF NOT EXISTS invoice_footer TEXT,
ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC DEFAULT 18,
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS trust_badges JSONB DEFAULT '[]'::jsonb;
