-- Subscription System Migration
-- 1. Update Sellers Table
ALTER TABLE IF EXISTS public.sellers
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unsubmitted',
    ADD COLUMN IF NOT EXISTS kyc_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS plan_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS commission_percent NUMERIC DEFAULT 10,
    ADD COLUMN IF NOT EXISTS telegram_message_quota_remaining INTEGER DEFAULT 200,
    ADD COLUMN IF NOT EXISTS email_quota_remaining INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS image_storage_bytes_used BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS product_count INTEGER DEFAULT 0;
-- 2. Create Support Tables
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id),
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    amount NUMERIC,
    provider_payment_id TEXT,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TABLE IF NOT EXISTS public.usage_quota_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id),
    quota_type TEXT NOT NULL,
    change_amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- 3. Atomic Quota Functions (RPC)
CREATE OR REPLACE FUNCTION increment_seller_quota(
        seller_id_param UUID,
        column_param TEXT,
        amount_param BIGINT
    ) RETURNS VOID AS $$ BEGIN EXECUTE format(
        'UPDATE sellers SET %I = %I + $1 WHERE id = $2',
        column_param,
        column_param
    ) USING amount_param,
    seller_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION decrement_seller_quota(
        seller_id_param UUID,
        column_param TEXT,
        amount_param INTEGER
    ) RETURNS VOID AS $$ BEGIN EXECUTE format(
        'UPDATE sellers SET %I = %I - $1 WHERE id = $2',
        column_param,
        column_param
    ) USING amount_param,
    seller_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Enabling RLS (Standard for Supabase)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quota_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view their own subscriptions" ON public.subscriptions FOR
SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can view their own usage events" ON public.usage_quota_events FOR
SELECT TO authenticated USING (auth.uid() = seller_id);