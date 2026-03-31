-- Task 4: Hardening promotion_usages security
-- Adding user_id and seller_id for strict RLS enforcement

BEGIN;

-- 1. Add missing columns to promotion_usages
ALTER TABLE public.promotion_usages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id);

-- 2. Index the new columns for join/delete performance
CREATE INDEX IF NOT EXISTS promotion_usages_user_id_idx ON public.promotion_usages (user_id);
CREATE INDEX IF NOT EXISTS promotion_usages_seller_id_idx ON public.promotion_usages (seller_id);

-- 3. Update RLS Policies
ALTER TABLE public.promotion_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert usages" ON public.promotion_usages;
DROP POLICY IF EXISTS "Sellers can view their promotion usages" ON public.promotion_usages;

-- Strict INSERT: User can only insert their own usage, and promotion must exist
CREATE POLICY "Users can insert own promotion usages" ON public.promotion_usages
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = user_id
        AND EXISTS (
            SELECT 1 FROM public.promotions p
            WHERE p.id = promotion_id
        )
    );

-- Comprehensive SELECT: Customers see their own, Sellers see their own, Admins see all
CREATE POLICY "Users view relevant promotion usages" ON public.promotion_usages
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR 
        (SELECT auth.uid()) = seller_id OR
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

COMMIT;
