-- Add enforce_2fa column to platform_settings if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'platform_settings'
        AND column_name = 'enforce_2fa'
) THEN
ALTER TABLE platform_settings
ADD COLUMN enforce_2fa BOOLEAN DEFAULT FALSE;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'platform_settings'
        AND column_name = 'max_login_attempts'
) THEN
ALTER TABLE platform_settings
ADD COLUMN max_login_attempts INTEGER DEFAULT 5;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'platform_settings'
        AND column_name = 'session_timeout_minutes'
) THEN
ALTER TABLE platform_settings
ADD COLUMN session_timeout_minutes INTEGER DEFAULT 60;
END IF;
END $$;