-- Migration: Enable Telegram Notifications via pg_net
-- DEPENDS ON: pg_net extension

-- 1. Enable Extension
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Update create_notification to send Telegram messages
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_config public.seller_telegram_configs%ROWTYPE;
    v_should_send BOOLEAN := false;
    v_telegram_body JSONB;
BEGIN
    -- A. Insert into internal notifications table (existing logic)
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (p_user_id, p_type, p_title, p_message, p_link)
    RETURNING id INTO v_id;

    -- B. TELEGRAM INTEGRATION
    -- 1. Fetch Config
    SELECT * INTO v_config
    FROM public.seller_telegram_configs
    WHERE seller_id = p_user_id AND is_active = true AND chat_id IS NOT NULL;

    -- 2. Check Logic
    IF FOUND THEN
        -- Map types to preferences
        -- Types: 'order', 'warning' (stock), 'customer', 'support'
        CASE p_type
            WHEN 'order' THEN
                v_should_send := (v_config.preferences->>'orders')::boolean;
            WHEN 'warning' THEN
                v_should_send := (v_config.preferences->>'stock')::boolean;
            WHEN 'customer' THEN
                v_should_send := (v_config.preferences->>'customers')::boolean;
            WHEN 'support' THEN
                 -- Default to true for support or check key
                 v_should_send := COALESCE((v_config.preferences->>'support')::boolean, true);
            ELSE
                v_should_send := true; -- Default for unknown critical alerts
        END CASE;

        -- 3. Send Request
        IF v_should_send THEN
            -- Format Message (Markdown)
            -- Escape basic Markdown chars if needed, or use HTML style. Telegram MarkdownV2 is strict.
            -- Simple Markdown is safer: *bold*, _italic_, [text](url)
            
            v_telegram_body := jsonb_build_object(
                'chat_id', v_config.chat_id,
                'text', '*' || p_title || '*' || E'\n\n' || p_message || E'\n\n[Open Dashboard](' || COALESCE(current_setting('app.settings.site_url', true), 'https://e-commerce-landing-page-eight-self.vercel.app') || p_link || ')',
                'parse_mode', 'Markdown'
            );

            -- Fire and Forget (Async) via pg_net
            PERFORM net.http_post(
                url := 'https://api.telegram.org/bot' || v_config.bot_token || '/sendMessage',
                headers := '{"Content-Type": "application/json"}'::jsonb,
                body := v_telegram_body
            );
        END IF;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
