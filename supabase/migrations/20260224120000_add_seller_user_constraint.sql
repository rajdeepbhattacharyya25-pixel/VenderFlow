-- Add user_id column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'sellers'
        AND column_name = 'user_id'
) THEN
ALTER TABLE public.sellers
ADD COLUMN user_id uuid REFERENCES auth.users(id);
-- Backfill user_id from id (since existing pattern uses user ID as primary key)
UPDATE public.sellers
SET user_id = id
WHERE user_id IS NULL;
END IF;
END $$;
-- First, ensure there are no duplicate user_ids that would cause the migration to fail
-- (This is safer after backfilling)
DO $$
DECLARE duplicate_count INTEGER;
BEGIN
SELECT count(*) INTO duplicate_count
FROM (
        SELECT user_id
        FROM public.sellers
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        HAVING count(*) > 1
    ) AS duplicates;
IF duplicate_count > 0 THEN RAISE EXCEPTION 'Cannot add unique constraint: % users already have multiple stores.',
duplicate_count;
END IF;
END $$;
-- Add the unique constraint
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_key;
ALTER TABLE public.sellers
ADD CONSTRAINT sellers_user_id_key UNIQUE (user_id);
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);