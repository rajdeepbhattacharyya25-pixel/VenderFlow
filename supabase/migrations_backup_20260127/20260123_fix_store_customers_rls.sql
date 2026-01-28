-- Fix Store Customer Update Policy
-- Allows authenticated users to update their own store_customer record (e.g. for profile changes)

DROP POLICY IF EXISTS "Customers can update their own profile" ON public.store_customers;

CREATE POLICY "Customers can update their own profile" ON public.store_customers
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Ensure insert policy is robust
DROP POLICY IF EXISTS "Customers can join a store" ON public.store_customers;

CREATE POLICY "Customers can join a store" ON public.store_customers
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
