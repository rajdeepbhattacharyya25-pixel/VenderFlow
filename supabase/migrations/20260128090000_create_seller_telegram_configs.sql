-- Migration: Create Seller Telegram Configs Table
-- Enables "Bring Your Own Bot" feature for sellers

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.seller_telegram_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    bot_token TEXT COLLATE "C" NOT NULL, -- Sensitive, stored as plain text for now as per plan (upgrade to vault later)
    bot_username TEXT,
    bot_id BIGINT,
    chat_id BIGINT,
    webhook_secret UUID DEFAULT gen_random_uuid() NOT NULL,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{"orders": true, "stock": true, "customers": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.seller_telegram_configs ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Select: Sellers can see their own config
CREATE POLICY "Sellers can view own telegram config"
    ON public.seller_telegram_configs
    FOR SELECT
    USING (auth.uid() = seller_id);

-- Insert: Sellers can create their own config
CREATE POLICY "Sellers can create own telegram config"
    ON public.seller_telegram_configs
    FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

-- Update: Sellers can update their own config
CREATE POLICY "Sellers can update own telegram config"
    ON public.seller_telegram_configs
    FOR UPDATE
    USING (auth.uid() = seller_id);

-- Delete: Sellers can delete their own config
CREATE POLICY "Sellers can delete own telegram config"
    ON public.seller_telegram_configs
    FOR DELETE
    USING (auth.uid() = seller_id);

-- 4. Indexes
CREATE INDEX idx_seller_webhook_secret ON public.seller_telegram_configs(webhook_secret);
CREATE INDEX idx_seller_telegram_bot_id ON public.seller_telegram_configs(bot_id);
