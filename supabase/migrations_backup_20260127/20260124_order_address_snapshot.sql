-- Migration: 20260124_order_address_snapshot
-- Description: Add delivery_address snapshot to orders and ensure status column constraints

-- 1. Add delivery_address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Ensure status column has correct check constraints
-- We drop existing check if any (to be safe) and re-apply
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- 3. Add index on status for faster filtering
-- 3. Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id_created_at ON public.orders(seller_id, created_at DESC);

-- 4. RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (customers) to create orders
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (true); -- You might want to restrict to auth.uid() == customer_id if strict

-- Allow users to view their own orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = customer_id);

-- Allow sellers to view orders for their store
DROP POLICY IF EXISTS "Sellers can view store orders" ON public.orders;
CREATE POLICY "Sellers can view store orders" ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = seller_id);

-- Allow sellers to update status of orders
DROP POLICY IF EXISTS "Sellers can update store orders" ON public.orders;
CREATE POLICY "Sellers can update store orders" ON public.orders
FOR UPDATE TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);
