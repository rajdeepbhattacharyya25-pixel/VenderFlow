-- 1. Add media_type and variant_value to product_media
ALTER TABLE product_media
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    ADD COLUMN IF NOT EXISTS variant_value TEXT;
-- 2. Update existing rows if any
UPDATE product_media
SET media_type = 'image'
WHERE media_type IS NULL;
-- 3. We might want a check constraint to ensure only 1 video per product if we wanted to enforce it at the DB level,
-- but doing it at the application level is also fine and more flexible for future changes.
-- 4. Storage Bucket Policies for Videos
-- Assuming the bucket is 'products-images' (which might be better named 'product-media', but we stick to existing for now).
-- The existing policies should already cover file uploads.
-- If there are restrictions on mime types in the bucket, we might need to update them, but usually standard Supabase buckets 
-- allow any type unless explicitly restricted.