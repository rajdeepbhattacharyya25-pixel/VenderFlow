-- Customer Isolation Schema
-- Implements "White-label" style isolation where customers are explicitly linked to stores.

-- 1. Create store_customers table
CREATE TABLE IF NOT EXISTS public.store_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Enforce unique membership per store
    UNIQUE(seller_id, user_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_customers_seller_id ON public.store_customers(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_user_id ON public.store_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_lookup ON public.store_customers(seller_id, user_id);

-- 3. RLS Policies
ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;

-- Policy: Sellers can view their own customers
CREATE POLICY "Sellers can view their own store customers" ON public.store_customers
    FOR SELECT
    USING (seller_id = auth.uid());

-- Policy: Customers can view their own memberships
CREATE POLICY "Customers can view their own store memberships" ON public.store_customers
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Customers can join a store (insert their own record)
CREATE POLICY "Customers can join a store" ON public.store_customers
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
    
-- Policy: Sellers can manage their customers (e.g., block them)
CREATE POLICY "Sellers can update their customers" ON public.store_customers
    FOR UPDATE
    USING (seller_id = auth.uid());

-- 4. Helper Function to check store membership
CREATE OR REPLACE FUNCTION public.is_store_customer(check_seller_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.store_customers 
        WHERE seller_id = check_seller_id 
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS update_store_customers_updated_at ON public.store_customers;
CREATE TRIGGER update_store_customers_updated_at
    BEFORE UPDATE ON public.store_customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
