-- Migrate "category" from text to text[]
ALTER TABLE products 
  ALTER COLUMN category TYPE text[] 
  USING (
    CASE 
      WHEN category IS NULL THEN ARRAY[]::text[]
      WHEN btrim(category) = '' THEN ARRAY[]::text[]
      ELSE string_to_array(btrim(category), ',')
    END
  );

-- Optional: set a default if desired, otherwise it will just stay NULL which is fine, 
-- but arrays are typically easier when they default to empty rather than NULL.
-- In this app it seems like category might just be nullable, 
-- but having an empty array avoids "category IS NULL" checks.
ALTER TABLE products
  ALTER COLUMN category SET DEFAULT '{}'::text[];
