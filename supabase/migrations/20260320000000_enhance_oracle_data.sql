-- Enhance Oracle Data Source of Truth
-- 1. Add missing columns to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS reserve_rate numeric DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS payout_delay_days integer DEFAULT 7;

-- 2. Add missing columns to sellers for Oracle accuracy
-- Note: available_balance should normally be derived, but for high-speed AI analysis, we keep it as a field.
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS available_balance numeric DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS risk_score numeric DEFAULT 10.0;

-- 3. Create a view for consolidated platform configuration
CREATE OR REPLACE VIEW oracle_platform_context AS
SELECT 
    ps.reserve_rate,
    ps.commission_rate,
    ps.min_payout_amount,
    ps.payout_delay_days,
    (SELECT COUNT(*) FROM sellers WHERE status = 'active') as active_sellers,
    (SELECT COALESCE(SUM(available_balance), 0) FROM sellers) as total_available_liquidity
FROM platform_settings ps
LIMIT 1;

-- 4. Enhance the payout gaps view with descriptive risk reasons
CREATE OR REPLACE VIEW oracle_payout_gaps AS
SELECT 
    s.id as seller_id,
    s.store_name,
    s.available_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE seller_id = s.id AND status = 'pending') as pending_payouts,
    CASE 
        WHEN s.risk_score > 80 THEN 'Critical: High dispute volume'
        WHEN s.risk_score > 50 THEN 'Warning: Recent store changes'
        ELSE 'Normal: Standard holding period'
    END as risk_reason,
    s.risk_score
FROM sellers s;

-- 5. Grant permissions
GRANT SELECT ON oracle_platform_context TO service_role;
GRANT SELECT ON oracle_payout_gaps TO service_role;
GRANT SELECT ON oracle_platform_context TO authenticated;
GRANT SELECT ON oracle_payout_gaps TO authenticated;
