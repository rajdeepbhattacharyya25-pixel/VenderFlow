-- Create seller_requests table for idempotency
CREATE TABLE IF NOT EXISTS public.seller_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_request_id uuid NOT NULL UNIQUE,
    user_id uuid REFERENCES auth.users(id),
    seller_id uuid REFERENCES public.sellers(id),
    status text DEFAULT 'pending',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);
-- Enable RLS on seller_requests
ALTER TABLE public.seller_requests ENABLE ROW LEVEL SECURITY;
-- Ensure sellers table has necessary columns and constraints
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'sellers'
        AND column_name = 'user_id'
) THEN
ALTER TABLE public.sellers
ADD COLUMN user_id uuid REFERENCES auth.users(id);
UPDATE public.sellers
SET user_id = id
WHERE user_id IS NULL;
END IF;
END $$;
-- Uniqueness for preventing duplicates
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_user_id_key;
ALTER TABLE public.sellers
ADD CONSTRAINT sellers_user_id_key UNIQUE (user_id);
ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_slug_key;
ALTER TABLE public.sellers
ADD CONSTRAINT sellers_slug_key UNIQUE (slug);
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_slug ON public.sellers(slug);
-- PL/pgSQL function create_seller_if_not_exists
CREATE OR REPLACE FUNCTION public.create_seller_if_not_exists(
        p_user_id uuid,
        p_store_name text,
        p_slug text,
        p_created_by uuid
    ) RETURNS public.sellers AS $$
DECLARE v_seller public.sellers %rowtype;
BEGIN -- Try to insert the seller. If user_id exists, it won't insert a new one.
-- We use ON CONFLICT (user_id) DO NOTHING to gracefully handle existing users.
INSERT INTO public.sellers (
        id,
        user_id,
        store_name,
        slug,
        status,
        is_active,
        plan
    )
VALUES (
        p_user_id,
        p_user_id,
        p_store_name,
        p_slug,
        'active',
        true,
        'free'
    ) ON CONFLICT (user_id) DO NOTHING;
-- Fetch the seller record (either the one we just inserted or the existing one)
SELECT * INTO v_seller
FROM public.sellers
WHERE user_id = p_user_id;
RETURN v_seller;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;