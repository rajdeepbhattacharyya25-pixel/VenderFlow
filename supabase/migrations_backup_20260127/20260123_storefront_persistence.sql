-- Storefront Persistence Tables
-- Adds support for persistent Addresses, Cart, and Wishlist for Store Customers

-- 1. Store Addresses
CREATE TABLE IF NOT EXISTS public.store_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.store_customers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'Home', -- Home, Work, etc
    street TEXT NOT NULL,
    building TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for address lookups
CREATE INDEX IF NOT EXISTS idx_store_addresses_customer ON public.store_addresses(customer_id);

-- RLS for Addresses
ALTER TABLE public.store_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their own addresses" ON public.store_addresses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.store_customers
            WHERE id = store_addresses.customer_id
            AND user_id = auth.uid()
        )
    );

-- 2. Store Cart Items
CREATE TABLE IF NOT EXISTS public.store_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.store_customers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    size TEXT, -- Optional redundant field for easier display if variant is deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Unique constraint to prevent duplicate rows for same product config
    UNIQUE(customer_id, product_id, variant_id, size)
);

-- Index for cart lookups
CREATE INDEX IF NOT EXISTS idx_store_cart_customer ON public.store_cart_items(customer_id);

-- RLS for Cart
ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their own cart" ON public.store_cart_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.store_customers
            WHERE id = store_cart_items.customer_id
            AND user_id = auth.uid()
        )
    );

-- 3. Store Wishlists
CREATE TABLE IF NOT EXISTS public.store_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.store_customers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate wishlist items
    UNIQUE(customer_id, product_id)
);

-- Index for wishlist lookups
CREATE INDEX IF NOT EXISTS idx_store_wishlist_customer ON public.store_wishlists(customer_id);

-- RLS for Wishlist
ALTER TABLE public.store_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their own wishlist" ON public.store_wishlists
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.store_customers
            WHERE id = store_wishlists.customer_id
            AND user_id = auth.uid()
        )
    );

-- 4. Update Profile Fields in store_customers
-- Add columns if they don't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_customers' AND column_name = 'phone') THEN
        ALTER TABLE public.store_customers ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_customers' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.store_customers ADD COLUMN avatar_url TEXT;
    END IF;
    -- display_name already exists in previous schema, but good to check or ensure
END $$;
