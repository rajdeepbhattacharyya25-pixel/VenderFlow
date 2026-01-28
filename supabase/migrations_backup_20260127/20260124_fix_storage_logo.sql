-- 1. Create the 'store-assets' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Read Access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'store-assets' );

-- 3. Allow Authenticated Users to Upload (INSERT)
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'store-assets' );

-- 4. Allow Users to Update their own uploaded files (optional but good)
-- Assuming we don't strictly enforce path ownership yet, just auth check
CREATE POLICY "Authenticated Updates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'store-assets' );
