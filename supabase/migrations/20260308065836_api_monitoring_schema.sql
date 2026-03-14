-- Migration for API Usage Monitoring & Emergency Alerts
-- Table to track individual API requests
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    -- e.g., 'groq', 'gemini', 'openrouter'
    endpoint TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
-- Table to manage limits and alert thresholds
CREATE TABLE IF NOT EXISTS api_limits_config (
    provider TEXT PRIMARY KEY,
    monthly_limit INTEGER NOT NULL,
    alert_threshold_pct INTEGER DEFAULT 90,
    last_alert_sent_at TIMESTAMP WITH TIME ZONE
);
-- Seed initial limits
INSERT INTO api_limits_config (provider, monthly_limit)
VALUES ('groq', 10000),
    ('gemini', 15000),
    ('openrouter', 10000) ON CONFLICT (provider) DO NOTHING;
-- RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_limits_config ENABLE ROW LEVEL SECURITY;
-- Only admins can view the logs and configure the limits. 
-- Right now, let's allow service and internal roles to bypass RLS.
CREATE POLICY "Admins can view API logs" ON api_usage_logs FOR
SELECT TO authenticated USING (
        auth.uid() IN (
            SELECT id
            FROM profiles
            WHERE role = 'admin'
        )
    );
CREATE POLICY "Admins can manage API limits" ON api_limits_config FOR ALL TO authenticated USING (
    auth.uid() IN (
        SELECT id
        FROM profiles
        WHERE role = 'admin'
    )
);