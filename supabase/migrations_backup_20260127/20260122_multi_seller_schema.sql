-- Multi-Seller Schema Migration
-- Adds slug column to sellers, creates orders table, and updates RLS policies

-- 1. Add slug column to sellers table
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Update existing sellers to have a slug (if any exist without one)
UPDATE public.sellers 
SET slug = LOWER(REPLACE(store_name, ' ', '-')) 
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.sellers ALTER COLUMN slug SET NOT NULL;

-- 2. Create orders table if not exists
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    shipping_address JSONB,
    payment_method TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Orders RLS Policies
-- Drop existing policies if they exist (from conditional block in previous migration)
DROP POLICY IF EXISTS "Admin manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers view store orders" ON public.orders;

-- Customers can create orders with their own customer_id
CREATE POLICY "customer_create_own_order" ON public.orders
FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Customers can view their own orders
CREATE POLICY "customer_view_own_orders" ON public.orders
FOR SELECT
USING (customer_id = auth.uid());

-- Sellers can view orders for their store
CREATE POLICY "seller_view_store_orders" ON public.orders
FOR SELECT
USING (seller_id = auth.uid());

-- Sellers can update orders for their store (status changes)
CREATE POLICY "seller_update_store_orders" ON public.orders
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Admin can do everything with orders
CREATE POLICY "admin_manage_all_orders" ON public.orders
FOR ALL
USING (public.is_admin());

-- 5. Update products RLS to allow public read of published products for specific seller
-- Drop and recreate the public products policy to be more specific
DROP POLICY IF EXISTS "Public view published products" ON public.products;

CREATE POLICY "public_view_published_products" ON public.products
FOR SELECT
USING (is_published = true);

-- 6. Audit logs insert policy for admin
CREATE POLICY "admin_insert_audit_logs" ON public.audit_logs
FOR INSERT
WITH CHECK (public.is_admin());

-- 7. Create index on sellers.slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_sellers_slug ON public.sellers(slug);

-- 8. Create index on products.seller_id for faster seller product queries
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);

-- 9. Create index on orders for common queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 10. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger to auto-update updated_at on orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Trigger to auto-update updated_at on sellers
DROP TRIGGER IF EXISTS update_sellers_updated_at ON public.sellers;
CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON public.sellers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
