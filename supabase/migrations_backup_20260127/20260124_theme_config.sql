-- Migration: 20260124_theme_config
-- Description: Add theme_config column to store_settings for storefront customization

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'theme_config') THEN
        ALTER TABLE public.store_settings ADD COLUMN theme_config JSONB DEFAULT '{
            "colors": { "primary": "#4F46E5", "secondary": "#10B981", "background": "#FFFFFF", "text": "#111827" },
            "fonts": { "heading": "Inter", "body": "Inter" },
            "borderRadius": "0.75rem",
            "layout": { "show_reviews": true, "show_featured": true, "show_hero": true },
            "hero": { 
                "title": "", 
                "subtitle": "", 
                "image": "", 
                "overlayOpacity": 0.5 
            }
        }'::jsonb;
    END IF;
END $$;
