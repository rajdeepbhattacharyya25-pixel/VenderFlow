-- Add shipping settings to store_settings table
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 0;

-- Update existing rows to have default values if they are NULL (for safety)
UPDATE public.store_settings 
SET shipping_fee = 0 
WHERE shipping_fee IS NULL;

UPDATE public.store_settings 
SET free_shipping_threshold = 0 
WHERE free_shipping_threshold IS NULL;
