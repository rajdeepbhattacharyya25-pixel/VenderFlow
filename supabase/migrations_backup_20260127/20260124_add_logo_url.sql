-- Add logo_url column to store_settings table if it doesn't exist
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Policy to allow public read access to store-assets bucket (if not already set)
-- Note: This assumes the bucket 'store-assets' is already created via dashboard/API.
