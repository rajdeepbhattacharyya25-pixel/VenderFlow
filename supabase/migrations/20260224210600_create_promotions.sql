-- Create promotions table
CREATE TABLE public.promotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value NUMERIC NOT NULL CHECK (value > 0),
    min_order_amount NUMERIC,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0 NOT NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Ensure sellers can't create duplicate active codes
    UNIQUE(seller_id, code)
);
-- Index for fast lookup by code during checkout
CREATE INDEX idx_promotions_code ON public.promotions(seller_id, code);
-- Create promotion usages table to prevent multi-use by same customer
CREATE TABLE public.promotion_usages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    -- Will reference orders table once created or if exists
    customer_email TEXT NOT NULL,
    used_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Ensure a customer can only use a specific promotion once
    UNIQUE(promotion_id, customer_email)
);
-- Index for usage lookup
CREATE INDEX idx_promotion_usages_customer ON public.promotion_usages(promotion_id, customer_email);
-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_usages ENABLE ROW LEVEL SECURITY;
-- RLS Policies for promotions
-- Sellers can manage their own promotions
CREATE POLICY "Sellers can manage their own promotions" ON public.promotions FOR ALL USING (auth.uid() = seller_id);
-- Anyone (public) can read active promotions if they know the code (checked via RPC usually, but basic read is fine if filtered by seller)
CREATE POLICY "Public can view active promotions" ON public.promotions FOR
SELECT USING (
        is_active = true
        AND (
            expires_at IS NULL
            OR expires_at > now()
        )
    );
-- RLS Policies for promotion usages
-- Sellers can view usages of their promotions
CREATE POLICY "Sellers can view their promotion usages" ON public.promotion_usages FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.promotions p
            WHERE p.id = promotion_id
                AND p.seller_id = auth.uid()
        )
    );
-- Insert into usages is typically done via a secure RPC or server-side function during checkout processing
-- For now, allow authenticated and anon to insert (assuming checkout can be anon) if they have a valid promo, though we typically protect this via a secure function.
CREATE POLICY "Anyone can insert usages" ON public.promotion_usages FOR
INSERT WITH CHECK (true);
-- Security relies on RPC/Edge function logic ensuring validity before insert
-- Add promotion tracking to orders if the table exists (Optional, might be added dynamically based on actual order logic)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'orders'
) THEN
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE
SET NULL,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
END IF;
END $$;