-- Migration: 20260124_trust_badges
-- Description: Add trust_badges column to store_settings for storefront customization

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'trust_badges') THEN
        ALTER TABLE public.store_settings ADD COLUMN trust_badges JSONB DEFAULT '[
            { "icon": "return", "text": "Free Returns within 30 days" },
            { "icon": "shield", "text": "Secure SSL Payments" },
            { "icon": "truck", "text": "Free Express Shipping over ₹5,000" },
            { "icon": "check", "text": "Authenticity Guaranteed" }
        ]'::jsonb;
    END IF;
END $$;
